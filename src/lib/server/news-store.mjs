import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

import {
  closeNewsDatabase,
  createNewsUser,
  getNewsArticleById,
  getNewsSummaryPayload,
  getNewsUserById,
  listNewsUsers,
  markArticleViewed,
  newsDatabaseExists,
  openNewsDatabase,
} from '../news-db/database.mjs';

const EMPTY_PAYLOAD = Object.freeze({
  generatedAt: null,
  total: 0,
  sources: [],
  articles: [],
});
const DEFAULT_USER_NAME = '默认用户';

function resolveFromProjectRoot(...parts) {
  return path.resolve(process.cwd(), ...parts);
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function normalizePayload(payload) {
  const generatedAt = typeof payload?.generatedAt === 'string' ? payload.generatedAt : null;
  const sources = Array.isArray(payload?.sources) ? payload.sources : [];
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];

  return {
    generatedAt,
    total: Number.isFinite(payload?.total) ? payload.total : articles.length,
    sources,
    articles,
  };
}

export function getNewsDataPath() {
  return resolveFromProjectRoot('data', 'ai-news.json');
}

export function getEmptyNewsPayload() {
  return structuredClone(EMPTY_PAYLOAD);
}

export async function loadNewsPayload(limit = 60, userId = null) {
  if (newsDatabaseExists()) {
    const db = openNewsDatabase();

    try {
      return getNewsSummaryPayload(db, limit, { userId });
    } finally {
      closeNewsDatabase(db);
    }
  }

  const dataPath = getNewsDataPath();

  try {
    const payload = await readJsonFile(dataPath);
    return normalizePayload(payload);
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) {
      return getEmptyNewsPayload();
    }

    console.warn(`[news-store] Failed to read ${dataPath}; serving empty payload.`, error);
    return getEmptyNewsPayload();
  }
}

export async function loadNewsArticle(id, userId = null) {
  if (!id) {
    return null;
  }

  if (newsDatabaseExists()) {
    const db = openNewsDatabase();

    try {
      return getNewsArticleById(db, id, { userId });
    } finally {
      closeNewsDatabase(db);
    }
  }

  const dataPath = getNewsDataPath();
  if (!existsSync(dataPath)) {
    return null;
  }

  try {
    const payload = await readJsonFile(dataPath);
    return Array.isArray(payload?.articles)
      ? payload.articles.find((article) => article?.id === id) ?? null
      : null;
  } catch {
    return null;
  }
}

export async function loadUserSession(requestedUserId) {
  const db = openNewsDatabase();

  try {
    return resolveUserSession(db, requestedUserId);
  } finally {
    closeNewsDatabase(db);
  }
}

export async function createUserSession(name) {
  const normalizedName = normalizeUserName(name);

  if (!normalizedName) {
    throw new Error('User name is required.');
  }

  const db = openNewsDatabase();

  try {
    const currentUser = createNewsUser(db, normalizedName);

    return {
      currentUser,
      users: listNewsUsers(db),
      resolvedUserId: currentUser.id,
    };
  } finally {
    closeNewsDatabase(db);
  }
}

export async function selectUserSession(userId) {
  if (!userId) {
    return null;
  }

  const db = openNewsDatabase();

  try {
    const currentUser = getNewsUserById(db, userId);

    if (!currentUser) {
      return null;
    }

    return {
      currentUser,
      users: listNewsUsers(db),
      resolvedUserId: currentUser.id,
    };
  } finally {
    closeNewsDatabase(db);
  }
}

export async function markNewsArticleViewed(articleId, userId) {
  if (!articleId || !userId) {
    return null;
  }

  const db = openNewsDatabase();

  try {
    const viewState = markArticleViewed(db, userId, articleId);

    if (!viewState) {
      return null;
    }

    return {
      ...viewState,
      currentUser: getNewsUserById(db, userId),
    };
  } finally {
    closeNewsDatabase(db);
  }
}

function normalizeUserName(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
}

function resolveUserSession(db, requestedUserId) {
  let users = listNewsUsers(db);

  if (!users.length) {
    createNewsUser(db, DEFAULT_USER_NAME);
    users = listNewsUsers(db);
  }

  const currentUser = getNewsUserById(db, requestedUserId) ?? users[0] ?? null;

  return {
    currentUser,
    users,
    resolvedUserId: currentUser?.id ?? null,
  };
}
