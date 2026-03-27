import crypto from 'node:crypto';

const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
  'ref',
  'ref_src',
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term',
]);

export function normalizeTitle(value) {
  return cleanText(value);
}

export function normalizeSummary(item) {
  const candidates = [
    item.contentSnippet,
    item.summary,
    item.description,
    item.contentEncoded,
    item.content,
  ];

  for (const candidate of candidates) {
    const text = cleanText(candidate);
    if (text) {
      return truncateSentence(text, 360);
    }
  }

  return '';
}

export function collectCategories(item) {
  const values = [];

  if (Array.isArray(item.categories)) {
    values.push(...item.categories);
  } else if (typeof item.categories === 'string') {
    values.push(item.categories);
  }

  if (Array.isArray(item.category)) {
    values.push(...item.category);
  } else if (typeof item.category === 'string') {
    values.push(item.category);
  }

  return [...new Set(values.map(cleanText).filter(Boolean))];
}

export function derivePublishedAt(item) {
  const candidates = [item.isoDate, item.pubDate, item.published, item.updated];

  for (const candidate of candidates) {
    const date = parseDate(candidate);
    if (date) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

export function deriveCanonicalUrl(item, source) {
  const candidates = [
    item.link,
    item.guid,
    item.id,
    item.comments,
    source.feedUrl,
  ];

  for (const candidate of candidates) {
    const url = normalizeUrlForOutput(candidate);
    if (url) {
      return url;
    }
  }

  return '';
}

export function deriveImageUrl(item) {
  const candidates = [
    item.enclosure,
    item.mediaContent,
    item.mediaThumbnail,
    item.itunesImage,
    item.image,
    item.thumbnail,
    item.contentEncoded,
    item.content,
  ];

  for (const candidate of candidates) {
    const url = findUrlLikeValue(candidate);
    if (url) {
      return url;
    }
  }

  return '';
}

export function buildArticleId({ sourceId, canonicalUrl, title, publishedAt }) {
  const seed = [sourceId, canonicalUrl || title, publishedAt].join('|');
  return `${sourceId}-${crypto.createHash('sha1').update(seed).digest('hex').slice(0, 16)}`;
}

export function normalizeUrlForOutput(value) {
  const input = cleanText(value);
  if (!input) {
    return '';
  }

  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }

    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        url.searchParams.delete(key);
      }
    }

    url.hash = '';

    return url.toString();
  } catch {
    return '';
  }
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanText(value) {
  if (value == null) {
    return '';
  }

  const raw = Array.isArray(value) ? value.join(' ') : String(value);
  const withoutTags = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  const decoded = decodeEntities(withoutTags);
  return decoded.replace(/\s+/g, ' ').trim();
}

function truncateSentence(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  const slice = value.slice(0, maxLength);
  const sentenceBreak = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));

  if (sentenceBreak > 180) {
    return `${slice.slice(0, sentenceBreak + 1).trim()}...`;
  }

  return `${slice.trimEnd()}...`;
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    );
}

function findUrlLikeValue(value, depth = 0) {
  if (!value || depth > 4) {
    return '';
  }

  if (typeof value === 'string') {
    return normalizeUrlForOutput(value);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const url = findUrlLikeValue(entry, depth + 1);
      if (url) {
        return url;
      }
    }
    return '';
  }

  if (typeof value === 'object') {
    const directKeys = ['url', 'href', 'link', 'src'];
    for (const key of directKeys) {
      if (key in value) {
        const url = findUrlLikeValue(value[key], depth + 1);
        if (url) {
          return url;
        }
      }
    }

    if (value.$) {
      const url = findUrlLikeValue(value.$, depth + 1);
      if (url) {
        return url;
      }
    }

    for (const nested of Object.values(value)) {
      const url = findUrlLikeValue(nested, depth + 1);
      if (url) {
        return url;
      }
    }
  }

  return '';
}
