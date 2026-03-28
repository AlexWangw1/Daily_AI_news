const ARXIV_API_BASE = 'https://export.arxiv.org/api/query';

function buildArxivQuery(category, maxResults = 20) {
  const params = new URLSearchParams({
    search_query: `cat:${category}`,
    start: '0',
    max_results: String(maxResults),
    sortBy: 'submittedDate',
    sortOrder: 'descending',
  });

  return `${ARXIV_API_BASE}?${params.toString()}`;
}

export const PAPER_SOURCES = [
  {
    id: 'arxiv-cs-ai',
    name: 'arXiv cs.AI',
    siteUrl: 'https://arxiv.org/list/cs.AI/recent',
    feedUrl: buildArxivQuery('cs.AI', 24),
    category: 'cs.AI',
  },
  {
    id: 'arxiv-cs-lg',
    name: 'arXiv cs.LG',
    siteUrl: 'https://arxiv.org/list/cs.LG/recent',
    feedUrl: buildArxivQuery('cs.LG', 24),
    category: 'cs.LG',
  },
  {
    id: 'arxiv-cs-cl',
    name: 'arXiv cs.CL',
    siteUrl: 'https://arxiv.org/list/cs.CL/recent',
    feedUrl: buildArxivQuery('cs.CL', 24),
    category: 'cs.CL',
  },
  {
    id: 'arxiv-cs-cv',
    name: 'arXiv cs.CV',
    siteUrl: 'https://arxiv.org/list/cs.CV/recent',
    feedUrl: buildArxivQuery('cs.CV', 24),
    category: 'cs.CV',
  },
  {
    id: 'arxiv-stat-ml',
    name: 'arXiv stat.ML',
    siteUrl: 'https://arxiv.org/list/stat.ML/recent',
    feedUrl: buildArxivQuery('stat.ML', 24),
    category: 'stat.ML',
  },
];
