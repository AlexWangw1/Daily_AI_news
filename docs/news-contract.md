# AI News Data Contract

The project now stores archived articles in a local SQLite database and exposes two API layers:

- `GET /api/news`: summary list for the homepage
- `GET /api/news/:id`: full locally archived article

## Storage

- SQLite database: `data/ai-news.db`
- JSON mirror for debugging/fallback: `data/ai-news.json`

## Summary payload

```json
{
  "generatedAt": "2026-03-27T00:00:00.000Z",
  "total": 12,
  "sources": [
    {
      "id": "openai",
      "name": "OpenAI News",
      "siteUrl": "https://openai.com/news/"
    }
  ],
  "articles": [
    {
      "id": "openai-some-slug-or-hash",
      "title": "Example title",
      "titleZh": "Chinese translated title",
      "summary": "Short English summary.",
      "summaryZh": "Short Chinese summary.",
      "previewText": "Short preview extracted from the archived article.",
      "previewTextZh": "Chinese preview extracted from the archived article.",
      "url": "https://example.com/article",
      "sourceId": "openai",
      "sourceName": "OpenAI News",
      "publishedAt": "2026-03-27T00:00:00.000Z",
      "imageUrl": "https://example.com/image.jpg",
      "categories": [
        "research"
      ],
      "storedLocally": true
    }
  ]
}
```

## Article detail payload

```json
{
  "id": "openai-some-slug-or-hash",
  "title": "Example title",
  "titleZh": "Chinese translated title",
  "summary": "Short English summary.",
  "summaryZh": "Short Chinese summary.",
  "contentText": "Archived English article text.",
  "contentTextZh": "Archived Chinese article text.",
  "url": "https://example.com/article",
  "sourceId": "openai",
  "sourceName": "OpenAI News",
  "publishedAt": "2026-03-27T00:00:00.000Z",
  "imageUrl": "https://example.com/image.jpg",
  "categories": [
    "research"
  ],
  "storedLocally": true,
  "fetchedAt": "2026-03-27T00:00:00.000Z",
  "updatedAt": "2026-03-27T00:00:00.000Z"
}
```

## Notes

- RSS is only the discovery layer.
- The fetch script downloads each article page, extracts readable text, stores the raw HTML and extracted text in SQLite, then translates the archived text to Chinese.
- The frontend should prefer `titleZh`, `summaryZh`, `previewTextZh`, and `contentTextZh` when available.
