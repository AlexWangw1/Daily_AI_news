import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import './lib/env/load-env.mjs';
import {
  changeAccountPassword,
  getEmptyNewsPayload,
  loadAccountProfile,
  loadAuthSession,
  loadNewsArticle,
  loadNewsPayload,
  loadPaperArticle,
  loadPaperPayload,
  loginAuthUser,
  logoutAuthUser,
  markNewsArticleViewed,
  registerAuthUser,
} from './lib/server/news-store.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const NEWS_LIST_LIMIT = 80;
const shouldUseSecureCookies = process.env.SESSION_COOKIE_SECURE === 'true'
  || process.env.NODE_ENV === 'production';

const app = express();
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const SESSION_COOKIE_NAME = 'ai_news_session';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json());

app.get('/api/auth/session', async (req, res, next) => {
  try {
    const authSession = await getRequestAuthSession(req);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      authenticated: authSession.authenticated,
      user: authSession.user,
      expiresAt: authSession.expiresAt,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const authSession = await registerAuthUser(req.body, getRequestMetadata(req));
    setSessionCookie(res, authSession.sessionCookieValue);
    res.setHeader('Cache-Control', 'no-store');
    res.status(201).json({
      authenticated: true,
      user: authSession.user,
      expiresAt: authSession.expiresAt,
    });
  } catch (error) {
    if (isAuthValidationError(error)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const authSession = await loginAuthUser(req.body, getRequestMetadata(req));

    if (!authSession) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    setSessionCookie(res, authSession.sessionCookieValue);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      authenticated: true,
      user: authSession.user,
      expiresAt: authSession.expiresAt,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', async (req, res, next) => {
  try {
    const sessionCookieValue = getSessionCookieValue(req);
    await logoutAuthUser(sessionCookieValue);
    clearSessionCookie(res);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/account', async (req, res, next) => {
  try {
    const authSession = await getRequestAuthSession(req);

    if (!authSession.authenticated) {
      res.status(401).json({ error: 'Authentication Required' });
      return;
    }

    const profile = await loadAccountProfile(authSession);

    if (!profile) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

app.post('/api/account/password', async (req, res, next) => {
  try {
    const authSession = await getRequestAuthSession(req);

    if (!authSession.authenticated) {
      res.status(401).json({ error: 'Authentication Required' });
      return;
    }

    const profile = await changeAccountPassword(authSession, req.body);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      user: profile.user,
      security: profile.security,
    });
  } catch (error) {
    if (isAuthValidationError(error)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

app.get('/api/news', async (req, res, next) => {
  try {
    const authSession = await getRequestAuthSession(req);
    const payload = await loadNewsPayload(NEWS_LIST_LIMIT, authSession);
    res.setHeader('Cache-Control', 'no-store');
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/papers', async (req, res, next) => {
  try {
    const authSession = await getRequestAuthSession(req);
    const payload = await loadPaperPayload(NEWS_LIST_LIMIT, authSession);
    res.setHeader('Cache-Control', 'no-store');
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/news/:id', async (req, res, next) => {
  try {
    const authSession = await getRequestAuthSession(req);
    const result = await loadNewsArticle(req.params.id, authSession);

    if (result.errorCode === 'AUTH_REQUIRED') {
      res.status(401).json({
        error: 'Authentication Required',
        previewArticleId: result.previewArticleId,
      });
      return;
    }

    if (!result.article) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(result.article);
  } catch (error) {
    next(error);
  }
});

app.get('/api/papers/:id', async (req, res, next) => {
  try {
    const authSession = await getRequestAuthSession(req);
    const result = await loadPaperArticle(req.params.id, authSession);

    if (result.errorCode === 'AUTH_REQUIRED') {
      res.status(401).json({
        error: 'Authentication Required',
        previewArticleId: result.previewArticleId,
      });
      return;
    }

    if (!result.article) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(result.article);
  } catch (error) {
    next(error);
  }
});

app.post('/api/news/:id/view', async (req, res, next) => {
  try {
    const authSession = await getRequestAuthSession(req);

    if (!authSession.authenticated) {
      res.status(401).json({ error: 'Authentication Required' });
      return;
    }

    const viewState = await markNewsArticleViewed(req.params.id, authSession);

    if (!viewState) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(viewState);
  } catch (error) {
    next(error);
  }
});

app.post('/api/papers/:id/view', async (req, res, next) => {
  try {
    const authSession = await getRequestAuthSession(req);

    if (!authSession.authenticated) {
      res.status(401).json({ error: 'Authentication Required' });
      return;
    }

    const viewState = await markNewsArticleViewed(req.params.id, authSession);

    if (!viewState) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(viewState);
  } catch (error) {
    next(error);
  }
});

app.use(express.static(publicDir, { extensions: ['html'] }));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'), (error) => {
    if (error) {
      res.status(error.code === 'ENOENT' ? 404 : 500).type('text/plain').send('Daily AI News');
    }
  });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not Found', payload: getEmptyNewsPayload() });
    return;
  }

  res.status(404).type('text/plain').send('Not Found');
});

app.use((error, _req, res, _next) => {
  console.error('[server] Unhandled error:', error);

  if (isDatabaseUnavailableError(error)) {
    res.status(503).json({
      error: 'Database Unavailable',
      detail: 'PostgreSQL is not configured or not reachable.',
      payload: getEmptyNewsPayload(),
    });
    return;
  }

  res.status(500).json({
    error: 'Internal Server Error',
    payload: getEmptyNewsPayload(),
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Daily AI News running at http://localhost:${port}`);
});

async function getRequestAuthSession(req) {
  const sessionCookieValue = getSessionCookieValue(req);
  const authSession = await loadAuthSession(sessionCookieValue);

  return {
    ...authSession,
    sessionCookieValue,
  };
}

function getRequestMetadata(req) {
  return {
    ipAddress: getRemoteAddress(req),
    userAgent: req.headers['user-agent'] ?? '',
  };
}

function getRemoteAddress(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return forwardedFor || req.socket.remoteAddress || '';
}

function getSessionCookieValue(req) {
  const cookieHeader = req.headers.cookie ?? '';
  const cookies = parseCookies(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] ?? '';
}

function setSessionCookie(res, sessionCookieValue) {
  const secureFlag = shouldUseSecureCookies ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionCookieValue)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secureFlag}`,
  );
}

function clearSessionCookie(res) {
  const secureFlag = shouldUseSecureCookies ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`,
  );
}

function parseCookies(cookieHeader) {
  return String(cookieHeader)
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf('=');

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function isAuthValidationError(error) {
  return [
    'Authentication required.',
    'Name is required.',
    'Valid email is required.',
    'Password must be at least 8 characters.',
    'Password must include letters and numbers.',
    'Email already registered.',
    'Name already registered.',
    'Current password is required.',
    'Current password is incorrect.',
    'New password must be different from current password.',
  ].includes(error?.message);
}

function isDatabaseUnavailableError(error) {
  return error?.message === 'DATABASE_URL is required for PostgreSQL storage.'
    || ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error?.code);
}
