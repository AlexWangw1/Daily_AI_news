import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Parser from 'rss-parser';

import { fetchArchivedArticle } from '../src/lib/news-fetch/article-content.mjs';
import {
  buildArticleId,
  collectCategories,
  deriveCanonicalUrl,
  deriveImageUrl,
  derivePublishedAt,
  normalizeSummary,
  normalizeTitle,
  normalizeUrlForOutput,
} from '../src/lib/news-fetch/normalize.mjs';
import { NEWS_SOURCES } from '../src/lib/news-fetch/sources.mjs';
import {
  closeNewsDatabase,
  findExistingArticle,
  getNewsSummaryPayload,
  loadExistingArticles,
  openNewsDatabase,
  setMetadata,
  upsertArticles,
  upsertSources,
} from '../src/lib/news-db/database.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const outputPath = resolve(projectRoot, 'data', 'ai-news.json');

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['itunes:image', 'itunesImage'],
    ],
  },
});

const MAX_ARTICLES = 60;
const MAX_ARTICLES_PER_SOURCE = 12;
const ARCHIVE_CONCURRENCY = 4;
const TRANSLATE_CONCURRENCY = 2;
const TRANSLATE_SEPARATOR = '[[ITEM]]';
const TRANSLATE_ENDPOINT = 'https://translate.plausibility.cloud/api/v1/en/zh/';
const TRANSLATE_BATCH_CHAR_LIMIT = 900;
const TRANSLATE_BATCH_ITEM_LIMIT = 3;
const FAILED_ARCHIVE_RETRY_MS = 6 * 60 * 60 * 1000;
const shouldSkipTranslation = process.argv.includes('--skip-translate');

const stats = {
  reusedArchiveCount: 0,
  reusedTranslationCount: 0,
  translatedArticleCount: 0,
  translationFallbackCount: 0,
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchFeedXml(feedUrl) {
  const response = await fetch(feedUrl, {
    headers: {
      accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
      'user-agent': 'DailyAINewsBot/1.0 (+https://github.com/openai/codex)',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchSource(source) {
  try {
    const xml = await fetchFeedXml(source.feedUrl);
    const feed = await parser.parseString(xml);

    const articles = (feed.items ?? [])
      .map((item) => normalizeItem(item, source))
      .filter(Boolean);

    return {
      source,
      articles,
      error: null,
    };
  } catch (error) {
    return {
      source,
      articles: [],
      error,
    };
  }
}

function normalizeItem(item, source) {
  const canonicalUrl = deriveCanonicalUrl(item, source);
  const title = normalizeTitle(item.title);

  if (!title) {
    return null;
  }

  const publishedAt = derivePublishedAt(item);
  const summary = normalizeSummary(item);
  const imageUrl = deriveImageUrl(item);
  const categories = collectCategories(item);

  const id = buildArticleId({
    sourceId: source.id,
    canonicalUrl,
    title,
    publishedAt,
  });

  return {
    id,
    title,
    summary,
    url: normalizeUrlForOutput(canonicalUrl) ?? '',
    sourceId: source.id,
    sourceName: source.name,
    publishedAt,
    imageUrl,
    categories,
  };
}

function dedupeAndSortArticles(articles) {
  const seen = new Set();
  const ordered = [];

  for (const article of articles) {
    const dedupeKey = article.url || article.id;

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    ordered.push(article);
  }

  ordered.sort((left, right) => {
    const leftTime = Date.parse(left.publishedAt) || 0;
    const rightTime = Date.parse(right.publishedAt) || 0;

    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.title.localeCompare(right.title);
  });

  return ordered;
}

function limitArticlesPerSource(results) {
  return results.flatMap((result) => {
    const ranked = dedupeAndSortArticles(result.articles);
    return ranked.slice(0, MAX_ARTICLES_PER_SOURCE);
  });
}

function chunkArray(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

async function mapWithConcurrency(items, concurrency, iteratee) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await iteratee(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function splitParagraphs(value) {
  return String(value ?? '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildTextBatches(segments) {
  const filtered = segments
    .map((segment) => String(segment ?? '').trim())
    .filter(Boolean);

  const batches = [];
  let currentBatch = [];
  let currentLength = 0;

  for (const segment of filtered) {
    const nextLength = currentLength + segment.length + TRANSLATE_SEPARATOR.length + 2;

    if (
      currentBatch.length >= TRANSLATE_BATCH_ITEM_LIMIT
      || (currentBatch.length > 0 && nextLength > TRANSLATE_BATCH_CHAR_LIMIT)
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentLength = 0;
    }

    currentBatch.push(segment);
    currentLength += segment.length;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

async function translateTextToChinese(text, attempt = 0) {
  const value = text.trim();
  if (!value) {
    return '';
  }

  const response = await fetch(`${TRANSLATE_ENDPOINT}${encodeURIComponent(value)}`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Mozilla/5.0 (compatible; DailyAINewsBot/1.0)',
    },
  });

  if (!response.ok) {
    if (response.status === 429 && attempt < 3) {
      await sleep(1200 * (attempt + 1));
      return translateTextToChinese(text, attempt + 1);
    }

    throw new Error(`Translation HTTP ${response.status}`);
  }

  const payload = await response.json();
  return typeof payload?.translation === 'string'
    ? payload.translation.trim()
    : '';
}

function splitTranslatedSegments(value) {
  return value
    .split(/\s*\[\[ITEM\]\]\s*/u)
    .map((segment) => segment.trim());
}

async function translateSegments(segments) {
  const sourceSegments = segments
    .map((segment) => String(segment ?? '').trim())
    .filter(Boolean);

  if (sourceSegments.length === 0) {
    return [];
  }

  const batches = buildTextBatches(sourceSegments);
  const translatedBatches = await mapWithConcurrency(
    batches,
    TRANSLATE_CONCURRENCY,
    async (batch) => {
      try {
        const translated = await translateTextToChinese(
          batch.join(` ${TRANSLATE_SEPARATOR} `),
        );
        const parts = splitTranslatedSegments(translated);

        if (parts.length !== batch.length) {
          throw new Error(`unexpected segment count ${parts.length}`);
        }

        return parts;
      } catch (error) {
        const fallback = [];

        for (const segment of batch) {
          try {
            fallback.push(await translateTextToChinese(segment));
          } catch (segmentError) {
            stats.translationFallbackCount += 1;
            console.warn(`[news-fetch] translation fallback used: ${segmentError.message}`);
            fallback.push(segment);
          }
        }

        return fallback;
      }
    },
  );

  return translatedBatches.flat();
}

function buildFallbackContent(article, archive) {
  return archive.contentText || article.summary || article.title;
}

function mergeWithCachedArticle(article, cached, fetchedAt) {
  stats.reusedArchiveCount += 1;
  stats.reusedTranslationCount += 1;

  return {
    ...article,
    titleZh: cached.titleZh || article.title,
    summaryZh: cached.summaryZh || article.summary,
    contentText: cached.contentText || article.summary || article.title,
    contentTextZh: cached.contentTextZh || cached.contentText || article.summary || article.title,
    rawHtml: cached.rawHtml || '',
    imageUrl: article.imageUrl || cached.imageUrl || '',
    fetchedAt,
    updatedAt: fetchedAt,
  };
}

function canReuseCachedArchive(article, cachedArticle) {
  return Boolean(
    cachedArticle?.storedLocally
    && cachedArticle.rawHtml
    && cachedArticle.url === article.url
    && cachedArticle.title === article.title
    && cachedArticle.publishedAt === article.publishedAt
  );
}

function canReuseRecentFallback(article, cachedArticle) {
  if (
    !cachedArticle
    || cachedArticle.storedLocally
    || cachedArticle.title !== article.title
    || cachedArticle.publishedAt !== article.publishedAt
    || !cachedArticle.fetchedAt
  ) {
    return false;
  }

  const fetchedAt = Date.parse(cachedArticle.fetchedAt);
  if (Number.isNaN(fetchedAt)) {
    return false;
  }

  return Date.now() - fetchedAt < FAILED_ARCHIVE_RETRY_MS;
}

function mergeWithRecentFallback(article, cached, fetchedAt) {
  stats.reusedTranslationCount += 1;

  return {
    ...article,
    titleZh: cached.titleZh || article.title,
    summaryZh: cached.summaryZh || article.summary,
    contentText: cached.contentText || article.summary || article.title,
    contentTextZh: cached.contentTextZh || cached.contentText || article.summary || article.title,
    rawHtml: '',
    imageUrl: article.imageUrl || cached.imageUrl || '',
    fetchedAt: cached.fetchedAt || fetchedAt,
    updatedAt: fetchedAt,
  };
}

async function translateArticle(article, archive, cachedArticle) {
  if (shouldSkipTranslation) {
    return {
      titleZh: article.title,
      summaryZh: article.summary,
      contentTextZh: buildFallbackContent(article, archive),
    };
  }

  if (
    cachedArticle
    && cachedArticle.title === article.title
    && cachedArticle.summary === article.summary
    && cachedArticle.contentText === archive.contentText
    && cachedArticle.titleZh
    && cachedArticle.contentTextZh
  ) {
    stats.reusedTranslationCount += 1;
    return {
      titleZh: cachedArticle.titleZh,
      summaryZh: cachedArticle.summaryZh || article.summary,
      contentTextZh: cachedArticle.contentTextZh,
    };
  }

  const contentParagraphs = splitParagraphs(archive.contentText);
  const [titleZh = article.title, summaryZh = article.summary] = await translateSegments([
    article.title,
    article.summary || contentParagraphs[0] || article.title,
  ]);
  const translatedParagraphs = await translateSegments(contentParagraphs);

  stats.translatedArticleCount += 1;

  return {
    titleZh,
    summaryZh,
    contentTextZh: translatedParagraphs.join('\n\n').trim(),
  };
}

async function hydrateArticle(article, existingArticles) {
  const fetchedAt = new Date().toISOString();
  const cachedArticle = findExistingArticle(article, existingArticles);

  if (canReuseCachedArchive(article, cachedArticle)) {
    return mergeWithCachedArticle(article, cachedArticle, fetchedAt);
  }

  if (canReuseRecentFallback(article, cachedArticle)) {
    return mergeWithRecentFallback(article, cachedArticle, fetchedAt);
  }

  let archive = {
    rawHtml: '',
    contentText: article.summary || article.title,
    imageUrl: article.imageUrl,
  };

  if (article.url) {
    try {
      archive = await fetchArchivedArticle(article);
    } catch (error) {
      console.warn(`[news-fetch] archive fetch failed for ${article.id}: ${error.message}`);
    }
  }

  const translations = await translateArticle(
    article,
    archive,
    cachedArticle,
  );

  return {
    ...article,
    titleZh: translations.titleZh || article.title,
    summaryZh: translations.summaryZh || article.summary,
    contentText: buildFallbackContent(article, archive),
    contentTextZh: translations.contentTextZh || buildFallbackContent(article, archive),
    rawHtml: archive.rawHtml,
    imageUrl: article.imageUrl || archive.imageUrl || '',
    fetchedAt,
    updatedAt: fetchedAt,
  };
}

async function main() {
  const results = await Promise.all(NEWS_SOURCES.map(fetchSource));
  const articles = dedupeAndSortArticles(limitArticlesPerSource(results)).slice(
    0,
    MAX_ARTICLES,
  );

  const db = openNewsDatabase();

  try {
    upsertSources(db, NEWS_SOURCES.map(({ id, name, siteUrl }) => ({
      id,
      name,
      siteUrl,
    })));

    const existingArticles = loadExistingArticles(db);
    const hydratedArticles = await mapWithConcurrency(
      articles,
      ARCHIVE_CONCURRENCY,
      (article) => hydrateArticle(article, existingArticles),
    );

    upsertArticles(db, hydratedArticles);

    const generatedAt = new Date().toISOString();
    setMetadata(db, 'generatedAt', generatedAt);

    const payload = getNewsSummaryPayload(db, MAX_ARTICLES);

    mkdirSync(resolve(projectRoot, 'data'), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    for (const result of results) {
      if (result.error) {
        console.warn(
          `[news-fetch] ${result.source.id} failed: ${result.error.message}`,
        );
      }
    }

    if (shouldSkipTranslation) {
      console.log('[news-fetch] skipped Chinese translation for faster fetch');
    } else {
      console.log(
        `[news-fetch] reused ${stats.reusedArchiveCount} cached articles, reused ${stats.reusedTranslationCount} cached translations, translated ${stats.translatedArticleCount} new articles${stats.translationFallbackCount ? `, ${stats.translationFallbackCount} segment fallbacks` : ''}`,
      );
    }

    console.log(
      `[news-fetch] wrote ${payload.total} archived articles to ${outputPath}`,
    );
  } finally {
    closeNewsDatabase(db);
  }
}

main().catch((error) => {
  console.error('[news-fetch] fatal error:', error);
  process.exitCode = 1;
});
