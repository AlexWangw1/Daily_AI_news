import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { load } from 'cheerio';

import '../src/lib/env/load-env.mjs';
import { buildEasyReadArticle } from '../src/lib/news-fetch/easy-read.mjs';
import { fetchTextWithFallback } from '../src/lib/news-fetch/network.mjs';
import {
  buildArticleId,
  normalizeSummary,
  normalizeTitle,
  normalizeUrlForOutput,
} from '../src/lib/news-fetch/normalize.mjs';
import { PAPER_SOURCES } from '../src/lib/paper-fetch/sources.mjs';
import {
  closeNewsDatabase,
  findExistingArticle,
  loadExistingArticles,
  newsDatabaseExists,
  openNewsDatabase,
  setMetadata,
  upsertArticles,
  upsertSources,
} from '../src/lib/news-db/database.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const outputPath = resolve(projectRoot, 'data', 'ai-papers.json');

const MAX_PAPERS = 80;
const MAX_PAPERS_PER_SOURCE = 12;
const FETCH_CONCURRENCY = 5;
const TRANSLATE_CONCURRENCY = 6;
const TRANSLATE_SEPARATOR = '[[ITEM]]';
const PLAUSIBILITY_TRANSLATE_ENDPOINT = 'https://translate.plausibility.cloud/api/v1/en/zh/';
const MYMEMORY_TRANSLATE_ENDPOINT = 'https://api.mymemory.translated.net/get';
const TRANSLATE_BATCH_CHAR_LIMIT = 700;
const TRANSLATE_BATCH_ITEM_LIMIT = 2;
const shouldSkipTranslation = process.argv.includes('--skip-translate');

const stats = {
  reusedTranslationCount: 0,
  translatedPaperCount: 0,
  translationFallbackCount: 0,
};

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function fetchPaperFeed(source) {
  try {
    const xml = await fetchTextWithFallback(source.feedUrl, {
      accept: 'application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
      timeoutMs: 30000,
    });

    return {
      source,
      papers: parseArxivFeed(xml, source),
      error: null,
    };
  } catch (error) {
    return {
      source,
      papers: [],
      error,
    };
  }
}

function parseArxivFeed(xml, source) {
  const $ = load(xml, { xmlMode: true });
  const entries = [];

  $('feed > entry').each((_, entry) => {
    const paper = normalizePaperEntry($, entry, source);
    if (paper) {
      entries.push(paper);
    }
  });

  return entries;
}

function normalizePaperEntry($, entry, source) {
  const title = normalizeTitle($(entry).find('title').first().text());
  const summary = normalizeInlineText($(entry).find('summary').first().text(), 1600);
  const publishedAt = String(
    $(entry).find('published').first().text()
    || $(entry).find('updated').first().text()
    || '',
  ).trim();
  const entryId = normalizeUrlForOutput($(entry).find('id').first().text()) ?? '';
  const absUrl = entryId.replace('http://', 'https://');
  const authors = dedupeStrings(
    $(entry)
      .find('author > name')
      .map((_, node) => normalizeInlineText($(node).text(), 120))
      .get()
      .filter(Boolean),
  );
  const categories = dedupeStrings(
    $(entry)
      .find('category')
      .map((_, node) => String($(node).attr('term') ?? '').trim())
      .get()
      .filter(Boolean),
  );

  if (!title || !absUrl) {
    return null;
  }

  const id = buildArticleId({
    sourceId: source.id,
    canonicalUrl: absUrl,
    title,
    publishedAt,
  });

  const primaryCategory = categories[0] || source.category;
  const contentText = buildEnglishPaperBody({ title, summary, authors, categories, absUrl });
  const rawHtml = $.html(entry);

  return {
    id,
    contentType: 'papers',
    title,
    summary,
    url: absUrl,
    sourceId: source.id,
    sourceName: source.name,
    publishedAt,
    imageUrl: '',
    categories: dedupeStrings([
      primaryCategory,
      ...categories,
      'ai-paper',
    ].filter(Boolean)),
    authors,
    contentText,
    rawHtml,
  };
}

function buildEnglishPaperBody({ title, summary, authors, categories, absUrl }) {
  const paragraphs = [
    `Paper title: ${title}`,
    authors.length > 0 ? `Authors: ${authors.join(', ')}` : '',
    categories.length > 0 ? `Categories: ${categories.join(', ')}` : '',
    summary ? `Abstract: ${summary}` : '',
    absUrl ? `Abstract page: ${absUrl}` : '',
  ];

  return paragraphs.filter(Boolean).join('\n\n');
}

function normalizeInlineText(value, maxLength = 360) {
  const text = String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildChinesePaperBody(article, titleZh, summaryZh) {
  const paragraphs = [
    titleZh ? `论文标题：${titleZh}` : '',
    article.authors?.length ? `作者：${article.authors.join('、')}` : '',
    article.categories?.length ? `分类：${article.categories.join(' / ')}` : '',
    summaryZh ? `中文摘要：${summaryZh}` : '',
    article.url ? `论文地址：${article.url}` : '',
  ];

  return paragraphs.filter(Boolean).join('\n\n');
}

function dedupeAndSortPapers(papers) {
  const seen = new Set();
  const ordered = [];

  for (const paper of papers) {
    const dedupeKey = paper.url || paper.id;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    ordered.push(paper);
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

function limitPapersPerSource(results) {
  return results.flatMap((result) => {
    const ranked = dedupeAndSortPapers(result.papers);
    return ranked.slice(0, MAX_PAPERS_PER_SOURCE);
  });
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
  const value = String(text ?? '').trim();
  if (!value) {
    return '';
  }

  try {
    return await translateTextWithMyMemory(value);
  } catch {
    try {
      return await translateTextWithPlausibility(value, attempt);
    } catch (fallbackError) {
      if (attempt < 2) {
        await sleep(1200 * (attempt + 1));
        return translateTextToChinese(value, attempt + 1);
      }

      throw fallbackError;
    }
  }
}

async function translateTextWithMyMemory(text) {
  const url = `${MYMEMORY_TRANSLATE_ENDPOINT}?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Mozilla/5.0 (compatible; DailyAIPapersBot/1.0)',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`MyMemory HTTP ${response.status}`);
  }

  const payload = await response.json();
  const translatedText = payload?.responseData?.translatedText;

  if (typeof translatedText !== 'string' || !translatedText.trim()) {
    throw new Error('MyMemory empty translation');
  }

  return translatedText.trim();
}

async function translateTextWithPlausibility(text, attempt = 0) {
  try {
    const response = await fetch(`${PLAUSIBILITY_TRANSLATE_ENDPOINT}${encodeURIComponent(text)}`, {
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; DailyAIPapersBot/1.0)',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < 2) {
        await sleep(1000 * (attempt + 1));
        return translateTextWithPlausibility(text, attempt + 1);
      }

      throw new Error(`Translation HTTP ${response.status}`);
    }

    const payload = await response.json();
    return typeof payload?.translation === 'string'
      ? payload.translation.trim()
      : '';
  } catch (error) {
    if (attempt < 3) {
      await sleep(1200 * (attempt + 1));
      return translateTextWithPlausibility(text, attempt + 1);
    }

    throw error;
  }
}

function splitTranslatedSegments(value) {
  return String(value ?? '')
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
        const translated = await translateTextToChinese(batch.join(` ${TRANSLATE_SEPARATOR} `));
        const parts = splitTranslatedSegments(translated);

        if (parts.length !== batch.length) {
          throw new Error(`Unexpected segment count ${parts.length}`);
        }

        return parts;
      } catch (error) {
        const fallback = [];

        for (const segment of batch) {
          try {
            fallback.push(await translateTextToChinese(segment));
          } catch (segmentError) {
            stats.translationFallbackCount += 1;
            console.warn(`[papers-fetch] translation fallback used: ${segmentError.message}`);
            fallback.push(segment);
          }
        }

        return fallback;
      }
    },
  );

  return translatedBatches.flat();
}

function looksLikeChineseText(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return false;
  }

  const matches = text.match(/[\u3400-\u9fff]/gu) ?? [];
  return matches.length >= Math.max(4, Math.ceil(text.length * 0.12));
}

async function translatePaper(article, cachedArticle) {
  if (shouldSkipTranslation) {
    return {
      titleZh: looksLikeChineseText(cachedArticle?.titleZh) ? cachedArticle.titleZh : article.title,
      summaryZh: looksLikeChineseText(cachedArticle?.summaryZh) ? cachedArticle.summaryZh : article.summary,
    };
  }

  if (
    cachedArticle
    && cachedArticle.title === article.title
    && cachedArticle.summary === article.summary
    && looksLikeChineseText(cachedArticle.titleZh)
    && looksLikeChineseText(cachedArticle.summaryZh)
  ) {
    stats.reusedTranslationCount += 1;
    return {
      titleZh: cachedArticle.titleZh,
      summaryZh: cachedArticle.summaryZh,
    };
  }

  const [titleZh = article.title, summaryZh = article.summary] = await translateSegments([
    article.title,
    article.summary || article.contentText || article.title,
  ]);
  stats.translatedPaperCount += 1;

  return { titleZh, summaryZh };
}

async function hydratePaper(article, existingArticles) {
  const fetchedAt = new Date().toISOString();
  const cachedArticle = findExistingArticle(article, existingArticles);
  const translations = await translatePaper(article, cachedArticle);
  const contentTextZh = buildChinesePaperBody(article, translations.titleZh, translations.summaryZh);
  const easyRead = buildEasyReadArticle({
    ...article,
    titleZh: translations.titleZh,
    summaryZh: translations.summaryZh,
    contentTextZh,
  });

  return {
    ...article,
    titleZh: translations.titleZh,
    summaryZh: translations.summaryZh,
    contentTextZh,
    easyRead,
    fetchedAt,
    updatedAt: fetchedAt,
  };
}

function buildPreview(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  return text.length > 280 ? `${text.slice(0, 277).trimEnd()}...` : text;
}

function buildSummaryPayload(articles, generatedAt) {
  const ordered = dedupeAndSortPapers(articles).slice(0, MAX_PAPERS);

  return {
    generatedAt,
    total: ordered.length,
    previewArticleId: ordered[0]?.id ?? null,
    fullAccess: false,
    sources: PAPER_SOURCES.map(({ id, name, siteUrl }) => ({
      id,
      name,
      siteUrl,
    })),
    articles: ordered.map((article) => ({
      id: article.id,
      contentType: 'papers',
      title: article.title,
      titleZh: article.titleZh,
      summary: article.summary,
      summaryZh: article.summaryZh,
      url: article.url,
      sourceId: article.sourceId,
      sourceName: article.sourceName,
      publishedAt: article.publishedAt,
      imageUrl: article.imageUrl || '',
      categories: article.categories || [],
      previewText: buildPreview(article.contentText || article.summary),
      previewTextZh: buildPreview(article.contentTextZh || article.summaryZh || article.summary),
      easyRead: article.easyRead,
      storedLocally: Boolean(article.rawHtml),
      contentText: article.contentText,
      contentTextZh: article.contentTextZh,
      rawHtml: article.rawHtml,
      fetchedAt: article.fetchedAt,
      updatedAt: article.updatedAt,
      isViewed: false,
      viewedAt: null,
      isLocked: false,
    })),
  };
}

function dedupeStrings(items) {
  const seen = new Set();
  const unique = [];

  for (const item of items) {
    const value = String(item ?? '').trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(value);
  }

  return unique;
}

async function main() {
  const results = await Promise.all(PAPER_SOURCES.map(fetchPaperFeed));
  const papers = dedupeAndSortPapers(limitPapersPerSource(results)).slice(0, MAX_PAPERS);
  const db = newsDatabaseExists() ? await openNewsDatabase() : null;

  try {
    let existingArticles = {
      byId: new Map(),
      byUrl: new Map(),
    };

    if (db) {
      await upsertSources(db, PAPER_SOURCES.map(({ id, name, siteUrl }) => ({
        id,
        contentType: 'papers',
        name,
        siteUrl,
      })));

      existingArticles = await loadExistingArticles(db, { contentType: 'papers' });
    }

    const hydratedPapers = await mapWithConcurrency(
      papers,
      FETCH_CONCURRENCY,
      (paper) => hydratePaper(paper, existingArticles),
    );

    const generatedAt = new Date().toISOString();
    let payload;

    if (db) {
      await upsertArticles(db, hydratedPapers);
      await setMetadata(db, 'papersGeneratedAt', generatedAt);
    }

    payload = buildSummaryPayload(hydratedPapers, generatedAt);

    mkdirSync(resolve(projectRoot, 'data'), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    for (const result of results) {
      if (result.error) {
        console.warn(`[papers-fetch] ${result.source.id} failed: ${result.error.message}`);
      }
    }

    if (shouldSkipTranslation) {
      console.log('[papers-fetch] skipped Chinese translation for faster fetch');
    } else {
      console.log(
        `[papers-fetch] reused ${stats.reusedTranslationCount} cached translations, translated ${stats.translatedPaperCount} new papers${stats.translationFallbackCount ? `, ${stats.translationFallbackCount} segment fallbacks` : ''}`,
      );
    }

    console.log(`[papers-fetch] wrote ${payload.total} archived papers to ${outputPath}`);
  } finally {
    if (db) {
      await closeNewsDatabase(db, { shutdown: true });
    }
  }
}

main().catch((error) => {
  console.error('[papers-fetch] fatal error:', error);
  process.exitCode = 1;
});
