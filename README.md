# Daily AI News

Local project for discovering, archiving, translating, and displaying the latest AI news and AI papers.

## What It Includes

- `scripts/fetch-ai-news.mjs`
  Downloads RSS feeds, fetches the original article pages, extracts readable content, stores everything in PostgreSQL, and translates the archived content to Chinese.
- `scripts/fetch-ai-papers.mjs`
  Pulls the latest AI papers from arXiv category feeds, stores paper metadata and abstracts locally, and generates Chinese-friendly paper summaries for the frontend.
- `scripts/migrate-legacy-data.mjs`
  Migrates the old local SQLite or JSON archive into PostgreSQL so you do not need to rebuild history from scratch.
- `src/server.mjs`
  Serves the frontend and exposes:
  - `GET /api/news`
  - `GET /api/news/:id`
  - `GET /api/papers`
  - `GET /api/papers/:id`
- `public/`
  Compact frontend with separate login/register pages, horizontal news cards, horizontal paper cards, and local Chinese reader views.

## Quick Start

```bash
npm install
npm run db:up
npm run news:fetch
npm run papers:fetch
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a `.env` file based on `.env.example` before running production-style flows:

```bash
copy .env.example .env
```

## Fast Refresh

If you want to skip translation and refresh as quickly as possible:

```bash
npm run news:fetch:fast
npm run papers:fetch:fast
```

## Migrate Old SQLite Data

If you already have an old `data/ai-news.db` or `data/ai-news.json`, you can import it into PostgreSQL:

```bash
npm run db:up
npm run db:migrate:legacy
```

The migration script will:

1. Prefer `data/ai-news.db` when it exists.
2. Fall back to `data/ai-news.json` if no SQLite file is found.
3. Migrate sources, articles, metadata, users, article view records, and auth sessions when available.

## Data Flow

1. RSS feeds are used to discover candidate news articles.
2. arXiv category feeds are used to discover candidate AI papers.
3. News pages are downloaded and archived locally; paper metadata and abstracts are archived locally.
4. Archived content is rewritten into Chinese for faster reading.
5. The frontend loads `/api/news` and `/api/papers`, then requests full local details from `/api/news/:id` and `/api/papers/:id`.
