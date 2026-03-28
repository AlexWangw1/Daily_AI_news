import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

import {
  authenticateAuthUser,
  changeAuthPassword,
  closeNewsDatabase,
  createAuthSession,
  createAuthUser,
  deleteAuthSession,
  getArticleById,
  getArticleSummaryPayload,
  getAuthSession,
  getAuthUserById,
  getPreviewArticleIdByType,
  markArticleViewed,
  newsDatabaseExists,
  openNewsDatabase,
} from '../news-db/database.mjs';
import {
  applyLocalAuthToArticle,
  applyLocalAuthToPayload,
  changeLocalAuthPassword,
  loadLocalAuthSession,
  loginLocalAuthUser,
  logoutLocalAuthUser,
  markLocalArticleViewed,
  registerLocalAuthUser,
} from './local-auth-store.mjs';

const EMPTY_PAYLOAD = Object.freeze({
  generatedAt: null,
  total: 0,
  previewArticleId: null,
  fullAccess: false,
  sources: [],
  articles: [],
});
const DEFAULT_NEWS_LIMIT = 80;
const USE_LOCAL_AUTH_FALLBACK = process.env.NODE_ENV !== 'production';
const ACCOUNT_PROVIDER_DEFINITIONS = Object.freeze([
  {
    id: 'google',
    name: 'Google',
    description: '用于 Google 单点登录、邮箱同步与后续安全提醒。',
    envKey: 'AUTH_GOOGLE_CLIENT_ID',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: '适合研发账号统一登录，后续可接入代码身份校验。',
    envKey: 'AUTH_GITHUB_CLIENT_ID',
  },
  {
    id: 'wechat',
    name: '微信',
    description: '适合国内移动端登录与账号找回入口。',
    envKey: 'AUTH_WECHAT_APP_ID',
  },
]);

function resolveFromProjectRoot(...parts) {
  return path.resolve(process.cwd(), ...parts);
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function normalizePayload(payload, authenticated = false) {
  const generatedAt = typeof payload?.generatedAt === 'string' ? payload.generatedAt : null;
  const sources = Array.isArray(payload?.sources) ? payload.sources : [];
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  const previewArticleId = articles[0]?.id ?? null;

  return {
    generatedAt,
    total: Number.isFinite(payload?.total) ? payload.total : articles.length,
    previewArticleId,
    fullAccess: authenticated,
    sources,
    articles: articles.map((article, index) => ({
      ...article,
      isLocked: !authenticated && index > 0,
    })),
  };
}

function shouldUseLocalAuthFallback(error) {
  if (!USE_LOCAL_AUTH_FALLBACK) {
    return false;
  }

  if (!newsDatabaseExists()) {
    return true;
  }

  return error?.message === 'DATABASE_URL is required for PostgreSQL storage.'
    || ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error?.code);
}

export function getNewsDataPath() {
  return resolveFromProjectRoot('data', 'ai-news.json');
}

export function getPaperDataPath() {
  return resolveFromProjectRoot('data', 'ai-papers.json');
}

export function getEmptyNewsPayload() {
  return structuredClone(EMPTY_PAYLOAD);
}

export async function loadAuthSession(sessionCookieValue) {
  try {
    if (!newsDatabaseExists()) {
      return await loadLocalAuthSession(sessionCookieValue);
    }

    const db = await openNewsDatabase();

    try {
      const session = await getAuthSession(db, sessionCookieValue);

      if (!session) {
        return {
          authenticated: false,
          user: null,
          expiresAt: null,
        };
      }

      return {
        authenticated: true,
        user: session.user,
        expiresAt: session.expiresAt,
      };
    } finally {
      await closeNewsDatabase(db);
    }
  } catch (error) {
    if (shouldUseLocalAuthFallback(error)) {
      return await loadLocalAuthSession(sessionCookieValue);
    }

    throw error;
  }
}

export async function registerAuthUser(payload, requestMetadata = {}) {
  try {
    if (!newsDatabaseExists()) {
      return await registerLocalAuthUser(payload, requestMetadata);
    }

    const db = await openNewsDatabase();

    try {
      const user = await createAuthUser(db, payload);
      const session = await createAuthSession(db, user.id, requestMetadata);

      if (!session) {
        throw new Error('Failed to create auth session.');
      }

      return {
        authenticated: true,
        user,
        expiresAt: session.expiresAt,
        sessionCookieValue: session.sessionCookieValue,
      };
    } finally {
      await closeNewsDatabase(db);
    }
  } catch (error) {
    if (shouldUseLocalAuthFallback(error)) {
      return await registerLocalAuthUser(payload, requestMetadata);
    }

    throw error;
  }
}

export async function loginAuthUser(payload, requestMetadata = {}) {
  try {
    if (!newsDatabaseExists()) {
      return await loginLocalAuthUser(payload, requestMetadata);
    }

    const identifier = payload?.identifier;
    const password = payload?.password;
    const db = await openNewsDatabase();

    try {
      const user = await authenticateAuthUser(db, identifier, password);

      if (!user) {
        return null;
      }

      const session = await createAuthSession(db, user.id, requestMetadata);

      if (!session) {
        return null;
      }

      return {
        authenticated: true,
        user,
        expiresAt: session.expiresAt,
        sessionCookieValue: session.sessionCookieValue,
      };
    } finally {
      await closeNewsDatabase(db);
    }
  } catch (error) {
    if (shouldUseLocalAuthFallback(error)) {
      return await loginLocalAuthUser(payload, requestMetadata);
    }

    throw error;
  }
}

export async function logoutAuthUser(sessionCookieValue) {
  try {
    if (!newsDatabaseExists()) {
      return await logoutLocalAuthUser(sessionCookieValue);
    }

    const db = await openNewsDatabase();

    try {
      return await deleteAuthSession(db, sessionCookieValue);
    } finally {
      await closeNewsDatabase(db);
    }
  } catch (error) {
    if (shouldUseLocalAuthFallback(error)) {
      return await logoutLocalAuthUser(sessionCookieValue);
    }

    throw error;
  }
}

export async function loadAccountProfile(authSession) {
  if (!authSession?.authenticated || !authSession?.user?.id) {
    return null;
  }

  try {
    if (!newsDatabaseExists()) {
      return buildAccountProfile(authSession.user, authSession);
    }

    const db = await openNewsDatabase();

    try {
      const user = await getAuthUserById(db, authSession.user.id);
      return user ? buildAccountProfile(user, authSession) : null;
    } finally {
      await closeNewsDatabase(db);
    }
  } catch (error) {
    if (shouldUseLocalAuthFallback(error)) {
      return buildAccountProfile(authSession.user, authSession);
    }

    throw error;
  }
}

export async function changeAccountPassword(authSession, payload) {
  if (!authSession?.authenticated || !authSession?.user?.id) {
    throw new Error('Authentication required.');
  }

  try {
    if (!newsDatabaseExists()) {
      const user = await changeLocalAuthPassword(authSession, payload);
      return buildAccountProfile(user, authSession);
    }

    const db = await openNewsDatabase();

    try {
      const user = await changeAuthPassword(db, authSession.user.id, payload);
      return buildAccountProfile(user, authSession);
    } finally {
      await closeNewsDatabase(db);
    }
  } catch (error) {
    if (shouldUseLocalAuthFallback(error)) {
      const user = await changeLocalAuthPassword(authSession, payload);
      return buildAccountProfile(user, authSession);
    }

    throw error;
  }
}

export async function loadNewsPayload(limit = DEFAULT_NEWS_LIMIT, authSession = null) {
  return loadTypedPayload('news', limit, authSession);
}

export async function loadPaperPayload(limit = DEFAULT_NEWS_LIMIT, authSession = null) {
  return loadTypedPayload('papers', limit, authSession);
}

export async function loadTypedPayload(contentType, limit = DEFAULT_NEWS_LIMIT, authSession = null) {
  const authenticated = authSession?.authenticated === true;
  const userId = authSession?.user?.id ?? null;

  if (newsDatabaseExists()) {
    try {
      const db = await openNewsDatabase();

      try {
        return await getArticleSummaryPayload(db, contentType, limit, {
          userId,
          isAuthenticated: authenticated,
          metadataKey: contentType === 'papers' ? 'papersGeneratedAt' : 'generatedAt',
        });
      } finally {
        await closeNewsDatabase(db);
      }
    } catch (error) {
      if (!shouldUseLocalAuthFallback(error)) {
        throw error;
      }
    }
  }

  const dataPath = contentType === 'papers' ? getPaperDataPath() : getNewsDataPath();

  try {
    const payload = await readJsonFile(dataPath);
    return await applyLocalAuthToPayload(normalizePayload(payload, authenticated), authSession);
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) {
      return getEmptyNewsPayload();
    }

    console.warn(`[news-store] Failed to read ${dataPath}; serving empty payload.`, error);
    return getEmptyNewsPayload();
  }
}

export async function loadNewsArticle(id, authSession = null) {
  return loadTypedArticle('news', id, authSession);
}

export async function loadPaperArticle(id, authSession = null) {
  return loadTypedArticle('papers', id, authSession);
}

export async function loadTypedArticle(contentType, id, authSession = null) {
  if (!id) {
    return { article: null, errorCode: 'NOT_FOUND', previewArticleId: null };
  }

  const authenticated = authSession?.authenticated === true;
  const userId = authSession?.user?.id ?? null;

  if (newsDatabaseExists()) {
    try {
      const db = await openNewsDatabase();

      try {
        const previewArticleId = await getPreviewArticleIdByType(db, contentType);

        if (!authenticated && previewArticleId && id !== previewArticleId) {
          return { article: null, errorCode: 'AUTH_REQUIRED', previewArticleId };
        }

        const article = await getArticleById(db, contentType, id, { userId });

        return article
          ? { article, errorCode: null, previewArticleId }
          : { article: null, errorCode: 'NOT_FOUND', previewArticleId };
      } finally {
        await closeNewsDatabase(db);
      }
    } catch (error) {
      if (!shouldUseLocalAuthFallback(error)) {
        throw error;
      }
    }
  }

  const dataPath = contentType === 'papers' ? getPaperDataPath() : getNewsDataPath();
  if (!existsSync(dataPath)) {
    return { article: null, errorCode: 'NOT_FOUND', previewArticleId: null };
  }

  try {
    const payload = await readJsonFile(dataPath);
    const articles = Array.isArray(payload?.articles) ? payload.articles : [];
    const previewArticleId = articles[0]?.id ?? null;

    if (!authenticated && previewArticleId && id !== previewArticleId) {
      return { article: null, errorCode: 'AUTH_REQUIRED', previewArticleId };
    }

    const article = articles.find((item) => item?.id === id) ?? null;
    return article
      ? { article: await applyLocalAuthToArticle(article, authSession), errorCode: null, previewArticleId }
      : { article: null, errorCode: 'NOT_FOUND', previewArticleId };
  } catch {
    return { article: null, errorCode: 'NOT_FOUND', previewArticleId: null };
  }
}

export async function markNewsArticleViewed(articleId, authSession) {
  const userId = authSession?.user?.id ?? null;

  if (!articleId || !userId) {
    return null;
  }

  try {
    if (!newsDatabaseExists()) {
      return await markLocalArticleViewed(articleId, authSession);
    }

    const db = await openNewsDatabase();

    try {
      const viewState = await markArticleViewed(db, userId, articleId);

      if (!viewState) {
        return null;
      }

      const session = await getAuthSession(db, authSession.sessionCookieValue, { touch: false });

      return {
        ...viewState,
        currentUser: session?.user ?? authSession.user,
      };
    } finally {
      await closeNewsDatabase(db);
    }
  } catch (error) {
    if (shouldUseLocalAuthFallback(error)) {
      return await markLocalArticleViewed(articleId, authSession);
    }

    throw error;
  }
}

function buildAccountProfile(user, authSession) {
  return {
    user,
    security: {
      passwordEnabled: Boolean(user?.email),
      accountCreatedAt: user?.createdAt ?? null,
      passwordUpdatedAt: user?.updatedAt ?? null,
      sessionExpiresAt: authSession?.expiresAt ?? null,
      viewedCount: Number(user?.viewedCount ?? 0),
    },
    providers: ACCOUNT_PROVIDER_DEFINITIONS.map((provider) => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      available: Boolean(process.env[provider.envKey]),
      status: process.env[provider.envKey] ? 'ready' : 'coming_soon',
      statusLabel: process.env[provider.envKey] ? '可接入' : '即将接入',
      detail: process.env[provider.envKey]
        ? '当前服务端已预留配置位，接入 OAuth 回调后即可启用真实绑定。'
        : '当前环境还未配置第三方 OAuth 凭据，先保留绑定入口与状态展示。',
    })),
  };
}
