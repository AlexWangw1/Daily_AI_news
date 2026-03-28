import * as cheerio from 'cheerio';
import { fetchTextWithFallback } from './network.mjs';

const ARTICLE_SELECTORS = [
  'article',
  'main article',
  '[itemprop="articleBody"]',
  '.article-content',
  '.article__content',
  '.article-body',
  '.entry-content',
  '.post-content',
  '.story-body',
  '.content-body',
  'main',
];

const BLOCK_SELECTORS = 'p, h2, h3, li';

const BLOCKLIST_SELECTORS = [
  'script',
  'style',
  'noscript',
  'svg',
  'iframe',
  'form',
  'nav',
  'footer',
  'aside',
  'button',
  'input',
  '.related',
  '.newsletter',
  '.share',
  '.advertisement',
  '.ads',
  '.social',
  '.subscribe',
];

export async function fetchArchivedArticle(article) {
  if (!article.url) {
    return buildArticleArchive({
      contentText: article.summary || article.title,
      imageUrl: article.imageUrl,
      rawHtml: '',
    });
  }

  const rawHtml = await fetchTextWithFallback(article.url, {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    timeoutMs: 20000,
  });
  const extracted = extractArticleContent(rawHtml, article.url);

  return buildArticleArchive({
    rawHtml,
    contentText: extracted.contentText || article.summary || article.title,
    imageUrl: article.imageUrl || extracted.imageUrl,
  });
}

function extractArticleContent(rawHtml, articleUrl) {
  const $ = cheerio.load(rawHtml);
  BLOCKLIST_SELECTORS.forEach((selector) => {
    $(selector).remove();
  });

  const bestRoot = findBestRoot($);
  const blocks = collectReadableBlocks($, bestRoot);
  const paragraphs = limitParagraphs(blocks);
  const contentText = paragraphs.join('\n\n').trim();

  return {
    contentText,
    imageUrl: findImageUrl($, articleUrl),
  };
}

function findBestRoot($) {
  let bestElement = $('body');
  let bestScore = 0;

  for (const selector of ARTICLE_SELECTORS) {
    $(selector).each((_, element) => {
      const score = scoreElement($, $(element));
      if (score > bestScore) {
        bestScore = score;
        bestElement = $(element);
      }
    });
  }

  return bestElement;
}

function scoreElement($, element) {
  const blocks = collectReadableBlocks($, element);
  const combinedLength = blocks.reduce((total, block) => total + block.length, 0);
  return combinedLength + (blocks.length * 120);
}

function collectReadableBlocks($, root) {
  const blocks = [];
  const seen = new Set();

  root.find(BLOCK_SELECTORS).each((_, node) => {
    const text = normalizeWhitespace($(node).text());

    if (!text || text.length < 40 || seen.has(text)) {
      return;
    }

    if (looksLikeNoise(text)) {
      return;
    }

    seen.add(text);
    blocks.push(text);
  });

  if (blocks.length > 0) {
    return blocks;
  }

  const fallback = normalizeWhitespace(root.text())
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 60)
    .slice(0, 10);

  return fallback;
}

function limitParagraphs(blocks) {
  const limited = [];
  let totalLength = 0;

  for (const block of blocks) {
    if (limited.length >= 10 || totalLength >= 6000) {
      break;
    }

    limited.push(block);
    totalLength += block.length;
  }

  return limited;
}

function looksLikeNoise(value) {
  const lower = value.toLowerCase();
  return [
    'sign up',
    'subscribe',
    'advertisement',
    'cookie',
    'all rights reserved',
    'read more',
  ].some((fragment) => lower.includes(fragment));
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findImageUrl($, articleUrl) {
  const candidates = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('article img').first().attr('src'),
    $('main img').first().attr('src'),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate, articleUrl);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function normalizeImageUrl(candidate, articleUrl) {
  const raw = String(candidate ?? '').trim();
  if (!raw) {
    return '';
  }

  try {
    return new URL(raw, articleUrl).toString();
  } catch {
    return '';
  }
}

function buildArticleArchive(value) {
  return {
    rawHtml: value.rawHtml ?? '',
    contentText: value.contentText ?? '',
    imageUrl: value.imageUrl ?? '',
  };
}
