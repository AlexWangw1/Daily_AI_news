import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createUserSession,
  getEmptyNewsPayload,
  loadUserSession,
  loadNewsArticle,
  loadNewsPayload,
  markNewsArticleViewed,
  selectUserSession,
} from './lib/server/news-store.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

const app = express();
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const USER_COOKIE_NAME = 'ai_news_user';

app.disable('x-powered-by');
app.use(express.json());

app.get('/api/session', async (req, res, next) => {
  try {
    const cookieUserId = getUserIdFromRequest(req);
    const session = await loadUserSession(cookieUserId);

    if (session.resolvedUserId && session.resolvedUserId !== cookieUserId) {
      setUserCookie(res, session.resolvedUserId);
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      currentUser: session.currentUser,
      users: session.users,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/users', async (req, res, next) => {
  try {
    const session = await createUserSession(req.body?.name);
    setUserCookie(res, session.resolvedUserId);
    res.setHeader('Cache-Control', 'no-store');
    res.status(201).json({
      currentUser: session.currentUser,
      users: session.users,
    });
  } catch (error) {
    if (error?.message === 'User name is required.') {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

app.post('/api/session', async (req, res, next) => {
  try {
    const session = await selectUserSession(req.body?.userId);

    if (!session) {
      res.status(404).json({ error: 'User Not Found' });
      return;
    }

    setUserCookie(res, session.resolvedUserId);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      currentUser: session.currentUser,
      users: session.users,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/news', async (_req, res, next) => {
  try {
    const payload = await loadNewsPayload(60, getUserIdFromRequest(_req));
    res.setHeader('Cache-Control', 'no-store');
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/news/:id', async (req, res, next) => {
  try {
    const article = await loadNewsArticle(req.params.id, getUserIdFromRequest(req));

    if (!article) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(article);
  } catch (error) {
    next(error);
  }
});

app.post('/api/news/:id/view', async (req, res, next) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      res.status(401).json({ error: 'User session required' });
      return;
    }

    const viewState = await markNewsArticleViewed(req.params.id, userId);

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
  res.status(500).json({
    error: 'Internal Server Error',
    payload: getEmptyNewsPayload(),
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Daily AI News running at http://localhost:${port}`);
});

function getUserIdFromRequest(req) {
  const cookieHeader = req.headers.cookie ?? '';
  const cookies = parseCookies(cookieHeader);
  return cookies[USER_COOKIE_NAME] ?? null;
}

function setUserCookie(res, userId) {
  res.append('Set-Cookie', `${USER_COOKIE_NAME}=${encodeURIComponent(userId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
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
