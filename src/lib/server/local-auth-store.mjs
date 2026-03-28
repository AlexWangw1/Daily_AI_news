import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const AUTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_HASH_KEY_LENGTH = 64;

let writeQueue = Promise.resolve();

function resolveFromProjectRoot(...parts) {
  return path.resolve(process.cwd(), ...parts);
}

function getLocalAuthDataPath() {
  return resolveFromProjectRoot('data', 'local-auth.json');
}

function createEmptyStore() {
  return {
    users: [],
    sessions: [],
    articleViews: [],
  };
}

async function ensureLocalStore() {
  const filePath = getLocalAuthDataPath();
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }

    await writeFile(filePath, `${JSON.stringify(createEmptyStore(), null, 2)}\n`, 'utf8');
  }
}

async function readLocalStore() {
  await ensureLocalStore();
  const raw = await readFile(getLocalAuthDataPath(), 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed?.users) ? parsed.users : [],
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
      articleViews: Array.isArray(parsed?.articleViews) ? parsed.articleViews : [],
    };
  } catch {
    return createEmptyStore();
  }
}

async function writeLocalStore(store) {
  await writeFile(getLocalAuthDataPath(), `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

async function withStoreMutation(callback) {
  const run = async () => {
    const store = await readLocalStore();
    const result = await callback(store);
    await writeLocalStore(store);
    return result;
  };

  const pending = writeQueue.then(run, run);
  writeQueue = pending.catch(() => {});
  return pending;
}

export async function loadLocalAuthSession(sessionCookieValue) {
  if (!sessionCookieValue) {
    return {
      authenticated: false,
      user: null,
      expiresAt: null,
    };
  }

  return withStoreMutation(async (store) => {
    cleanupExpiredSessions(store);
    const parsedSession = parseSessionCookie(sessionCookieValue);

    if (!parsedSession) {
      return {
        authenticated: false,
        user: null,
        expiresAt: null,
      };
    }

    const session = store.sessions.find((item) => item.id === parsedSession.sessionId);
    if (!session) {
      return {
        authenticated: false,
        user: null,
        expiresAt: null,
      };
    }

    const expiresAt = Date.parse(session.expiresAt);
    if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      store.sessions = store.sessions.filter((item) => item.id !== session.id);
      return {
        authenticated: false,
        user: null,
        expiresAt: null,
      };
    }

    const expectedHash = Buffer.from(String(session.tokenHash ?? ''), 'hex');
    const actualHash = Buffer.from(hashSessionToken(parsedSession.sessionToken), 'hex');

    if (
      expectedHash.length === 0
      || expectedHash.length !== actualHash.length
      || !timingSafeEqual(expectedHash, actualHash)
    ) {
      return {
        authenticated: false,
        user: null,
        expiresAt: null,
      };
    }

    session.lastSeenAt = new Date().toISOString();
    const user = toPublicUser(store, session.userId);

    if (!user) {
      store.sessions = store.sessions.filter((item) => item.id !== session.id);
      return {
        authenticated: false,
        user: null,
        expiresAt: null,
      };
    }

    return {
      authenticated: true,
      user,
      expiresAt: session.expiresAt,
    };
  });
}

export async function registerLocalAuthUser(payload, requestMetadata = {}) {
  return withStoreMutation(async (store) => {
    cleanupExpiredSessions(store);

    const name = normalizeUserName(payload?.name);
    const email = normalizeEmail(payload?.email);
    const password = String(payload?.password ?? '');

    validateAuthRegistration({ name, email, password });

    const emailExists = store.users.some((user) => normalizeEmail(user.email) === email);
    if (emailExists) {
      throw new Error('Email already registered.');
    }

    const nameExists = store.users.some((user) => normalizeUserName(user.name).toLowerCase() === name.toLowerCase());
    if (nameExists) {
      throw new Error('Name already registered.');
    }

    const now = new Date().toISOString();
    const passwordSalt = randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, passwordSalt);
    const userId = randomUUID();

    store.users.push({
      id: userId,
      name,
      email,
      passwordHash,
      passwordSalt,
      createdAt: now,
      updatedAt: now,
    });

    const session = createLocalSession(store, userId, requestMetadata);

    return {
      authenticated: true,
      user: toPublicUser(store, userId),
      expiresAt: session.expiresAt,
      sessionCookieValue: session.sessionCookieValue,
    };
  });
}

export async function loginLocalAuthUser(payload, requestMetadata = {}) {
  return withStoreMutation(async (store) => {
    cleanupExpiredSessions(store);

    const identifier = normalizeLoginIdentifier(payload?.identifier);
    const password = String(payload?.password ?? '');

    if (!identifier || !password) {
      return null;
    }

    const user = store.users.find((item) => (
      normalizeEmail(item.email) === identifier.toLowerCase()
      || normalizeUserName(item.name).toLowerCase() === identifier.toLowerCase()
    ));

    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return null;
    }

    user.updatedAt = new Date().toISOString();
    const session = createLocalSession(store, user.id, requestMetadata);

    return {
      authenticated: true,
      user: toPublicUser(store, user.id),
      expiresAt: session.expiresAt,
      sessionCookieValue: session.sessionCookieValue,
    };
  });
}

export async function logoutLocalAuthUser(sessionCookieValue) {
  return withStoreMutation(async (store) => {
    cleanupExpiredSessions(store);
    const parsedSession = parseSessionCookie(sessionCookieValue);

    if (!parsedSession) {
      return false;
    }

    const before = store.sessions.length;
    store.sessions = store.sessions.filter((item) => item.id !== parsedSession.sessionId);
    return store.sessions.length !== before;
  });
}

export async function applyLocalAuthToPayload(payload, authSession = null) {
  const authenticated = authSession?.authenticated === true;
  const userId = authSession?.user?.id ?? null;

  if (!authenticated || !userId) {
    return {
      ...payload,
      fullAccess: false,
      articles: (payload?.articles ?? []).map((article, index) => ({
        ...article,
        isLocked: index > 0,
        isViewed: false,
        viewedAt: null,
      })),
    };
  }

  const store = await readLocalStore();
  const viewsByArticleId = buildViewsByArticleId(store, userId);

  return {
    ...payload,
    fullAccess: true,
    articles: (payload?.articles ?? []).map((article) => ({
      ...article,
      isLocked: false,
      isViewed: viewsByArticleId.has(article.id),
      viewedAt: viewsByArticleId.get(article.id)?.viewedAt ?? null,
    })),
  };
}

export async function applyLocalAuthToArticle(article, authSession = null) {
  if (!article) {
    return null;
  }

  const authenticated = authSession?.authenticated === true;
  const userId = authSession?.user?.id ?? null;

  if (!authenticated || !userId) {
    return {
      ...article,
      isViewed: false,
      viewedAt: null,
    };
  }

  const store = await readLocalStore();
  const view = store.articleViews.find((item) => item.userId === userId && item.articleId === article.id);

  return {
    ...article,
    isViewed: Boolean(view),
    viewedAt: view?.viewedAt ?? null,
  };
}

export async function markLocalArticleViewed(articleId, authSession) {
  const userId = authSession?.user?.id ?? null;

  if (!articleId || !userId) {
    return null;
  }

  return withStoreMutation(async (store) => {
    cleanupExpiredSessions(store);

    const viewedAt = new Date().toISOString();
    const existingView = store.articleViews.find((item) => item.userId === userId && item.articleId === articleId);

    if (existingView) {
      existingView.viewedAt = viewedAt;
    } else {
      store.articleViews.push({
        userId,
        articleId,
        viewedAt,
      });
    }

    const user = store.users.find((item) => item.id === userId);
    if (user) {
      user.updatedAt = viewedAt;
    }

    return {
      userId,
      articleId,
      viewedAt,
      currentUser: toPublicUser(store, userId),
    };
  });
}

export async function changeLocalAuthPassword(authSession, payload) {
  const userId = authSession?.user?.id ?? null;

  if (!userId) {
    throw new Error('Authentication required.');
  }

  return withStoreMutation(async (store) => {
    cleanupExpiredSessions(store);

    const currentPassword = String(payload?.currentPassword ?? '');
    const nextPassword = String(payload?.nextPassword ?? '');

    if (!currentPassword) {
      throw new Error('Current password is required.');
    }

    validatePasswordValue(nextPassword);

    if (currentPassword === nextPassword) {
      throw new Error('New password must be different from current password.');
    }

    const user = store.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error('Authentication required.');
    }

    if (!verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
      throw new Error('Current password is incorrect.');
    }

    const now = new Date().toISOString();
    const passwordSalt = randomBytes(16).toString('hex');
    const passwordHash = hashPassword(nextPassword, passwordSalt);

    user.passwordSalt = passwordSalt;
    user.passwordHash = passwordHash;
    user.updatedAt = now;

    return toPublicUser(store, userId);
  });
}

function createLocalSession(store, userId, requestMetadata = {}) {
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + AUTH_SESSION_TTL_MS).toISOString();
  const sessionId = randomUUID();
  const sessionToken = randomBytes(32).toString('base64url');

  store.sessions.push({
    id: sessionId,
    userId,
    tokenHash: hashSessionToken(sessionToken),
    createdAt,
    expiresAt,
    lastSeenAt: createdAt,
    ipAddress: normalizeAuditValue(requestMetadata.ipAddress),
    userAgent: normalizeAuditValue(requestMetadata.userAgent),
  });

  return {
    expiresAt,
    sessionCookieValue: `${sessionId}.${sessionToken}`,
  };
}

function cleanupExpiredSessions(store) {
  const now = Date.now();
  store.sessions = store.sessions.filter((session) => {
    const expiresAt = Date.parse(session.expiresAt);
    return !Number.isNaN(expiresAt) && expiresAt > now;
  });
}

function buildViewsByArticleId(store, userId) {
  return new Map(
    store.articleViews
      .filter((view) => view.userId === userId)
      .map((view) => [view.articleId, view]),
  );
}

function toPublicUser(store, userId) {
  const user = store.users.find((item) => item.id === userId);
  if (!user) {
    return null;
  }

  const viewedCount = store.articleViews.filter((view) => view.userId === userId).length;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    viewedCount,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
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

function normalizeUserName(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
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
