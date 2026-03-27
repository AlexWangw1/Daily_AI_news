# Daily AI News

Local project for discovering, archiving, translating, and displaying the latest AI news.

## What It Includes

- `scripts/fetch-ai-news.mjs`
  Downloads RSS feeds, fetches the original article pages, extracts readable content, stores everything in SQLite, and translates the archived content to Chinese.
- `data/ai-news.db`
  Local SQLite database that stores article metadata, raw HTML, extracted text, and translated Chinese text.
- `src/server.mjs`
  Serves the frontend and exposes:
  - `GET /api/news`
  - `GET /api/news/:id`
- `public/`
  Compact frontend with a smaller hero, horizontal news cards, and a local Chinese reader view.

## Quick Start

```bash
npm install
npm run news:fetch
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Fast Refresh

If you want to skip translation and refresh as quickly as possible:

```bash
npm run news:fetch:fast
```

## Data Flow

1. RSS feeds are used to discover candidate articles.
2. Each article page is downloaded and archived locally.
3. Raw HTML and extracted article text are stored in SQLite.
4. The archived text is translated to Chinese.
5. The frontend loads the summary list from `/api/news`, then loads full local article content from `/api/news/:id`.
