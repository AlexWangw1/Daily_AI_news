import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

import pg from 'pg';

import { createEmptyEasyRead } from '../news-fetch/easy-read.mjs';

const { Pool } = pg;

const DEFAULT_LIMIT = 80;
const AUTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_HASH_KEY_LENGTH = 64;
const DEFAULT_MAX_CONNECTIONS = 10;
const DEFAULT_IDLE_TIMEOUT_MS = 30000;
const DEFAULT_CONNECT_TIMEOUT_MS = 10000;

let sharedPoolPromise = null;
let schemaReadyPromise = null;

export function newsDatabaseExists() {
  return Boolean(getDatabaseUrl());
}

export async function openNewsDatabase() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for PostgreSQL storage.');
  }

  if (!sharedPoolPromise) {
    const pool = new Pool({
      connectionString: databaseUrl,
      max: parseIntegerEnv(process.env.DATABASE_MAX_CONNECTIONS, DEFAULT_MAX_CONNECTIONS),
      idleTimeoutMillis: parseIntegerEnv(process.env.DATABASE_IDLE_TIMEOUT_MS, DEFAULT_IDLE_TIMEOUT_MS),
      connectionTimeoutMillis: parseIntegerEnv(process.env.DATABASE_CONNECT_TIMEOUT_MS, DEFAULT_CONNECT_TIMEOUT_MS),
      allowExitOnIdle: true,
      ssl: buildSslConfig(databaseUrl),
    });

    pool.on('error', (error) => {
      console.error('[news-db] Unexpected PostgreSQL pool error:', error);
    });

    sharedPoolPromise = Promise.resolve(pool);
    schemaReadyPromise = ensureDatabaseSchema(pool);
  }

  const pool = await sharedPoolPromise;
  await schemaReadyPromise;
  return pool;
}

export async function closeNewsDatabase(db, options = {}) {
  if (!options.shutdown) {
    return;
  }

  if (!sharedPoolPromise) {
    return;
  }

  const pool = await sharedPoolPromise;
  await pool.end();

  if (db === pool || !db) {
    sharedPoolPromise = null;
    schemaReadyPromise = null;
  }
}

async function ensureDatabaseSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      content_type TEXT NOT NULL DEFAULT 'news',
      name TEXT NOT NULL,
      site_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      content_type TEXT NOT NULL DEFAULT 'news',
      url TEXT NOT NULL DEFAULT '',
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      title TEXT NOT NULL,
      title_zh TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      summary_zh TEXT NOT NULL DEFAULT '',
      content_text TEXT NOT NULL DEFAULT '',
      content_text_zh TEXT NOT NULL DEFAULT '',
      easy_read_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      raw_html TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      categories_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      published_at TIMESTAMPTZ NOT NULL,
      fetched_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      password_salt TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS article_views (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      viewed_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (user_id, article_id)
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL,
      ip_address TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_articles_published_at
      ON articles (published_at DESC);

    CREATE INDEX IF NOT EXISTS idx_articles_content_type
      ON articles (content_type);

    CREATE INDEX IF NOT EXISTS idx_articles_content_type_published_at
      ON articles (content_type, published_at DESC);

    CREATE INDEX IF NOT EXISTS idx_articles_source_id
      ON articles (source_id);

    CREATE INDEX IF NOT EXISTS idx_articles_url
      ON articles (url);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_nocase
      ON users ((LOWER(name)));

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase
      ON users ((LOWER(email)))
      WHERE email <> '';

    CREATE INDEX IF NOT EXISTS idx_article_views_article_id
      ON article_views (article_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_sessions_token_hash
      ON auth_sessions (token_hash);

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
      ON auth_sessions (user_id);

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
      ON auth_sessions (expires_at);
  `);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_salt TEXT NOT NULL DEFAULT '';

    ALTER TABLE articles
      ADD COLUMN IF NOT EXISTS easy_read_json JSONB NOT NULL DEFAULT '{}'::jsonb;

    ALTER TABLE sources
      ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'news';

    ALTER TABLE articles
      ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'news';
  `);
}

export async function upsertSources(db, sources) {
  await withTransaction(db, async (client) => {
    for (const source of sources) {
      await client.query(
        `
          INSERT INTO sources (id, content_type, name, site_url)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE SET
            content_type = EXCLUDED.content_type,
            name = EXCLUDED.name,
            site_url = EXCLUDED.site_url
        `,
        [
          source.id,
          normalizeContentType(source.contentType),
          source.name ?? '',
          source.siteUrl ?? '',
        ],
      );
    }
  });
}

export async function loadExistingArticles(db, options = {}) {
  const contentType = normalizeOptionalContentType(options.contentType);
  const result = await db.query(`
    SELECT
      id,
      content_type,
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
    ${contentType ? 'WHERE content_type = $1' : ''}
  `, contentType ? [contentType] : []);

  const byId = new Map();
  const byUrl = new Map();

  for (const row of result.rows) {
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

export async function upsertArticles(db, articles) {
  await withTransaction(db, async (client) => {
    for (const article of articles) {
      await client.query(
        `
          INSERT INTO articles (
            id,
            content_type,
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
          ) VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12::jsonb,
            $13,
            $14,
            $15::jsonb,
            $16::timestamptz,
            $17::timestamptz,
            $18::timestamptz
          )
          ON CONFLICT (id) DO UPDATE SET
            content_type = EXCLUDED.content_type,
            url = EXCLUDED.url,
            source_id = EXCLUDED.source_id,
            source_name = EXCLUDED.source_name,
            title = EXCLUDED.title,
            title_zh = EXCLUDED.title_zh,
            summary = EXCLUDED.summary,
            summary_zh = EXCLUDED.summary_zh,
            content_text = EXCLUDED.content_text,
            content_text_zh = EXCLUDED.content_text_zh,
            easy_read_json = EXCLUDED.easy_read_json,
            raw_html = EXCLUDED.raw_html,
            image_url = EXCLUDED.image_url,
            categories_json = EXCLUDED.categories_json,
            published_at = EXCLUDED.published_at,
            fetched_at = EXCLUDED.fetched_at,
            updated_at = EXCLUDED.updated_at
        `,
        [
          article.id,
          normalizeContentType(article.contentType),
          article.url ?? '',
          article.sourceId ?? '',
          article.sourceName ?? '',
          article.title ?? '',
          article.titleZh ?? '',
          article.summary ?? '',
          article.summaryZh ?? '',
          article.contentText ?? '',
          article.contentTextZh ?? '',
          JSON.stringify(article.easyRead ?? createEmptyEasyRead()),
          article.rawHtml ?? '',
          article.imageUrl ?? '',
          JSON.stringify(article.categories ?? []),
          article.publishedAt ?? new Date().toISOString(),
          article.fetchedAt ?? new Date().toISOString(),
          article.updatedAt ?? new Date().toISOString(),
        ],
      );
    }
  });
}

export async function setMetadata(db, key, value) {
  await db.query(
    `
      INSERT INTO metadata (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value
    `,
    [key, value],
  );
}

export async function getPreviewArticleId(db) {
  return getPreviewArticleIdByType(db, 'news');
}

export async function getPreviewArticleIdByType(db, contentType = 'news') {
  const result = await db.query(`
    SELECT id
    FROM articles
    WHERE content_type = $1
    ORDER BY published_at DESC, title ASC
    LIMIT 1
  `, [normalizeContentType(contentType)]);

  return result.rows[0]?.id ?? null;
}

export async function getAuthUserById(db, userId) {
  return fetchAuthUserById(db, userId);
}

export async function createAuthUser(db, payload) {
  const name = normalizeUserName(payload?.name);
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password ?? '');

  validateAuthRegistration({ name, email, password });

  try {
    return await withTransaction(db, async (client) => {
      const existingByEmail = (await client.query(
        `
          SELECT id, password_hash
          FROM users
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        [email],
      )).rows[0];

      if (existingByEmail?.password_hash) {
        throw new Error('Email already registered.');
      }

      const existingByName = (await client.query(
        `
          SELECT id, password_hash
          FROM users
          WHERE LOWER(name) = LOWER($1)
          LIMIT 1
        `,
        [name],
      )).rows[0];

      if (existingByName?.password_hash) {
        throw new Error('Name already registered.');
      }

      const now = new Date().toISOString();
      const passwordSalt = randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, passwordSalt);
      const reusableUserId = existingByEmail?.id || existingByName?.id || null;

      if (reusableUserId) {
        await client.query(
          `
            UPDATE users
            SET
              name = $1,
              email = $2,
              password_hash = $3,
              password_salt = $4,
              updated_at = $5::timestamptz
            WHERE id = $6
          `,
          [name, email, passwordHash, passwordSalt, now, reusableUserId],
        );

        return fetchAuthUserById(client, reusableUserId);
      }

      const userId = randomUUID();

      await client.query(
        `
          INSERT INTO users (
            id,
            name,
            email,
            password_hash,
            password_salt,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz)
        `,
        [userId, name, email, passwordHash, passwordSalt, now, now],
      );

      return fetchAuthUserById(client, userId);
    });
  } catch (error) {
    if (error?.code === '23505') {
      if (String(error.constraint ?? '').includes('email')) {
        throw new Error('Email already registered.');
      }

      throw new Error('Name already registered.');
    }

    throw error;
  }
}

export async function authenticateAuthUser(db, identifier, password) {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);
  const rawPassword = String(password ?? '');

  if (!normalizedIdentifier || !rawPassword) {
    return null;
  }

  const row = (await db.query(
    `
      SELECT id, password_hash, password_salt
      FROM users
      WHERE (
        LOWER(email) = LOWER($1)
        OR LOWER(name) = LOWER($1)
      )
        AND password_hash <> ''
        AND email <> ''
      LIMIT 1
    `,
    [normalizedIdentifier],
  )).rows[0];

  if (!row || !verifyPassword(rawPassword, row.password_salt, row.password_hash)) {
    return null;
  }

  return fetchAuthUserById(db, row.id);
}

export async function changeAuthPassword(db, userId, payload) {
  if (!userId) {
    throw new Error('Authentication required.');
  }

  const currentPassword = String(payload?.currentPassword ?? '');
  const nextPassword = String(payload?.nextPassword ?? '');

  if (!currentPassword) {
    throw new Error('Current password is required.');
  }

  validatePasswordValue(nextPassword);

  if (currentPassword === nextPassword) {
    throw new Error('New password must be different from current password.');
  }

  const row = (await db.query(
    `
      SELECT id, password_hash, password_salt
      FROM users
      WHERE id = $1
        AND password_hash <> ''
        AND email <> ''
      LIMIT 1
    `,
    [userId],
  )).rows[0];

  if (!row) {
    throw new Error('Authentication required.');
  }

  if (!verifyPassword(currentPassword, row.password_salt, row.password_hash)) {
    throw new Error('Current password is incorrect.');
  }

  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = hashPassword(nextPassword, passwordSalt);

  await db.query(
    `
      UPDATE users
      SET
        password_hash = $1,
        password_salt = $2,
        updated_at = $3::timestamptz
      WHERE id = $4
    `,
    [passwordHash, passwordSalt, new Date().toISOString(), userId],
  );

  return fetchAuthUserById(db, userId);
}

export async function createAuthSession(db, userId, metadata = {}) {
  if (!userId || !await getAuthUserById(db, userId)) {
    return null;
  }

  await cleanupExpiredSessions(db);

  const sessionId = randomUUID();
  const sessionToken = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(sessionToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTH_SESSION_TTL_MS);
  const createdAt = now.toISOString();
  const expiresAtIso = expiresAt.toISOString();

  await db.query(
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
    `,
    [
      sessionId,
      userId,
      tokenHash,
      createdAt,
      expiresAtIso,
      createdAt,
      normalizeAuditValue(metadata.ipAddress),
      normalizeAuditValue(metadata.userAgent),
    ],
  );

  return {
    sessionId,
    sessionCookieValue: `${sessionId}.${sessionToken}`,
    expiresAt: expiresAtIso,
  };
}

export async function getAuthSession(db, sessionCookieValue, options = {}) {
  const parsedSession = parseSessionCookie(sessionCookieValue);

  if (!parsedSession) {
    return null;
  }

  const row = (await db.query(
    `
      SELECT
        id,
        user_id,
        token_hash,
        created_at,
        expires_at,
        last_seen_at
      FROM auth_sessions
      WHERE id = $1
      LIMIT 1
    `,
    [parsedSession.sessionId],
  )).rows[0];

  if (!row) {
    return null;
  }

  const expiresAt = Date.parse(toIsoStringValue(row.expires_at));
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    await db.query(`DELETE FROM auth_sessions WHERE id = $1`, [parsedSession.sessionId]);
    return null;
  }

  const expectedHash = Buffer.from(String(row.token_hash ?? ''), 'hex');
  const actualHash = Buffer.from(hashSessionToken(parsedSession.sessionToken), 'hex');

  if (
    expectedHash.length === 0
    || expectedHash.length !== actualHash.length
    || !timingSafeEqual(expectedHash, actualHash)
  ) {
    return null;
  }

  if (options.touch !== false) {
    await db.query(
      `
        UPDATE auth_sessions
        SET last_seen_at = $1::timestamptz
        WHERE id = $2
      `,
      [new Date().toISOString(), parsedSession.sessionId],
    );
  }

  const user = await getAuthUserById(db, row.user_id);

  if (!user) {
    await db.query(`DELETE FROM auth_sessions WHERE id = $1`, [parsedSession.sessionId]);
    return null;
  }

  return {
    id: row.id,
    user,
    createdAt: toIsoStringValue(row.created_at),
    expiresAt: toIsoStringValue(row.expires_at),
    lastSeenAt: toIsoStringValue(row.last_seen_at),
  };
}

export async function deleteAuthSession(db, sessionCookieValue) {
  const parsedSession = parseSessionCookie(sessionCookieValue);

  if (!parsedSession) {
    return false;
  }

  await db.query(`DELETE FROM auth_sessions WHERE id = $1`, [parsedSession.sessionId]);
  return true;
}

export async function listNewsUsers(db) {
  const result = await db.query(`
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
  `);

  return result.rows.map((row) => normalizeUserRow(row));
}

export async function getNewsUserById(db, userId) {
  if (!userId) {
    return null;
  }

  return fetchNewsUserById(db, userId);
}

export async function createNewsUser(db, name) {
  const normalizedName = normalizeUserName(name);

  if (!normalizedName) {
    throw new Error('User name is required.');
  }

  const existingUser = await fetchNewsUserByName(db, normalizedName);

  if (existingUser) {
    return existingUser;
  }

  const now = new Date().toISOString();
  const userId = randomUUID();

  await db.query(
    `
      INSERT INTO users (id, name, created_at, updated_at)
      VALUES ($1, $2, $3::timestamptz, $4::timestamptz)
    `,
    [userId, normalizedName, now, now],
  );

  return {
    id: userId,
    name: normalizedName,
    viewedCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export async function markArticleViewed(db, userId, articleId) {
  if (!userId || !articleId) {
    return null;
  }

  const articleExists = (await db.query(
    `
      SELECT id
      FROM articles
      WHERE id = $1
      LIMIT 1
    `,
    [articleId],
  )).rows[0];

  if (!articleExists || !await getNewsUserById(db, userId)) {
    return null;
  }

  const viewedAt = new Date().toISOString();

  await db.query(
    `
      INSERT INTO article_views (user_id, article_id, viewed_at)
      VALUES ($1, $2, $3::timestamptz)
      ON CONFLICT (user_id, article_id) DO UPDATE SET
        viewed_at = EXCLUDED.viewed_at
    `,
    [userId, articleId, viewedAt],
  );

  await db.query(
    `
      UPDATE users
      SET updated_at = $1::timestamptz
      WHERE id = $2
    `,
    [viewedAt, userId],
  );

  return {
    userId,
    articleId,
    viewedAt,
  };
}

export async function getNewsSummaryPayload(db, limit = DEFAULT_LIMIT, options = {}) {
  return getArticleSummaryPayload(db, 'news', limit, {
    ...options,
    metadataKey: 'generatedAt',
  });
}

export async function getPaperSummaryPayload(db, limit = DEFAULT_LIMIT, options = {}) {
  return getArticleSummaryPayload(db, 'papers', limit, {
    ...options,
    metadataKey: 'papersGeneratedAt',
  });
}

export async function getArticleSummaryPayload(db, contentType = 'news', limit = DEFAULT_LIMIT, options = {}) {
  const userId = options.userId ?? null;
  const authenticated = options.isAuthenticated === true;
  const normalizedContentType = normalizeContentType(contentType);
  const total = Number((
    await db.query(
      'SELECT COUNT(*)::int AS total FROM articles WHERE content_type = $1',
      [normalizedContentType],
    )
  ).rows[0]?.total ?? 0);
  const generatedAt = await getMetadata(
    db,
    typeof options.metadataKey === 'string' && options.metadataKey.trim()
      ? options.metadataKey.trim()
      : 'generatedAt',
  );
  const sourcesResult = await db.query(`
    SELECT id, name, site_url
    FROM sources
    WHERE content_type = $1
    ORDER BY name ASC
  `, [normalizedContentType]);
  const rows = (await db.query(
    `
      SELECT
        articles.id,
        articles.content_type,
        articles.url,
        articles.source_id,
        articles.source_name,
        articles.title,
        articles.title_zh,
        articles.summary,
        articles.summary_zh,
        articles.content_text,
        articles.content_text_zh,
        articles.easy_read_json,
        articles.raw_html,
        articles.image_url,
        articles.categories_json,
        articles.published_at,
        article_views.viewed_at
      FROM articles
      LEFT JOIN article_views
        ON article_views.article_id = articles.id
        AND article_views.user_id = $2
      WHERE articles.content_type = $1
      ORDER BY articles.published_at DESC, articles.title ASC
      LIMIT $3
    `,
    [normalizedContentType, userId, limit],
  )).rows;

  const previewArticleId = rows[0]?.id ?? null;

  return {
    generatedAt,
    total,
    previewArticleId,
    fullAccess: authenticated,
    sources: sourcesResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      siteUrl: row.site_url,
    })),
    articles: rows.map((row, index) => ({
      ...normalizeArticleRow(row),
      isLocked: !authenticated && index > 0,
    })),
  };
}

export async function getNewsArticleById(db, id, options = {}) {
  return getArticleById(db, 'news', id, options);
}

export async function getPaperArticleById(db, id, options = {}) {
  return getArticleById(db, 'papers', id, options);
}

export async function getArticleById(db, contentType = 'news', id, options = {}) {
  const userId = options.userId ?? null;
  const normalizedContentType = normalizeContentType(contentType);

  const row = (await db.query(
    `
      SELECT
        articles.id,
        articles.content_type,
        articles.url,
        articles.source_id,
        articles.source_name,
        articles.title,
        articles.title_zh,
        articles.summary,
        articles.summary_zh,
        articles.content_text,
        articles.content_text_zh,
        articles.easy_read_json,
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
        AND article_views.user_id = $2
      WHERE articles.content_type = $1
        AND articles.id = $3
      LIMIT 1
    `,
    [normalizedContentType, userId, id],
  )).rows[0];

  return row ? normalizeArticleRow(row, { includeFullContent: true }) : null;
}

async function getMetadata(db, key) {
  const row = (await db.query(
    `
      SELECT value
      FROM metadata
      WHERE key = $1
      LIMIT 1
    `,
    [key],
  )).rows[0];

  return row?.value ?? null;
}

async function fetchAuthUserById(queryable, userId) {
  if (!userId) {
    return null;
  }

  const row = (await queryable.query(
    `
      SELECT
        users.id,
        users.name,
        users.email,
        users.created_at,
        users.updated_at,
        COUNT(article_views.article_id)::int AS viewed_count
      FROM users
      LEFT JOIN article_views
        ON article_views.user_id = users.id
      WHERE users.id = $1
        AND users.password_hash <> ''
        AND users.email <> ''
      GROUP BY users.id
    `,
    [userId],
  )).rows[0];

  return row ? normalizeAuthUserRow(row) : null;
}

async function fetchNewsUserById(queryable, userId) {
  const row = (await queryable.query(
    `
      SELECT
        users.id,
        users.name,
        users.created_at,
        users.updated_at,
        COUNT(article_views.article_id)::int AS viewed_count
      FROM users
      LEFT JOIN article_views
        ON article_views.user_id = users.id
      WHERE users.id = $1
      GROUP BY users.id
    `,
    [userId],
  )).rows[0];

  return row ? normalizeUserRow(row) : null;
}

async function fetchNewsUserByName(queryable, name) {
  const row = (await queryable.query(
    `
      SELECT
        users.id,
        users.name,
        users.created_at,
        users.updated_at,
        COUNT(article_views.article_id)::int AS viewed_count
      FROM users
      LEFT JOIN article_views
        ON article_views.user_id = users.id
      WHERE LOWER(users.name) = LOWER($1)
      GROUP BY users.id
    `,
    [name],
  )).rows[0];

  return row ? normalizeUserRow(row) : null;
}

function normalizeArticleRow(row, options = {}) {
  const includeFullContent = options.includeFullContent === true;
  const contentText = typeof row.content_text === 'string' ? row.content_text : '';
  const contentTextZh = typeof row.content_text_zh === 'string' ? row.content_text_zh : '';
  const previewSource = contentTextZh || contentText || row.summary_zh || row.summary || '';
  const rawHtml = typeof row.raw_html === 'string' ? row.raw_html : '';
  const easyRead = parseEasyRead(row.easy_read_json);

  return {
    id: row.id,
    contentType: normalizeContentType(row.content_type),
    title: row.title ?? '',
    titleZh: row.title_zh ?? '',
    summary: row.summary ?? '',
    summaryZh: row.summary_zh ?? '',
    url: row.url ?? '',
    sourceId: row.source_id ?? '',
    sourceName: row.source_name ?? '',
    publishedAt: toIsoStringValue(row.published_at),
    imageUrl: row.image_url ?? '',
    categories: parseCategories(row.categories_json),
    previewText: buildPreview(previewSource),
    previewTextZh: buildPreview(contentTextZh || previewSource),
    easyRead,
    storedLocally: Boolean(rawHtml),
    isViewed: Boolean(row.viewed_at),
    viewedAt: row.viewed_at ? toIsoStringValue(row.viewed_at) : null,
    ...(includeFullContent
      ? {
          contentText,
          contentTextZh,
          rawHtml,
          fetchedAt: row.fetched_at ? toIsoStringValue(row.fetched_at) : null,
          updatedAt: row.updated_at ? toIsoStringValue(row.updated_at) : null,
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
    createdAt: row.created_at ? toIsoStringValue(row.created_at) : null,
    updatedAt: row.updated_at ? toIsoStringValue(row.updated_at) : null,
  };
}

function normalizeAuthUserRow(row) {
  return {
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? '',
    viewedCount: Number(row.viewed_count ?? 0),
    createdAt: row.created_at ? toIsoStringValue(row.created_at) : null,
    updatedAt: row.updated_at ? toIsoStringValue(row.updated_at) : null,
  };
}

function validateAuthRegistration({ name, email, password }) {
  if (!name) {
    throw new Error('Name is required.');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new Error('Valid email is required.');
  }

  validatePasswordValue(password);
}

function validatePasswordValue(password) {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  if (!/[a-zA-Z]/u.test(password) || !/\d/u.test(password)) {
    throw new Error('Password must include letters and numbers.');
  }
}

function normalizeEmail(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 160);
}

function normalizeLoginIdentifier(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function normalizeAuditValue(value) {
  return String(value ?? '')
    .trim()
    .slice(0, 255);
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, PASSWORD_HASH_KEY_LENGTH).toString('hex');
}

function verifyPassword(password, salt, storedHash) {
  const expectedHash = Buffer.from(String(storedHash ?? ''), 'hex');
  const actualHash = Buffer.from(hashPassword(password, salt), 'hex');

  if (
    expectedHash.length === 0
    || expectedHash.length !== actualHash.length
  ) {
    return false;
  }

  return timingSafeEqual(expectedHash, actualHash);
}

function hashSessionToken(token) {
  return createHash('sha256').update(String(token ?? '')).digest('hex');
}

function parseSessionCookie(sessionCookieValue) {
  const rawValue = String(sessionCookieValue ?? '').trim();

  if (!rawValue || !rawValue.includes('.')) {
    return null;
  }

  const [sessionId, sessionToken] = rawValue.split('.', 2);

  if (!sessionId || !sessionToken) {
    return null;
  }

  return { sessionId, sessionToken };
}

async function cleanupExpiredSessions(db) {
  await db.query(
    `
      DELETE FROM auth_sessions
      WHERE expires_at <= $1::timestamptz
    `,
    [new Date().toISOString()],
  );
}

function parseCategories(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string');
  }

  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseEasyRead(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value ?? '{}') : (value ?? {});
    const empty = createEmptyEasyRead();

    return {
      plainSummary: typeof parsed?.plainSummary === 'string' ? parsed.plainSummary : empty.plainSummary,
      whyItMatters: typeof parsed?.whyItMatters === 'string' ? parsed.whyItMatters : empty.whyItMatters,
      keyTakeaways: Array.isArray(parsed?.keyTakeaways)
        ? parsed.keyTakeaways.filter((item) => typeof item === 'string')
        : empty.keyTakeaways,
      glossary: Array.isArray(parsed?.glossary)
        ? parsed.glossary
          .map((item) => ({
            term: typeof item?.term === 'string' ? item.term : '',
            explanation: typeof item?.explanation === 'string' ? item.explanation : '',
          }))
          .filter((item) => item.term && item.explanation)
        : empty.glossary,
    };
  } catch {
    return createEmptyEasyRead();
  }
}

function toIsoStringValue(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function normalizeContentType(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase() === 'papers'
    ? 'papers'
    : 'news';
}

function normalizeOptionalContentType(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return normalizeContentType(value);
}

function getDatabaseUrl() {
  return String(
    process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || '',
  ).trim();
}

function buildSslConfig(databaseUrl) {
  const explicit = String(process.env.DATABASE_SSL ?? '').trim().toLowerCase();

  if (explicit === 'false' || explicit === '0' || explicit === 'disable') {
    return false;
  }

  if (explicit === 'true' || explicit === '1' || explicit === 'require') {
    return { rejectUnauthorized: false };
  }

  if (/(localhost|127\.0\.0\.1)/i.test(databaseUrl)) {
    return false;
  }

  return false;
}

function parseIntegerEnv(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function withTransaction(db, callback) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
