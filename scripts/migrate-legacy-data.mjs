import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import '../src/lib/env/load-env.mjs';
import { createEmptyEasyRead } from '../src/lib/news-fetch/easy-read.mjs';
import {
  closeNewsDatabase,
  openNewsDatabase,
  setMetadata,
  upsertArticles,
  upsertSources,
} from '../src/lib/news-db/database.mjs';

const projectRoot = process.cwd();
const legacySqlitePath = path.resolve(projectRoot, 'data', 'ai-news.db');
const legacyJsonPath = path.resolve(projectRoot, 'data', 'ai-news.json');

async function main() {
  const targetDb = await openNewsDatabase();

  try {
    if (existsSync(legacySqlitePath)) {
      await migrateFromLegacySqlite(targetDb, legacySqlitePath);
      return;
    }

    if (existsSync(legacyJsonPath)) {
      await migrateFromLegacyJson(targetDb, legacyJsonPath);
      return;
    }

    throw new Error('No legacy SQLite or JSON data file was found in ./data.');
  } finally {
    await closeNewsDatabase(targetDb, { shutdown: true });
  }
}

async function migrateFromLegacySqlite(targetDb, sqliteFilePath) {
  const sourceDb = new DatabaseSync(sqliteFilePath, { readOnly: true });

  try {
    const sources = sqliteTableExists(sourceDb, 'sources')
      ? sourceDb.prepare(`
          SELECT id, name, site_url
          FROM sources
          ORDER BY name ASC
        `).all().map((row) => ({
          id: row.id,
          name: row.name ?? '',
          siteUrl: row.site_url ?? '',
        }))
      : [];

    const articles = sqliteTableExists(sourceDb, 'articles')
      ? sourceDb.prepare(`
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
            easy_read_json,
            raw_html,
            image_url,
            categories_json,
            published_at,
            fetched_at,
            updated_at
          FROM articles
        `).all().map(normalizeLegacyArticleRow)
      : [];

    const metadataRows = sqliteTableExists(sourceDb, 'metadata')
      ? sourceDb.prepare(`
          SELECT key, value
          FROM metadata
        `).all()
      : [];

    const users = sqliteTableExists(sourceDb, 'users')
      ? sourceDb.prepare(`
          SELECT
            id,
            name,
            email,
            password_hash,
            password_salt,
            created_at,
            updated_at
          FROM users
        `).all().map(normalizeLegacyUserRow)
      : [];

    const articleViews = sqliteTableExists(sourceDb, 'article_views')
      ? sourceDb.prepare(`
          SELECT user_id, article_id, viewed_at
          FROM article_views
        `).all().map((row) => ({
          userId: row.user_id,
          articleId: row.article_id,
          viewedAt: toIsoString(row.viewed_at),
        }))
      : [];

    const authSessions = sqliteTableExists(sourceDb, 'auth_sessions')
      ? sourceDb.prepare(`
          SELECT
            id,
            user_id,
            token_hash,
            created_at,
            expires_at,
            last_seen_at,
            ip_address,
            user_agent
          FROM auth_sessions
        `).all().map((row) => ({
          id: row.id,
          userId: row.user_id,
          tokenHash: row.token_hash ?? '',
          createdAt: toIsoString(row.created_at),
          expiresAt: toIsoString(row.expires_at),
          lastSeenAt: toIsoString(row.last_seen_at),
          ipAddress: row.ip_address ?? '',
          userAgent: row.user_agent ?? '',
        }))
      : [];

    if (sources.length > 0) {
      await upsertSources(targetDb, sources);
    }

    if (articles.length > 0) {
      await upsertArticles(targetDb, articles);
    }

    for (const row of metadataRows) {
      await setMetadata(targetDb, row.key, row.value ?? '');
    }

    await migrateUsers(targetDb, users);
    await migrateArticleViews(targetDb, articleViews);
    await migrateAuthSessions(targetDb, authSessions);

    console.log(
      `[legacy-migrate] migrated ${sources.length} sources, ${articles.length} articles, ${users.length} users, ${articleViews.length} views, ${authSessions.length} sessions from ${sqliteFilePath}`,
    );
  } finally {
    sourceDb.close();
  }
}

async function migrateFromLegacyJson(targetDb, jsonFilePath) {
  const payload = JSON.parse(readFileSync(jsonFilePath, 'utf8'));
  const sources = Array.isArray(payload?.sources)
    ? payload.sources.map((row) => ({
      id: row.id,
      name: row.name ?? '',
      siteUrl: row.siteUrl ?? '',
    }))
    : [];
  const articles = Array.isArray(payload?.articles)
    ? payload.articles.map((row) => ({
      id: row.id,
      url: row.url ?? '',
      sourceId: row.sourceId ?? '',
      sourceName: row.sourceName ?? '',
      title: row.title ?? '',
      titleZh: row.titleZh ?? '',
      summary: row.summary ?? '',
      summaryZh: row.summaryZh ?? '',
      contentText: row.contentText ?? row.previewText ?? row.summary ?? row.title ?? '',
      contentTextZh: row.contentTextZh ?? row.previewTextZh ?? row.summaryZh ?? row.summary ?? row.title ?? '',
      easyRead: normalizeEasyRead(row.easyRead),
      rawHtml: row.rawHtml ?? '',
      imageUrl: row.imageUrl ?? '',
      categories: Array.isArray(row.categories) ? row.categories : [],
      publishedAt: toIsoString(row.publishedAt),
      fetchedAt: toIsoString(row.fetchedAt ?? row.updatedAt ?? payload.generatedAt),
      updatedAt: toIsoString(row.updatedAt ?? row.fetchedAt ?? payload.generatedAt),
    }))
    : [];

  if (sources.length > 0) {
    await upsertSources(targetDb, sources);
  }

  if (articles.length > 0) {
    await upsertArticles(targetDb, articles);
  }

  if (typeof payload?.generatedAt === 'string') {
    await setMetadata(targetDb, 'generatedAt', payload.generatedAt);
  }

  console.log(
    `[legacy-migrate] migrated ${sources.length} sources and ${articles.length} articles from ${jsonFilePath}`,
  );
}

async function migrateUsers(targetDb, users) {
  for (const user of users) {
    await targetDb.query(
      `
        INSERT INTO users (
          id,
          name,
          email,
          password_hash,
          password_salt,
          created_at,
          updated_at
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::timestamptz,
          $7::timestamptz
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          password_salt = EXCLUDED.password_salt,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        user.id,
        user.name,
        user.email,
        user.passwordHash,
        user.passwordSalt,
        user.createdAt,
        user.updatedAt,
      ],
    );
  }
}

async function migrateArticleViews(targetDb, articleViews) {
  for (const view of articleViews) {
    await targetDb.query(
      `
        INSERT INTO article_views (user_id, article_id, viewed_at)
        VALUES ($1, $2, $3::timestamptz)
        ON CONFLICT (user_id, article_id) DO UPDATE SET
          viewed_at = EXCLUDED.viewed_at
      `,
      [view.userId, view.articleId, view.viewedAt],
    );
  }
}

async function migrateAuthSessions(targetDb, authSessions) {
  for (const session of authSessions) {
    await targetDb.query(
      `
        INSERT INTO auth_sessions (
          id,
          user_id,
          token_hash,
          created_at,
          expires_at,
          last_seen_at,
          ip_address,
          user_agent
        ) VALUES (
          $1,
          $2,
          $3,
          $4::timestamptz,
          $5::timestamptz,
          $6::timestamptz,
          $7,
          $8
        )
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          token_hash = EXCLUDED.token_hash,
          created_at = EXCLUDED.created_at,
          expires_at = EXCLUDED.expires_at,
          last_seen_at = EXCLUDED.last_seen_at,
          ip_address = EXCLUDED.ip_address,
          user_agent = EXCLUDED.user_agent
      `,
      [
        session.id,
        session.userId,
        session.tokenHash,
        session.createdAt,
        session.expiresAt,
        session.lastSeenAt,
        session.ipAddress,
        session.userAgent,
      ],
    );
  }
}

function sqliteTableExists(db, tableName) {
  const row = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
    LIMIT 1
  `).get(tableName);

  return Boolean(row?.name);
}

function normalizeLegacyArticleRow(row) {
  return {
    id: row.id,
    url: row.url ?? '',
    sourceId: row.source_id ?? '',
    sourceName: row.source_name ?? '',
    title: row.title ?? '',
    titleZh: row.title_zh ?? '',
    summary: row.summary ?? '',
    summaryZh: row.summary_zh ?? '',
    contentText: row.content_text ?? '',
    contentTextZh: row.content_text_zh ?? '',
    easyRead: normalizeEasyRead(row.easy_read_json),
    rawHtml: row.raw_html ?? '',
    imageUrl: row.image_url ?? '',
    categories: normalizeJsonArray(row.categories_json),
    publishedAt: toIsoString(row.published_at),
    fetchedAt: toIsoString(row.fetched_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function normalizeLegacyUserRow(row) {
  return {
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? '',
    passwordHash: row.password_hash ?? '',
    passwordSalt: row.password_salt ?? '',
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function normalizeEasyRead(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const fallback = createEmptyEasyRead();

    return {
      plainSummary: typeof parsed?.plainSummary === 'string' ? parsed.plainSummary : fallback.plainSummary,
      whyItMatters: typeof parsed?.whyItMatters === 'string' ? parsed.whyItMatters : fallback.whyItMatters,
      keyTakeaways: Array.isArray(parsed?.keyTakeaways)
        ? parsed.keyTakeaways.filter((item) => typeof item === 'string')
        : fallback.keyTakeaways,
      glossary: Array.isArray(parsed?.glossary)
        ? parsed.glossary
          .map((item) => ({
            term: typeof item?.term === 'string' ? item.term : '',
            explanation: typeof item?.explanation === 'string' ? item.explanation : '',
          }))
          .filter((item) => item.term && item.explanation)
        : fallback.glossary,
    };
  } catch {
    return createEmptyEasyRead();
  }
}

function normalizeJsonArray(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function toIsoString(value) {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

main().catch((error) => {
  console.error('[legacy-migrate] fatal error:', error);
  process.exitCode = 1;
});
