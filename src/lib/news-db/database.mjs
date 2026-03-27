import { existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_LIMIT = 60;

function resolveFromProjectRoot(...parts) {
  return path.resolve(process.cwd(), ...parts);
}

export function getNewsDatabasePath() {
  return resolveFromProjectRoot('data', 'ai-news.db');
}

export function ensureNewsDatabaseDir() {
  mkdirSync(resolveFromProjectRoot('data'), { recursive: true });
}

export function newsDatabaseExists() {
  return existsSync(getNewsDatabasePath());
}

export function openNewsDatabase() {
  ensureNewsDatabaseDir();

  const db = new DatabaseSync(getNewsDatabasePath());
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA temp_store = MEMORY;

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      site_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL DEFAULT '',
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      title TEXT NOT NULL,
      title_zh TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      summary_zh TEXT NOT NULL DEFAULT '',
      content_text TEXT NOT NULL DEFAULT '',
      content_text_zh TEXT NOT NULL DEFAULT '',
      raw_html TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      categories_json TEXT NOT NULL DEFAULT '[]',
      published_at TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_articles_published_at
      ON articles (published_at DESC);

    CREATE INDEX IF NOT EXISTS idx_articles_source_id
      ON articles (source_id);

    CREATE INDEX IF NOT EXISTS idx_articles_url
      ON articles (url);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_nocase
      ON users (name COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS article_views (
      user_id TEXT NOT NULL,
      article_id TEXT NOT NULL,
      viewed_at TEXT NOT NULL,
      PRIMARY KEY (user_id, article_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_article_views_article_id
      ON article_views (article_id);

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return db;
}

export function closeNewsDatabase(db) {
  db.close();
}

export function upsertSources(db, sources) {
  const statement = db.prepare(`
    INSERT INTO sources (id, name, site_url)
    VALUES (:id, :name, :siteUrl)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      site_url = excluded.site_url
  `);

  for (const source of sources) {
    statement.run({
      id: source.id,
      name: source.name,
      siteUrl: source.siteUrl ?? '',
    });
  }
}

export function loadExistingArticles(db) {
  const rows = db.prepare(`
    SELECT
      id,
      url,
      source_id,
      source_name,
      title,
      title_zh,
      summary,
      summary_zh,
      content_text,
      content_text_zh,
      raw_html,
      image_url,
      categories_json,
      published_at,
      fetched_at,
      updated_at
    FROM articles
  `).all();

  const byId = new Map();
  const byUrl = new Map();

  for (const row of rows) {
    const normalized = normalizeArticleRow(row, { includeFullContent: true });
    byId.set(normalized.id, normalized);

    if (normalized.url) {
      byUrl.set(normalized.url, normalized);
    }
  }

  return { byId, byUrl };
}

export function findExistingArticle(article, existingArticles) {
  return existingArticles.byId.get(article.id)
    ?? (article.url ? existingArticles.byUrl.get(article.url) : null)
    ?? null;
}

export function upsertArticles(db, articles) {
  const statement = db.prepare(`
    INSERT INTO articles (
      id,
      url,
      source_id,
      source_name,
      title,
      title_zh,
      summary,
      summary_zh,
      content_text,
      content_text_zh,
      raw_html,
      image_url,
      categories_json,
      published_at,
      fetched_at,
      updated_at
    ) VALUES (
      :id,
      :url,
      :sourceId,
      :sourceName,
      :title,
      :titleZh,
      :summary,
      :summaryZh,
      :contentText,
      :contentTextZh,
      :rawHtml,
      :imageUrl,
      :categoriesJson,
      :publishedAt,
      :fetchedAt,
      :updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      url = excluded.url,
      source_id = excluded.source_id,
      source_name = excluded.source_name,
      title = excluded.title,
      title_zh = excluded.title_zh,
      summary = excluded.summary,
      summary_zh = excluded.summary_zh,
      content_text = excluded.content_text,
      content_text_zh = excluded.content_text_zh,
      raw_html = excluded.raw_html,
      image_url = excluded.image_url,
      categories_json = excluded.categories_json,
      published_at = excluded.published_at,
      fetched_at = excluded.fetched_at,
      updated_at = excluded.updated_at
  `);

  for (const article of articles) {
    statement.run({
      id: article.id,
      url: article.url ?? '',
      sourceId: article.sourceId ?? '',
      sourceName: article.sourceName ?? '',
      title: article.title ?? '',
      titleZh: article.titleZh ?? '',
      summary: article.summary ?? '',
      summaryZh: article.summaryZh ?? '',
      contentText: article.contentText ?? '',
      contentTextZh: article.contentTextZh ?? '',
      rawHtml: article.rawHtml ?? '',
      imageUrl: article.imageUrl ?? '',
      categoriesJson: JSON.stringify(article.categories ?? []),
      publishedAt: article.publishedAt ?? '',
      fetchedAt: article.fetchedAt ?? '',
      updatedAt: article.updatedAt ?? '',
    });
  }
}

export function setMetadata(db, key, value) {
  db.prepare(`
    INSERT INTO metadata (key, value)
    VALUES (:key, :value)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value
  `).run({ key, value });
}

export function listNewsUsers(db) {
  const rows = db.prepare(`
    SELECT
      users.id,
      users.name,
      users.created_at,
      users.updated_at,
      COUNT(article_views.article_id) AS viewed_count
    FROM users
    LEFT JOIN article_views
      ON article_views.user_id = users.id
    GROUP BY users.id
    ORDER BY users.created_at ASC, users.name ASC
  `).all();

  return rows.map((row) => normalizeUserRow(row));
}

export function getNewsUserById(db, userId) {
  if (!userId) {
    return null;
  }

  const row = db.prepare(`
    SELECT
      users.id,
      users.name,
      users.created_at,
      users.updated_at,
      COUNT(article_views.article_id) AS viewed_count
    FROM users
    LEFT JOIN article_views
      ON article_views.user_id = users.id
    WHERE users.id = ?
    GROUP BY users.id
  `).get(userId);

  return row ? normalizeUserRow(row) : null;
}

export function createNewsUser(db, name) {
  const normalizedName = normalizeUserName(name);

  if (!normalizedName) {
    throw new Error('User name is required.');
  }

  const existingUser = db.prepare(`
    SELECT
      users.id,
      users.name,
      users.created_at,
      users.updated_at,
      COUNT(article_views.article_id) AS viewed_count
    FROM users
    LEFT JOIN article_views
      ON article_views.user_id = users.id
    WHERE users.name = ? COLLATE NOCASE
    GROUP BY users.id
  `).get(normalizedName);

  if (existingUser) {
    return normalizeUserRow(existingUser);
  }

  const now = new Date().toISOString();
  const userId = randomUUID();

  db.prepare(`
    INSERT INTO users (id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, normalizedName, now, now);

  return {
    id: userId,
    name: normalizedName,
    viewedCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function markArticleViewed(db, userId, articleId) {
  if (!userId || !articleId) {
    return null;
  }

  const articleExists = db.prepare(`
    SELECT id
    FROM articles
    WHERE id = ?
  `).get(articleId);

  if (!articleExists || !getNewsUserById(db, userId)) {
    return null;
  }

  const viewedAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO article_views (user_id, article_id, viewed_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, article_id) DO UPDATE SET
      viewed_at = excluded.viewed_at
  `).run(userId, articleId, viewedAt);

  db.prepare(`
    UPDATE users
    SET updated_at = ?
    WHERE id = ?
  `).run(viewedAt, userId);

  return {
    userId,
    articleId,
    viewedAt,
  };
}

function getMetadata(db, key) {
  return db.prepare(`
    SELECT value
    FROM metadata
    WHERE key = ?
  `).get(key)?.value ?? null;
}

export function getNewsSummaryPayload(db, limit = DEFAULT_LIMIT, options = {}) {
  const userId = options.userId ?? '';
  const total = db.prepare('SELECT COUNT(*) AS total FROM articles').get()?.total ?? 0;
  const generatedAt = getMetadata(db, 'generatedAt');
  const sources = db.prepare(`
    SELECT id, name, site_url
    FROM sources
    ORDER BY name ASC
  `).all().map((row) => ({
    id: row.id,
    name: row.name,
    siteUrl: row.site_url,
  }));

  const rows = db.prepare(`
    SELECT
      articles.id,
      articles.url,
      articles.source_id,
      articles.source_name,
      articles.title,
      articles.title_zh,
      articles.summary,
      articles.summary_zh,
      articles.content_text,
      articles.content_text_zh,
      articles.raw_html,
      articles.image_url,
      articles.categories_json,
      articles.published_at,
      article_views.viewed_at
    FROM articles
    LEFT JOIN article_views
      ON article_views.article_id = articles.id
      AND article_views.user_id = ?
    ORDER BY articles.published_at DESC, articles.title ASC
    LIMIT ?
  `).all(userId, limit);

  return {
    generatedAt,
    total,
    sources,
    articles: rows.map((row) => normalizeArticleRow(row)),
  };
}

export function getNewsArticleById(db, id, options = {}) {
  const userId = options.userId ?? '';
  const row = db.prepare(`
    SELECT
      articles.id,
      articles.url,
      articles.source_id,
      articles.source_name,
      articles.title,
      articles.title_zh,
      articles.summary,
      articles.summary_zh,
      articles.content_text,
      articles.content_text_zh,
      articles.raw_html,
      articles.image_url,
      articles.categories_json,
      articles.published_at,
      articles.fetched_at,
      articles.updated_at,
      article_views.viewed_at
    FROM articles
    LEFT JOIN article_views
      ON article_views.article_id = articles.id
      AND article_views.user_id = ?
    WHERE articles.id = ?
  `).get(userId, id);

  return row ? normalizeArticleRow(row, { includeFullContent: true }) : null;
}

function normalizeArticleRow(row, options = {}) {
  const includeFullContent = options.includeFullContent === true;
  const contentText = typeof row.content_text === 'string' ? row.content_text : '';
  const contentTextZh = typeof row.content_text_zh === 'string' ? row.content_text_zh : '';
  const previewSource = contentTextZh || contentText || row.summary_zh || row.summary || '';
  const rawHtml = typeof row.raw_html === 'string' ? row.raw_html : '';

  return {
    id: row.id,
    title: row.title ?? '',
    titleZh: row.title_zh ?? '',
    summary: row.summary ?? '',
    summaryZh: row.summary_zh ?? '',
    url: row.url ?? '',
    sourceId: row.source_id ?? '',
    sourceName: row.source_name ?? '',
    publishedAt: row.published_at ?? '',
    imageUrl: row.image_url ?? '',
    categories: parseCategories(row.categories_json),
    previewText: buildPreview(previewSource),
    previewTextZh: buildPreview(contentTextZh || previewSource),
    storedLocally: Boolean(rawHtml),
    isViewed: typeof row.viewed_at === 'string' && row.viewed_at.length > 0,
    viewedAt: row.viewed_at ?? null,
    ...(includeFullContent
      ? {
          contentText,
          contentTextZh,
          rawHtml,
          fetchedAt: row.fetched_at ?? null,
          updatedAt: row.updated_at ?? null,
        }
      : {}),
  };
}

function buildPreview(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  return text.length > 280 ? `${text.slice(0, 277).trimEnd()}...` : text;
}

function normalizeUserName(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
}

function normalizeUserRow(row) {
  return {
    id: row.id,
    name: row.name ?? '',
    viewedCount: Number(row.viewed_count ?? 0),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function parseCategories(value) {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
