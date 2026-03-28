const $ = (selector, root = document) => root.querySelector(selector);

const globalElements = {
  brandLabel: $('#brand-label'),
  authStatus: $('#auth-status'),
  authOpenButton: $('#auth-open-button'),
  authRegisterButton: $('#auth-register-button'),
  accountButton: $('#account-button'),
  logoutButton: $('#logout-button'),
  refreshButton: $('#refresh-button'),
  feedSwitchButtons: Array.from(document.querySelectorAll('[data-action="show-feed"]')),
  feedMetaLabels: Array.from(document.querySelectorAll('[data-feed-meta]')),
  feedCountBadges: Array.from(document.querySelectorAll('[data-feed-count]')),
};

const ui = {
  brand: 'AI 新闻与论文归档',
  authGuestStatus: '游客模式',
  authUserStatus: '已登录 · {name}',
  authOpen: '登录',
  authRegister: '注册',
  accountCenter: '用户中心',
  logout: '退出登录',
  refresh: '刷新内容',
  refreshing: '刷新中…',
  prevPage: '上一组',
  nextPage: '下一组',
  easyReadKicker: '通俗版速读',
  easyReadTitle: '先用大白话看懂，再决定要不要继续细读',
  easySummaryTitle: '一句话说明',
  easyWhyTitle: '为什么重要',
  easyPointsTitle: '核心看点',
  easyGlossaryTitle: '名词解释',
  easyReadFallback: '这篇内容还没有生成通俗版重写，可以直接阅读下方正文。',
  loadingLabel: '加载中',
  errorLabel: '加载失败',
  fallbackTitle: '暂无标题',
  readerSummaryFallback: '这条内容暂时没有可用摘要。',
  readerViewedSeen: '这篇内容你已看过',
  readerViewedSeenAt: '这篇内容你已于 {time} 看过',
  readerViewedUnseen: '登录后会记录“已看过”状态',
  readerViewedGuest: '当前为游客预览模式',
  readerBodyLoading: '正在读取本地归档内容…',
  readStatusSeen: '已看过',
  readStatusUnread: '未看',
  cardStored: '已归档',
  cardSummaryOnly: '摘要版',
  cardLocked: '登录解锁',
  cardPreview: '预览可读',
  unknownTime: '时间未知',
  unknownSource: '未知来源',
  readerMetaSep: ' / ',
};

const categoryMap = {
  ai: '人工智能',
  'ai agents': 'AI 智能体',
  'agentic ai': '智能体 AI',
  applications: '应用',
  'artificial intelligence': '人工智能',
  company: '公司',
  research: '研究',
  technology: '技术',
  'tech news': '科技新闻',
  'open source': '开源',
  startups: '创业公司',
  security: '安全',
  'ai-paper': 'AI 论文',
  'cs.ai': 'AI 理论',
  'cs.lg': '机器学习',
  'cs.cl': '自然语言处理',
  'cs.cv': '计算机视觉',
  'stat.ml': '统计机器学习',
};

const LANDSCAPE_COPY = {
  kicker: 'AI 发展脉络图',
  newsTitle: '把这篇新闻放回整个 AI 发展地图里',
  papersTitle: '把这篇论文放回整个 AI 研究与产业地图里',
  timelineKicker: '时间维度',
  newsTimelineTitle: '沿着时间看这条主线最近怎么演进',
  papersTimelineTitle: '沿着时间看这条研究主线如何推进',
  timelineEmpty: '当前样本里同主线内容还不多，后续抓取更多内容后，这里会更完整地展示演进路径。',
  timelineCurrent: '当前节点',
  timelineEarlier: '更早动态',
  timelineLater: '后续演进',
  timelineRange: '时间范围',
  hubLabel: '当前内容定位',
  activeStatus: '当前焦点',
  relatedStatus: '连带影响',
  backgroundStatus: '长期主线',
  empty: '当前文章信息较少，先用标题、摘要和分类标出它在 AI 版图中的位置。',
};

const LANDSCAPE_BRANCHES = [
  {
    key: 'research',
    label: '研究前沿',
    summary: '新方法、新数据与新评测，决定下一轮能力上限。',
    keywords: ['paper', 'arxiv', 'research', 'study', 'benchmark', 'dataset', 'method', 'evaluation', '论文', '研究', '数据集', '评测', '方法', '实验'],
    backgroundNodes: ['方法创新', '数据与评测', '开源复现'],
    relatedNodes: ['等待模型吸收', '观察同行复现', '看能否走向产品'],
  },
  {
    key: 'models',
    label: '模型能力',
    summary: '模型理解、推理、多模态和生成能力的升级路线。',
    keywords: ['model', 'llm', 'reasoning', 'multimodal', 'inference', 'agent', 'language model', '模型', '推理', '多模态', '生成', '智能体', '语音模型'],
    backgroundNodes: ['能力上限', '推理与多模态', '模型路线'],
    relatedNodes: ['能力能否转成产品', '训练成本变化', '生态是否跟进'],
  },
  {
    key: 'product',
    label: '产品落地',
    summary: '从能力到工具、工作流和企业采用，是扩散速度的关键。',
    keywords: ['product', 'release', 'launch', 'rollout', 'api', 'assistant', 'workflow', 'customer', 'enterprise', '应用', '产品', '上线', '工具', '开发者', '企业'],
    backgroundNodes: ['产品上线', '工作流改造', '企业采用'],
    relatedNodes: ['用户价值是否明确', '能否稳定交付', '是否形成规模使用'],
  },
  {
    key: 'infrastructure',
    label: '算力与基础设施',
    summary: '芯片、云平台、训练与推理成本，决定技术扩散的速度和边界。',
    keywords: ['chip', 'gpu', 'cloud', 'compute', 'inference cost', 'latency', 'datacenter', 'aws', 'azure', 'nvidia', 'amd', '芯片', '算力', '云', '部署', '延迟', '推理成本'],
    backgroundNodes: ['芯片与云', '训练/推理成本', '部署效率'],
    relatedNodes: ['供给是否跟上', '延迟和成本是否下降', '平台能力是否完善'],
  },
  {
    key: 'governance',
    label: '监管与安全',
    summary: '政策、法院、安全与责任边界，决定 AI 何时能上线、如何上线。',
    keywords: ['regulation', 'policy', 'court', 'judge', 'ban', 'safety', 'privacy', 'security', 'governance', '监管', '政策', '法院', '政府', '安全', '隐私', '禁令'],
    backgroundNodes: ['政策与法院', '隐私与安全', '合规边界'],
    relatedNodes: ['上线节奏受影响', '合作边界变化', '风险披露增加'],
  },
  {
    key: 'ecosystem',
    label: '产业竞争',
    summary: '公司竞争、合作并购和市场格局，决定资源如何重新分配。',
    keywords: ['company', 'startup', 'funding', 'market', 'partnership', 'acquisition', 'competition', 'anthropic', 'openai', 'google', 'meta', '融资', '公司', '合作', '并购', '市场', '竞争'],
    backgroundNodes: ['公司竞争', '合作并购', '资本与市场'],
    relatedNodes: ['行业格局变化', '平台控制力变化', '下一轮合作对象'],
  },
];

const LANDSCAPE_RELATIONS = {
  research: ['models', 'product'],
  models: ['research', 'product', 'infrastructure'],
  product: ['models', 'ecosystem', 'governance'],
  infrastructure: ['models', 'product', 'ecosystem'],
  governance: ['product', 'ecosystem', 'research'],
  ecosystem: ['product', 'infrastructure', 'governance'],
};

const FEED_DEFINITIONS = [
  {
    key: 'news',
    apiBase: '/api/news',
    itemUnit: '条',
    moduleKicker: '新闻模块',
    moduleTitle: '最新 AI 新闻',
    moduleBody:
      '抓取公开信息源、下载正文、转成中文后在本地归档。先横向挑选，再在下方阅读完整内容。',
    railKicker: '每次 10 条横向切换',
    railTitle: '快速浏览新闻卡片，点击后在下方打开本地归档正文。',
    readerKicker: '本地归档新闻正文',
    loadingTitle: '正在读取最新 AI 新闻…',
    loadingBody: '新闻列表会先加载摘要，随后补全本地归档正文。',
    emptyTitle: '当前还没有可展示的 AI 新闻。',
    emptyBody: '先运行 `npm run news:fetch` 把新闻抓取、归档并翻译到本地。',
    errorTitle: '暂时无法读取 AI 新闻列表。',
    errorBody: '请确认抓取脚本已经执行，或本地服务与数据库可正常访问。',
    archiveReady: '原文已下载并存入本地归档',
    archivePending: '当前仅保留摘要，尚未抓到完整正文',
  },
  {
    key: 'papers',
    apiBase: '/api/papers',
    itemUnit: '篇',
    moduleKicker: '论文模块',
    moduleTitle: '最新 AI 论文',
    moduleBody:
      '接入 arXiv 最新论文流，归档题目、摘要、分类与中文重写。展示结构与新闻保持一致，方便连续浏览。',
    railKicker: '每次 10 篇横向切换',
    railTitle: '先快速扫过论文卡片，再在下方阅读中文摘要、研究要点和原始链接。',
    readerKicker: '本地归档论文摘要',
    loadingTitle: '正在读取最新 AI 论文…',
    loadingBody: '论文列表会先展示卡片，随后补全本地归档的中文摘要详情。',
    emptyTitle: '当前还没有可展示的 AI 论文。',
    emptyBody: '先运行 `npm run papers:fetch` 把论文摘要归档到本地。',
    errorTitle: '暂时无法读取 AI 论文列表。',
    errorBody: '请确认论文抓取脚本已经执行，或本地服务与数据库可正常访问。',
    archiveReady: '论文摘要与元数据已存入本地归档',
    archivePending: '当前仅保留论文概要，尚未生成完整归档',
  },
];

const PAGE_SIZE = 10;
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Shanghai',
});

const feedModules = FEED_DEFINITIONS.map(createFeedModule);

let authState = {
  authenticated: false,
  user: null,
  expiresAt: null,
};
let currentFeedKey = 'news';
let feedAnimationFrame = 0;

function createFeedModule(definition) {
  const root = document.querySelector(`[data-feed="${definition.key}"]`);

  return {
    definition,
    root,
    payload: null,
    currentArticleId: null,
    currentPageIndex: 0,
    detailRequestToken: 0,
    detailCache: new Map(),
    isSyncingRailScroll: false,
    elements: {
      moduleKicker: queryRole(root, 'module-kicker'),
      moduleTitle: queryRole(root, 'module-title'),
      moduleBody: queryRole(root, 'module-body'),
      statusPanel: queryRole(root, 'status-panel'),
      statusLabel: queryRole(root, 'status-label'),
      statusTitle: queryRole(root, 'status-title'),
      statusBody: queryRole(root, 'status-body'),
      railKicker: queryRole(root, 'rail-kicker'),
      railTitle: queryRole(root, 'rail-title'),
      railCount: queryRole(root, 'rail-count'),
      prevPageButton: queryAction(root, 'prev-page'),
      nextPageButton: queryAction(root, 'next-page'),
      railScrollbar: queryRole(root, 'rail-scrollbar'),
      railScrollbarSpacer: queryRole(root, 'rail-scrollbar-spacer'),
      rail: queryRole(root, 'rail'),
      readerPanel: queryRole(root, 'reader-panel'),
      readerVisual: queryRole(root, 'reader-visual'),
      readerImage: queryRole(root, 'reader-image'),
      readerKicker: queryRole(root, 'reader-kicker'),
      readerTitle: queryRole(root, 'reader-title'),
      readerMeta: queryRole(root, 'reader-meta'),
      readerArchive: queryRole(root, 'reader-archive'),
      readerViewed: queryRole(root, 'reader-viewed'),
      readerSummary: queryRole(root, 'reader-summary'),
      easyReadPanel: queryRole(root, 'easy-read-panel'),
      easyReadKicker: queryRole(root, 'easy-read-kicker'),
      easyReadTitle: queryRole(root, 'easy-read-title'),
      easySummaryTitle: queryRole(root, 'easy-summary-title'),
      easySummaryText: queryRole(root, 'easy-summary-text'),
      easyWhyTitle: queryRole(root, 'easy-why-title'),
      easyWhyText: queryRole(root, 'easy-why-text'),
      easyPointsTitle: queryRole(root, 'easy-points-title'),
      easyPointsList: queryRole(root, 'easy-points-list'),
      easyGlossaryCard: queryRole(root, 'easy-glossary-card'),
      easyGlossaryTitle: queryRole(root, 'easy-glossary-title'),
      easyGlossaryList: queryRole(root, 'easy-glossary-list'),
      readerBody: queryRole(root, 'reader-body'),
      knowledgeMapPanel: queryRole(root, 'knowledge-map-panel'),
      knowledgeMapKicker: queryRole(root, 'knowledge-map-kicker'),
      knowledgeMapTitle: queryRole(root, 'knowledge-map-title'),
      knowledgeMapCanvas: queryRole(root, 'knowledge-map-canvas'),
      knowledgeTimelinePanel: queryRole(root, 'knowledge-timeline-panel'),
      knowledgeTimelineKicker: queryRole(root, 'knowledge-timeline-kicker'),
      knowledgeTimelineTitle: queryRole(root, 'knowledge-timeline-title'),
      knowledgeTimelineSummary: queryRole(root, 'knowledge-timeline-summary'),
      knowledgeTimelineTrack: queryRole(root, 'knowledge-timeline-track'),
    },
  };
}

function queryRole(root, role) {
  return root?.querySelector(`[data-role="${role}"]`) ?? null;
}

function queryAction(root, action) {
  return root?.querySelector(`[data-action="${action}"]`) ?? null;
}

function normalizeFeedKey(value) {
  return FEED_DEFINITIONS.some((definition) => definition.key === value) ? value : 'news';
}

function getFeedSwitchButton(feedKey) {
  return globalElements.feedSwitchButtons.find((button) => button.dataset.feedTarget === feedKey) || null;
}

function getFeedMetaLabel(feedKey) {
  return globalElements.feedMetaLabels.find((label) => label.dataset.feedMeta === feedKey) || null;
}

function getFeedCountBadge(feedKey) {
  return globalElements.feedCountBadges.find((badge) => badge.dataset.feedCount === feedKey) || null;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

function formatDate(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? ui.unknownTime : dateFormatter.format(date);
}

function looksLikeChineseText(value) {
  const text = String(value || '').trim();
  const matches = text.match(/[\u3400-\u9fff]/g) || [];
  return matches.length >= Math.max(4, Math.ceil(text.length * 0.12));
}

function getEasyReadLead(article) {
  const plainSummary = String(article?.easyRead?.plainSummary || '').trim();
  if (!looksLikeChineseText(plainSummary)) {
    return '';
  }

  return plainSummary
    .replace(/^简单说，这篇内容讲的是[:：]\s*/u, '')
    .replace(/[。！？\s]*$/u, '')
    .trim();
}

function looksLikeNarrativeTitle(value) {
  const text = String(value || '').trim();

  if (!text) {
    return false;
  }

  return /^(简单说|通俗讲|一句话说明|这篇(新闻|报道|文章|论文)|为什么重要|发生了什么|论文标题|中文摘要)[：:]/u.test(text)
    || text.includes('这篇新闻讲的是')
    || text.includes('这篇论文讲的是');
}

function normalizeDisplayTitleCandidate(value) {
  return String(value || '')
    .replace(/^[“"'`]+|[”"'`]+$/gu, '')
    .trim();
}

function normalizeChineseHeadlineText(value) {
  return String(value || '')
    .replace(/^(简单说|通俗讲|一句话说明|这篇(新闻|报道|文章)|为什么重要|发生了什么|重点看清|重点看|中文摘要)[：:]\s*/u, '')
    .replace(/^据[^，。]{2,18}[，,]\s*/u, '')
    .replace(/^(今天|近日|目前|现在|最新)\s*/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function cutChineseHeadline(value, maxLength = 34) {
  const text = normalizeChineseHeadlineText(value)
    .replace(/[。！？；;：:\s]*$/u, '')
    .trim();

  if (!text) {
    return '';
  }

  const sentenceParts = text
    .split(/[。！？；;]/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const firstSentence = sentenceParts[0] || text;
  const headline = firstSentence.length > maxLength
    ? `${firstSentence.slice(0, maxLength).trimEnd()}…`
    : firstSentence;

  return headline
    .replace(/[，、,:：\s]*$/u, '')
    .trim();
}

function buildChineseNewsTitle(article) {
  const translatedTitle = normalizeDisplayTitleCandidate(article?.titleZh);
  if (looksLikeChineseText(translatedTitle) && !looksLikeNarrativeTitle(translatedTitle)) {
    return cutChineseHeadline(translatedTitle, 42);
  }

  const chineseFallbackSources = [
    article?.summaryZh,
    getEasyReadLead(article),
    article?.previewTextZh,
    article?.easyRead?.whyItMatters,
    safeArray(article?.easyRead?.keyTakeaways)[0],
  ];

  for (const source of chineseFallbackSources) {
    if (!looksLikeChineseText(source)) {
      continue;
    }

    const headline = cutChineseHeadline(source, 30);
    if (headline && !looksLikeNarrativeTitle(headline)) {
      return headline;
    }
  }

  return '';
}

function getDisplayTitle(article) {
  if (article?.contentType === 'news') {
    const chineseNewsTitle = buildChineseNewsTitle(article);
    if (chineseNewsTitle) {
      return chineseNewsTitle;
    }
  }

  const candidates = [
    normalizeDisplayTitleCandidate(article?.titleZh),
    normalizeDisplayTitleCandidate(article?.title),
    normalizeDisplayTitleCandidate(article?.summaryZh),
    normalizeDisplayTitleCandidate(article?.summary),
    normalizeDisplayTitleCandidate(getEasyReadLead(article)),
  ];

  for (const candidate of candidates) {
    if (!candidate || looksLikeNarrativeTitle(candidate)) {
      continue;
    }

    return candidate;
  }

  return candidates.find(Boolean) || ui.fallbackTitle;
}

function getDisplaySummary(article) {
  return (looksLikeChineseText(article?.summaryZh?.trim()) ? article?.summaryZh?.trim() : '')
    || article?.easyRead?.whyItMatters?.trim()
    || article?.summaryZh?.trim()
    || article?.summary?.trim()
    || article?.previewTextZh?.trim()
    || article?.previewText?.trim()
    || ui.readerSummaryFallback;
}

function translateCategory(value) {
  const key = String(value || '').toLowerCase();
  return categoryMap[key] || value || '';
}

function articleBadge(article) {
  const categories = safeArray(article?.categories).map(translateCategory).filter(Boolean);
  return categories[0] || (article?.storedLocally ? ui.cardStored : ui.cardSummaryOnly);
}

function normalizeInsightText(value) {
  return String(value || '')
    .replace(/^(简单说|通俗讲|一句话说明|为什么重要|发生了什么|重点看清|重点看|论文标题|中文摘要)[：:]\s*/u, '')
    .replace(/[。！？；;、\s]*$/u, '')
    .trim();
}

function dedupeTextList(values) {
  const seen = new Set();
  const unique = [];

  for (const value of values) {
    const text = normalizeInsightText(value);
    const key = text.toLowerCase();

    if (!text || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(text);
  }

  return unique;
}

function clipText(value, maxLength = 34) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  return text.length > maxLength
    ? `${text.slice(0, maxLength - 1).trimEnd()}…`
    : text;
}

function getKnowledgeSourceText(article) {
  return [
    article?.titleZh,
    article?.title,
    article?.summaryZh,
    article?.summary,
    article?.easyRead?.plainSummary,
    article?.easyRead?.whyItMatters,
    ...safeArray(article?.easyRead?.keyTakeaways),
    ...safeArray(article?.categories),
    article?.sourceName,
  ].join(' ').toLowerCase();
}

function scoreLandscapeBranch(branch, article) {
  const text = getKnowledgeSourceText(article);
  const categoryText = safeArray(article?.categories).join(' ').toLowerCase();
  const titleText = [article?.titleZh, article?.title].join(' ').toLowerCase();

  let score = article?.contentType === 'papers' && branch.key === 'research' ? 2 : 0;

  for (const keyword of branch.keywords) {
    const normalizedKeyword = String(keyword || '').toLowerCase();

    if (!normalizedKeyword) {
      continue;
    }

    if (categoryText.includes(normalizedKeyword)) {
      score += 3;
    }

    if (titleText.includes(normalizedKeyword)) {
      score += 2;
    }

    if (text.includes(normalizedKeyword)) {
      score += 1;
    }
  }

  return score;
}

function getDefaultLandscapeBranchKey(article) {
  return article?.contentType === 'papers' ? 'research' : 'product';
}

function getRelatedLandscapeKeys(activeBranchKey) {
  return LANDSCAPE_RELATIONS[activeBranchKey] || [];
}

function getPublishedTimestamp(article) {
  const timestamp = Date.parse(article?.publishedAt || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function resolveLandscapePosition(article) {
  const scoredBranches = LANDSCAPE_BRANCHES.map((branch) => ({
    ...branch,
    score: scoreLandscapeBranch(branch, article),
  }));
  const activeBranch = scoredBranches
    .sort((left, right) => right.score - left.score)[0];
  const activeBranchKey = activeBranch?.score > 0
    ? activeBranch.key
    : getDefaultLandscapeBranchKey(article);
  const resolvedActiveBranch = LANDSCAPE_BRANCHES.find((branch) => branch.key === activeBranchKey) || LANDSCAPE_BRANCHES[0];
  const relatedBranchKeys = getRelatedLandscapeKeys(activeBranchKey);

  return {
    activeBranchKey,
    resolvedActiveBranch,
    relatedBranchKeys,
  };
}

function extractLandscapeHighlights(article) {
  return dedupeTextList([
    ...safeArray(article?.easyRead?.keyTakeaways),
    article?.easyRead?.plainSummary,
    article?.easyRead?.whyItMatters,
    article?.summaryZh,
    article?.summary,
  ]).map((item) => clipText(item, 32));
}

function buildLandscapeBranchNodes(branch, article, activeBranchKey, relatedBranchKeys, highlights) {
  if (branch.key === activeBranchKey) {
    return dedupeTextList([
      ...highlights,
      safeArray(article?.categories).map(translateCategory).filter(Boolean).join(' / '),
      article?.sourceName ? `来源：${article.sourceName}` : '',
    ]).map((item) => clipText(item, 34)).slice(0, 3);
  }

  if (relatedBranchKeys.includes(branch.key)) {
    return branch.relatedNodes.slice(0, 3);
  }

  return branch.backgroundNodes.slice(0, 3);
}

function buildKnowledgeMap(article) {
  if (!article) {
    return null;
  }

  const {
    activeBranchKey,
    resolvedActiveBranch,
    relatedBranchKeys,
  } = resolveLandscapePosition(article);
  const relatedLabels = relatedBranchKeys
    .map((branchKey) => LANDSCAPE_BRANCHES.find((branch) => branch.key === branchKey)?.label)
    .filter(Boolean)
    .slice(0, 2);
  const highlights = extractLandscapeHighlights(article);
  const hubTitle = `当前重点：${resolvedActiveBranch.label}`;
  const hubSummary = relatedLabels.length > 0
    ? `这篇${article?.contentType === 'papers' ? '论文' : '新闻'}当前主要落在「${resolvedActiveBranch.label}」分支，并会继续影响 ${relatedLabels.join('、')}。`
    : `这篇${article?.contentType === 'papers' ? '论文' : '新闻'}当前主要落在「${resolvedActiveBranch.label}」分支。`;

  return {
    hubTitle,
    hubTopic: clipText(getDisplayTitle(article), 56),
    hubSummary,
    branches: LANDSCAPE_BRANCHES.map((branch) => ({
      key: branch.key,
      label: branch.label,
      summary: branch.summary,
      status: branch.key === activeBranchKey
        ? LANDSCAPE_COPY.activeStatus
        : (relatedBranchKeys.includes(branch.key) ? LANDSCAPE_COPY.relatedStatus : LANDSCAPE_COPY.backgroundStatus),
      active: branch.key === activeBranchKey,
      related: relatedBranchKeys.includes(branch.key),
      nodes: buildLandscapeBranchNodes(branch, article, activeBranchKey, relatedBranchKeys, highlights),
    })),
  };
}

function getTimelineInsight(article) {
  return clipText(
    normalizeInsightText(
      article?.easyRead?.plainSummary
      || article?.easyRead?.whyItMatters
      || safeArray(article?.easyRead?.keyTakeaways)[0]
      || article?.summaryZh
      || article?.summary
      || article?.previewTextZh
      || article?.previewText,
    ),
    60,
  );
}

function getTimelineRangeLabel(entries) {
  if (entries.length === 0) {
    return '';
  }

  const first = entries[0];
  const last = entries[entries.length - 1];
  const firstLabel = formatDate(first.publishedAt);
  const lastLabel = formatDate(last.publishedAt);

  return first.id === last.id
    ? `时间范围：${firstLabel}`
    : `时间范围：${firstLabel} 至 ${lastLabel}`;
}

function buildTimelineEntries(module, article) {
  const position = resolveLandscapePosition(article);
  const currentTimestamp = getPublishedTimestamp(article);
  const pool = safeArray(module.payload?.articles);
  const relatedPool = pool
    .filter((item) => item?.id && item.id !== article.id)
    .map((item) => ({ article: item, position: resolveLandscapePosition(item) }));
  const sameBranch = relatedPool
    .filter((item) => item.position.activeBranchKey === position.activeBranchKey)
    .sort((left, right) => getPublishedTimestamp(left.article) - getPublishedTimestamp(right.article));
  const older = sameBranch
    .filter((item) => getPublishedTimestamp(item.article) < currentTimestamp)
    .slice(-2)
    .map((item) => item.article);
  const newer = sameBranch
    .filter((item) => getPublishedTimestamp(item.article) > currentTimestamp)
    .slice(0, 2)
    .map((item) => item.article);

  return {
    branchLabel: position.resolvedActiveBranch.label,
    entries: [...older, article, ...newer].map((item) => ({
      id: item.id,
      title: getDisplayTitle(item),
      publishedAt: item.publishedAt,
      sourceName: item.sourceName || ui.unknownSource,
      insight: getTimelineInsight(item),
      state: item.id === article.id
        ? LANDSCAPE_COPY.timelineCurrent
        : (getPublishedTimestamp(item) < currentTimestamp ? LANDSCAPE_COPY.timelineEarlier : LANDSCAPE_COPY.timelineLater),
      active: item.id === article.id,
    })),
  };
}

function setStaticCopy() {
  document.title = ui.brand;
  globalElements.brandLabel.textContent = ui.brand;
  globalElements.refreshButton.textContent = ui.refresh;
  globalElements.authOpenButton.textContent = ui.authOpen;
  globalElements.authRegisterButton.textContent = ui.authRegister;
  globalElements.accountButton.textContent = ui.accountCenter;
  globalElements.logoutButton.textContent = ui.logout;
  getFeedMetaLabel('news').textContent = '最新归档';
  getFeedMetaLabel('papers').textContent = '最新归档';
  getFeedCountBadge('news').textContent = '--';
  getFeedCountBadge('papers').textContent = '--';

  for (const module of feedModules) {
    const { definition, elements } = module;
    elements.moduleKicker.textContent = definition.moduleKicker;
    elements.moduleTitle.textContent = definition.moduleTitle;
    elements.moduleBody.textContent = definition.moduleBody;
    elements.railKicker.textContent = definition.railKicker;
    elements.railTitle.textContent = definition.railTitle;
    elements.prevPageButton.textContent = ui.prevPage;
    elements.nextPageButton.textContent = ui.nextPage;
    elements.readerKicker.textContent = definition.readerKicker;
    elements.easyReadKicker.textContent = ui.easyReadKicker;
    elements.easyReadTitle.textContent = ui.easyReadTitle;
    elements.easySummaryTitle.textContent = ui.easySummaryTitle;
    elements.easyWhyTitle.textContent = ui.easyWhyTitle;
    elements.easyPointsTitle.textContent = ui.easyPointsTitle;
    elements.easyGlossaryTitle.textContent = ui.easyGlossaryTitle;
    elements.knowledgeMapKicker.textContent = LANDSCAPE_COPY.kicker;
    elements.knowledgeMapTitle.textContent = definition.key === 'papers'
      ? LANDSCAPE_COPY.papersTitle
      : LANDSCAPE_COPY.newsTitle;
    elements.knowledgeTimelineKicker.textContent = LANDSCAPE_COPY.timelineKicker;
    elements.knowledgeTimelineTitle.textContent = definition.key === 'papers'
      ? LANDSCAPE_COPY.papersTimelineTitle
      : LANDSCAPE_COPY.newsTimelineTitle;
  }
}

function renderAuthBar() {
  if (authState.authenticated && authState.user) {
    globalElements.authStatus.textContent = ui.authUserStatus
      .replace('{name}', authState.user.name || ui.fallbackTitle);
    globalElements.authStatus.hidden = false;
    globalElements.authOpenButton.hidden = true;
    globalElements.authRegisterButton.hidden = true;
    globalElements.accountButton.hidden = false;
    globalElements.logoutButton.hidden = false;
  } else {
    globalElements.authStatus.textContent = ui.authGuestStatus;
    globalElements.authStatus.hidden = false;
    globalElements.authOpenButton.hidden = false;
    globalElements.authRegisterButton.hidden = false;
    globalElements.accountButton.hidden = true;
    globalElements.logoutButton.hidden = true;
  }
}

function setLoadingState(isLoading) {
  globalElements.refreshButton.disabled = isLoading;
  globalElements.refreshButton.textContent = isLoading ? ui.refreshing : ui.refresh;
}

function showStatus(module, label, title, body) {
  module.elements.statusPanel.classList.remove('is-hidden');
  module.elements.statusLabel.textContent = label;
  module.elements.statusTitle.textContent = title;
  module.elements.statusBody.textContent = body;
}

function hideStatus(module) {
  module.elements.statusPanel.classList.add('is-hidden');
}

function updateModuleBody(module) {
  module.elements.moduleBody.textContent = module.payload?.generatedAt
    ? `最新更新时间：${formatDate(module.payload.generatedAt)}`
    : '最新更新时间：尚未同步';
}

function updateFeedSwitchSummary(module) {
  const countBadge = getFeedCountBadge(module.definition.key);
  const metaLabel = getFeedMetaLabel(module.definition.key);
  const total = typeof module.payload?.total === 'number'
    ? module.payload.total
    : safeArray(module.payload?.articles).length;

  if (countBadge) {
    countBadge.textContent = String(total || 0);
  }

  if (metaLabel) {
    metaLabel.textContent = module.payload?.generatedAt
      ? `更新于 ${formatDate(module.payload.generatedAt)}`
      : '等待同步';
  }
}

function buildAuthDestination(mode = 'login', feedKey = null, articleId = null, reason = 'default') {
  const target = mode === 'register' ? '/register' : '/login';
  const redirectUrl = new URL(window.location.href);

  if (feedKey && articleId) {
    redirectUrl.searchParams.set(feedKey, articleId);
  }

  const params = new URLSearchParams();
  params.set('returnTo', `${redirectUrl.pathname}${redirectUrl.search}`);

  if (reason === 'locked') {
    params.set('reason', 'locked');
  }

  return `${target}?${params.toString()}`;
}

function redirectToAuthPage(mode = 'login', reason = 'default', feedKey = null, articleId = null) {
  window.location.assign(buildAuthDestination(mode, feedKey, articleId, reason));
}

function redirectToAccountAuthPage(mode = 'login') {
  const target = mode === 'register' ? '/register' : '/login';
  const params = new URLSearchParams();
  params.set('returnTo', '/account');
  window.location.assign(`${target}?${params.toString()}`);
}

function getRequestedArticleId(feedKey) {
  return new URL(window.location.href).searchParams.get(feedKey);
}

function getRequestedFeedKey() {
  return normalizeFeedKey(new URL(window.location.href).searchParams.get('feed'));
}

function setRequestedArticleId(feedKey, articleId) {
  const url = new URL(window.location.href);

  if (articleId) {
    url.searchParams.set(feedKey, articleId);
  } else {
    url.searchParams.delete(feedKey);
  }

  window.history.replaceState({}, '', url);
}

function setRequestedFeedKey(feedKey) {
  const url = new URL(window.location.href);
  url.searchParams.set('feed', normalizeFeedKey(feedKey));
  window.history.replaceState({}, '', url);
}

function inferInitialFeedKey() {
  const explicitFeed = new URL(window.location.href).searchParams.get('feed');

  if (explicitFeed && FEED_DEFINITIONS.some((definition) => definition.key === explicitFeed)) {
    return explicitFeed;
  }

  if (getRequestedArticleId('papers')) {
    return 'papers';
  }

  if (getRequestedArticleId('news')) {
    return 'news';
  }

  return 'news';
}

function setActiveFeed(feedKey, options = {}) {
  const nextFeedKey = normalizeFeedKey(feedKey);
  const previousFeedKey = currentFeedKey;
  currentFeedKey = nextFeedKey;

  for (const module of feedModules) {
    const isActive = module.definition.key === currentFeedKey;
    if (isActive) {
      module.root.hidden = false;
      module.root.classList.add('is-active');
    } else {
      module.root.hidden = true;
      module.root.classList.remove('is-active', 'is-entering');
    }
  }

  for (const button of globalElements.feedSwitchButtons) {
    const isActive = button.dataset.feedTarget === currentFeedKey;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    button.tabIndex = isActive ? 0 : -1;
  }

  if (options.updateUrl !== false) {
    setRequestedFeedKey(currentFeedKey);
  }

  if (previousFeedKey !== currentFeedKey || options.forceAnimation === true) {
    const activeModule = feedModules.find((module) => module.definition.key === currentFeedKey);

    if (activeModule) {
      activeModule.root.classList.remove('is-entering');

      if (feedAnimationFrame) {
        cancelAnimationFrame(feedAnimationFrame);
      }

      feedAnimationFrame = window.requestAnimationFrame(() => {
        activeModule.root.classList.add('is-entering');
      });
    }
  }
}

function normalizePayload(payload) {
  const articles = safeArray(payload?.articles).map((article) => ({
    id: article?.id || crypto.randomUUID(),
    contentType: article?.contentType || 'news',
    title: article?.title || '',
    titleZh: article?.titleZh || '',
    summary: article?.summary || '',
    summaryZh: article?.summaryZh || '',
    url: article?.url || '',
    sourceId: article?.sourceId || '',
    sourceName: article?.sourceName || ui.unknownSource,
    publishedAt: article?.publishedAt || '',
    imageUrl: article?.imageUrl || '',
    categories: safeArray(article?.categories),
    previewText: article?.previewText || '',
    previewTextZh: article?.previewTextZh || '',
    easyRead: article?.easyRead || null,
    knowledgeMap: article?.knowledgeMap || null,
    storedLocally: Boolean(article?.storedLocally),
    isViewed: Boolean(article?.isViewed),
    viewedAt: article?.viewedAt || null,
    isLocked: Boolean(article?.isLocked),
  })).sort((left, right) => new Date(right.publishedAt || 0) - new Date(left.publishedAt || 0));

  return {
    generatedAt: payload?.generatedAt || '',
    total: typeof payload?.total === 'number' ? payload.total : articles.length,
    previewArticleId: payload?.previewArticleId || articles[0]?.id || null,
    fullAccess: Boolean(payload?.fullAccess),
    sources: safeArray(payload?.sources),
    articles,
  };
}

function normalizeArticleDetail(article) {
  return {
    id: article?.id || '',
    contentType: article?.contentType || 'news',
    title: article?.title || '',
    titleZh: article?.titleZh || '',
    summary: article?.summary || '',
    summaryZh: article?.summaryZh || '',
    url: article?.url || '',
    sourceId: article?.sourceId || '',
    contentText: article?.contentText || '',
    contentTextZh: article?.contentTextZh || '',
    sourceName: article?.sourceName || ui.unknownSource,
    publishedAt: article?.publishedAt || '',
    imageUrl: article?.imageUrl || '',
    categories: safeArray(article?.categories),
    easyRead: article?.easyRead || null,
    knowledgeMap: article?.knowledgeMap || null,
    storedLocally: Boolean(article?.storedLocally),
    isViewed: Boolean(article?.isViewed),
    viewedAt: article?.viewedAt || null,
  };
}

function getTotalPages(totalArticles) {
  return Math.max(1, Math.ceil(totalArticles / PAGE_SIZE));
}

function clampPageIndex(module, pageIndex, articles) {
  return Math.min(Math.max(pageIndex, 0), getTotalPages(articles.length) - 1);
}

function getVisibleArticles(module, articles) {
  const safePageIndex = clampPageIndex(module, module.currentPageIndex, articles);
  const start = safePageIndex * PAGE_SIZE;
  module.currentPageIndex = safePageIndex;

  return {
    start,
    end: start + PAGE_SIZE,
    articles: articles.slice(start, start + PAGE_SIZE),
  };
}

function updateRailScrollbar(module, options = {}) {
  const resetScroll = options.resetScroll === true;
  const scrollWidth = module.elements.rail.scrollWidth;
  const clientWidth = module.elements.rail.clientWidth;
  const hasOverflow = scrollWidth > clientWidth + 1;

  module.elements.railScrollbar.hidden = !hasOverflow;
  module.elements.railScrollbarSpacer.style.width = `${scrollWidth}px`;

  if (resetScroll) {
    module.elements.rail.scrollLeft = 0;
    module.elements.railScrollbar.scrollLeft = 0;
  } else {
    module.elements.railScrollbar.scrollLeft = module.elements.rail.scrollLeft;
  }
}

function syncRailScroll(module, source, target) {
  if (module.isSyncingRailScroll) {
    return;
  }

  module.isSyncingRailScroll = true;
  target.scrollLeft = source.scrollLeft;
  window.requestAnimationFrame(() => {
    module.isSyncingRailScroll = false;
  });
}

function isArticleLocked(article) {
  return !authState.authenticated && Boolean(article?.isLocked);
}

function getPreviewArticle(module) {
  return safeArray(module.payload?.articles).find((item) => item.id === module.payload?.previewArticleId)
    || safeArray(module.payload?.articles)[0]
    || null;
}

function renderReader(module, article, detail) {
  const source = detail || article || null;
  const chineseBody = looksLikeChineseText(source?.contentTextZh?.trim())
    ? source.contentTextZh.trim()
    : '';
  const easyReadBody = [
    source?.easyRead?.plainSummary?.trim(),
    source?.easyRead?.whyItMatters?.trim(),
    ...safeArray(source?.easyRead?.keyTakeaways),
  ].filter((item) => looksLikeChineseText(item)).join('\n\n');
  const bodySource = chineseBody
    || (looksLikeChineseText(source?.summaryZh?.trim()) ? source.summaryZh.trim() : '')
    || easyReadBody
    || source?.contentText?.trim()
    || (looksLikeChineseText(article?.previewTextZh?.trim()) ? article.previewTextZh.trim() : '')
    || article?.previewText?.trim()
    || '';
  const paragraphs = bodySource.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const viewedAt = source?.viewedAt;

  module.elements.readerTitle.textContent = source ? getDisplayTitle(source) : ui.fallbackTitle;
  module.elements.readerMeta.textContent = source
    ? [source.sourceName || ui.unknownSource, formatDate(source.publishedAt)].join(ui.readerMetaSep)
    : ui.unknownSource;
  module.elements.readerArchive.textContent = source?.storedLocally
    ? module.definition.archiveReady
    : module.definition.archivePending;
  module.elements.readerViewed.textContent = authState.authenticated
    ? (source?.isViewed
      ? (viewedAt ? ui.readerViewedSeenAt.replace('{time}', formatDate(viewedAt)) : ui.readerViewedSeen)
      : ui.readerViewedUnseen)
    : ui.readerViewedGuest;
  module.elements.readerSummary.textContent = source ? getDisplaySummary(source) : ui.readerSummaryFallback;
  renderReaderVisual(module, source);
  renderEasyRead(module, source);
  module.elements.readerBody.innerHTML = paragraphs.length > 0
    ? paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
    : `<p>${escapeHtml(ui.readerBodyLoading)}</p>`;
  renderKnowledgeMap(module, source);
  renderKnowledgeTimeline(module, source);
}

function renderReaderVisual(module, article) {
  hideReaderVisual(module);

  if (!hasRenderableImageUrl(article?.imageUrl)) {
    return;
  }

  const previewImage = new Image();
  previewImage.onload = () => {
    module.elements.readerImage.src = article.imageUrl;
    module.elements.readerImage.alt = getDisplayTitle(article);
    module.elements.readerVisual.classList.remove('is-hidden');
  };
  previewImage.onerror = () => {
    hideReaderVisual(module);
  };
  previewImage.src = article.imageUrl;
}

function renderEasyRead(module, article) {
  const easyRead = article?.easyRead || null;
  const keyTakeaways = safeArray(easyRead?.keyTakeaways).filter(Boolean);
  const glossary = safeArray(easyRead?.glossary).filter((item) => item?.term && item?.explanation);
  const hasEasyRead = Boolean(
    easyRead?.plainSummary
    || easyRead?.whyItMatters
    || keyTakeaways.length > 0
    || glossary.length > 0,
  );

  if (!hasEasyRead) {
    module.elements.easyReadPanel.classList.add('is-empty');
    module.elements.easySummaryText.textContent = ui.easyReadFallback;
    module.elements.easyWhyText.textContent = '';
    module.elements.easyPointsList.innerHTML = '';
    module.elements.easyGlossaryList.innerHTML = '';
    module.elements.easyGlossaryCard.classList.add('is-hidden');
    return;
  }

  module.elements.easyReadPanel.classList.remove('is-empty');
  module.elements.easySummaryText.textContent = easyRead?.plainSummary || ui.easyReadFallback;
  module.elements.easyWhyText.textContent = easyRead?.whyItMatters || '';
  module.elements.easyPointsList.innerHTML = keyTakeaways.length > 0
    ? keyTakeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '';
  module.elements.easyGlossaryCard.classList.toggle('is-hidden', glossary.length === 0);
  module.elements.easyGlossaryList.innerHTML = glossary
    .map((item) => `
      <article class="easy-read__glossary-item">
        <h5>${escapeHtml(item.term)}</h5>
        <p>${escapeHtml(item.explanation)}</p>
      </article>
    `)
    .join('');
}

function renderKnowledgeMap(module, article) {
  const map = article?.knowledgeMap || buildKnowledgeMap(article);

  if (!map) {
    module.elements.knowledgeMapPanel.classList.add('is-hidden');
    module.elements.knowledgeMapCanvas.innerHTML = '';
    return;
  }

  module.elements.knowledgeMapPanel.classList.remove('is-hidden');
  module.elements.knowledgeMapCanvas.innerHTML = `
    <article class="knowledge-map__hub">
      <p class="knowledge-map__hub-label">${escapeHtml(LANDSCAPE_COPY.hubLabel)}</p>
      <h5 class="knowledge-map__hub-title">${escapeHtml(map.hubTitle)}</h5>
      <p class="knowledge-map__hub-topic">${escapeHtml(map.hubTopic || ui.fallbackTitle)}</p>
      <p class="knowledge-map__hub-summary">${escapeHtml(map.hubSummary || LANDSCAPE_COPY.empty)}</p>
    </article>
    <div class="knowledge-map__branches">
      ${safeArray(map.branches).map((branch) => `
        <article class="knowledge-map__branch${branch.active ? ' is-active' : ''}${branch.related ? ' is-related' : ''}">
          <p class="knowledge-map__branch-status">${escapeHtml(branch.status || LANDSCAPE_COPY.backgroundStatus)}</p>
          <h5 class="knowledge-map__branch-title">${escapeHtml(branch.label || ui.fallbackTitle)}</h5>
          <p class="knowledge-map__branch-summary">${escapeHtml(branch.summary || '')}</p>
          <ul class="knowledge-map__branch-list">
            ${safeArray(branch.nodes).slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </article>
      `).join('')}
    </div>
  `;
}

function renderKnowledgeTimeline(module, article) {
  if (!article) {
    module.elements.knowledgeTimelinePanel.classList.add('is-hidden');
    module.elements.knowledgeTimelineTrack.innerHTML = '';
    module.elements.knowledgeTimelineSummary.textContent = '';
    return;
  }

  const timeline = buildTimelineEntries(module, article);
  const rangeLabel = getTimelineRangeLabel(timeline.entries);

  module.elements.knowledgeTimelinePanel.classList.remove('is-hidden');
  module.elements.knowledgeTimelineSummary.textContent = timeline.entries.length > 1
    ? `围绕「${timeline.branchLabel}」这条主线，按时间看最近几次关键变化。${rangeLabel}`
    : LANDSCAPE_COPY.timelineEmpty;
  module.elements.knowledgeTimelineTrack.innerHTML = timeline.entries.map((entry) => `
    <article class="knowledge-timeline__item${entry.active ? ' is-active' : ''}">
      <div class="knowledge-timeline__dot" aria-hidden="true"></div>
      <div class="knowledge-timeline__card">
        <p class="knowledge-timeline__item-state">${escapeHtml(entry.state)}</p>
        <h6 class="knowledge-timeline__item-title">${escapeHtml(entry.title)}</h6>
        <p class="knowledge-timeline__item-meta">${escapeHtml([entry.sourceName, formatDate(entry.publishedAt)].join(ui.readerMetaSep))}</p>
        <p class="knowledge-timeline__item-body">${escapeHtml(entry.insight || LANDSCAPE_COPY.timelineEmpty)}</p>
      </div>
    </article>
  `).join('');
}

function renderRail(module, articles, options = {}) {
  const resetScroll = options.resetScroll === true;
  const { start, articles: visibleArticles } = getVisibleArticles(module, articles);
  const rangeStart = visibleArticles.length > 0 ? start + 1 : 0;
  const rangeEnd = start + visibleArticles.length;
  const totalPages = getTotalPages(articles.length);

  module.elements.rail.innerHTML = visibleArticles.map((article) => {
    const locked = isArticleLocked(article);
    const active = article.id === module.currentArticleId;
    const stateLabel = authState.authenticated
      ? (article.isViewed ? ui.readStatusSeen : ui.readStatusUnread)
      : (locked ? ui.cardLocked : ui.cardPreview);
    const previewSummary = looksLikeChineseText(article.previewTextZh)
      ? article.previewTextZh
      : getDisplaySummary(article);

    return `
      <button
        class="news-card${active ? ' is-active' : ''}${locked ? ' news-card--locked' : ''}"
        type="button"
        data-article-id="${escapeAttribute(article.id)}"
      >
        ${article.imageUrl ? `<div class="news-card__image-wrap"><img class="news-card__image" src="${escapeAttribute(article.imageUrl)}" alt="${escapeAttribute(getDisplayTitle(article))}"></div>` : ''}
        <p class="news-card__source">${escapeHtml(article.sourceName || ui.unknownSource)}</p>
        <h3 class="news-card__title">${escapeHtml(getDisplayTitle(article))}</h3>
        <p class="news-card__summary">${escapeHtml(previewSummary)}</p>
        <div class="news-card__footer">
          <span class="pill">${escapeHtml(articleBadge(article))}</span>
          <span class="pill">${escapeHtml(article.storedLocally ? ui.cardStored : ui.cardSummaryOnly)}</span>
          <span class="pill${article.isViewed ? ' pill--seen' : ''}${locked ? ' pill--locked' : ''}">${escapeHtml(stateLabel)}</span>
        </div>
      </button>
    `;
  }).join('');

  module.elements.railCount.textContent = authState.authenticated
    ? `当前 ${rangeStart}-${rangeEnd} / ${articles.length} ${module.definition.itemUnit}`
    : `当前 ${rangeStart}-${rangeEnd} / ${articles.length} ${module.definition.itemUnit} · 游客仅可读 1 篇`;
  module.elements.prevPageButton.disabled = module.currentPageIndex <= 0;
  module.elements.nextPageButton.disabled = module.currentPageIndex >= totalPages - 1;

  module.elements.rail.querySelectorAll('.news-card').forEach((button) => {
    button.addEventListener('click', () => {
      const article = safeArray(module.payload?.articles).find((item) => item.id === button.dataset.articleId);
      if (article) {
        selectArticle(module, article, { scroll: true });
      }
    });
  });

  module.elements.rail.querySelectorAll('.news-card__image').forEach((image) => {
    const removeBrokenImage = () => {
      image.closest('.news-card__image-wrap')?.remove();
    };

    image.addEventListener('error', removeBrokenImage, { once: true });

    if (image.complete && image.naturalWidth === 0) {
      removeBrokenImage();
    }
  });

  updateRailScrollbar(module, { resetScroll });
}

function scrollReaderIntoView(module) {
  module.elements.readerPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideReaderVisual(module) {
  module.elements.readerVisual.classList.add('is-hidden');
  module.elements.readerImage.removeAttribute('src');
  module.elements.readerImage.alt = '';
}

function hasRenderableImageUrl(value) {
  const url = String(value ?? '').trim();
  return /^(https?:)?\/\//i.test(url) || url.startsWith('/');
}

function updateArticleViewedState(module, articleId, viewedAt) {
  if (!module.payload) {
    return;
  }

  module.payload.articles = safeArray(module.payload.articles).map((article) => (
    article.id === articleId ? { ...article, isViewed: true, viewedAt } : article
  ));

  if (module.detailCache.has(articleId)) {
    module.detailCache.set(articleId, { ...module.detailCache.get(articleId), isViewed: true, viewedAt });
  }
}

function updateCurrentUser(user) {
  authState = { ...authState, user: user || authState.user };
  renderAuthBar();
}

function selectArticle(module, article, options = {}) {
  if (!article) {
    return;
  }

  setActiveFeed(module.definition.key);

  if (isArticleLocked(article)) {
    redirectToAuthPage('login', 'locked', module.definition.key, article.id);
    return;
  }

  module.currentArticleId = article.id;
  setRequestedArticleId(module.definition.key, article.id);
  renderReader(module, article, module.detailCache.get(article.id) || null);
  renderRail(module, safeArray(module.payload?.articles));
  loadArticleDetail(module, article.id);
  markArticleAsViewed(module, article.id);

  if (options.scroll === true) {
    scrollReaderIntoView(module);
  }
}

async function loadArticleDetail(module, articleId) {
  if (!articleId) {
    return;
  }

  if (module.detailCache.has(articleId)) {
    const cachedSummary = safeArray(module.payload?.articles).find((item) => item.id === articleId);
    if (cachedSummary) {
      renderReader(module, cachedSummary, module.detailCache.get(articleId));
    }
    return;
  }

  const requestToken = ++module.detailRequestToken;
  const summaryArticle = safeArray(module.payload?.articles).find((item) => item.id === articleId);

  if (summaryArticle) {
    module.elements.readerBody.innerHTML = `<p>${escapeHtml(ui.readerBodyLoading)}</p>`;
  }

  try {
    const response = await fetch(`${module.definition.apiBase}/${encodeURIComponent(articleId)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (response.status === 401) {
      redirectToAuthPage('login', 'locked', module.definition.key, articleId);
      return;
    }

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const detail = normalizeArticleDetail(await response.json());
    module.detailCache.set(articleId, detail);

    if (requestToken === module.detailRequestToken && summaryArticle && module.currentArticleId === articleId) {
      renderReader(module, summaryArticle, detail);
    }
  } catch (error) {
    console.error(error);
    if (requestToken === module.detailRequestToken && summaryArticle) {
      renderReader(module, summaryArticle, null);
    }
  }
}

async function markArticleAsViewed(module, articleId) {
  if (!articleId || !authState.authenticated) {
    return;
  }

  const article = safeArray(module.payload?.articles).find((item) => item.id === articleId);
  if (!article || article.isViewed) {
    return;
  }

  try {
    const response = await fetch(`${module.definition.apiBase}/${encodeURIComponent(articleId)}/view`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    updateArticleViewedState(module, articleId, payload?.viewedAt || new Date().toISOString());

    if (payload?.currentUser) {
      updateCurrentUser(payload.currentUser);
    }

    if (module.currentArticleId === articleId) {
      const selected = safeArray(module.payload?.articles).find((item) => item.id === articleId) || article;
      renderReader(module, selected, module.detailCache.get(articleId) || null);
      renderRail(module, safeArray(module.payload?.articles));
    }
  } catch (error) {
    console.error(error);
  }
}

async function fetchFeed(module) {
  showStatus(module, ui.loadingLabel, module.definition.loadingTitle, module.definition.loadingBody);

  try {
    const response = await fetch(module.definition.apiBase, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    module.payload = normalizePayload(await response.json());
    updateModuleBody(module);
    updateFeedSwitchSummary(module);

    const previewArticle = getPreviewArticle(module);
    const requestedArticle = safeArray(module.payload.articles).find(
      (item) => item.id === getRequestedArticleId(module.definition.key),
    ) || null;
    const initialArticle = requestedArticle && !isArticleLocked(requestedArticle) ? requestedArticle : previewArticle;

    if (!module.payload.articles.length || !initialArticle) {
      module.currentArticleId = null;
      module.elements.rail.innerHTML = '';
      module.elements.railScrollbar.hidden = true;
      module.elements.railCount.textContent = '';
      module.elements.prevPageButton.disabled = true;
      module.elements.nextPageButton.disabled = true;
      renderReader(module, null, null);
      showStatus(module, ui.loadingLabel, module.definition.emptyTitle, module.definition.emptyBody);
      return;
    }

    module.currentArticleId = initialArticle.id;
    module.currentPageIndex = Math.floor(
      Math.max(safeArray(module.payload.articles).findIndex((item) => item.id === initialArticle.id), 0) / PAGE_SIZE,
    );

    hideStatus(module);
    renderRail(module, module.payload.articles, { resetScroll: true });
    renderReader(module, initialArticle, module.detailCache.get(initialArticle.id) || null);
    setRequestedArticleId(module.definition.key, initialArticle.id);
    await loadArticleDetail(module, initialArticle.id);
    markArticleAsViewed(module, initialArticle.id);
  } catch (error) {
    console.error(error);
    showStatus(module, ui.errorLabel, module.definition.errorTitle, module.definition.errorBody);
  }
}

async function fetchAuthSession() {
  try {
    const response = await fetch('/api/auth/session', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const payload = await response.json();
    authState = {
      authenticated: Boolean(payload?.authenticated),
      user: payload?.user || null,
      expiresAt: payload?.expiresAt || null,
    };
  } catch (error) {
    console.error(error);
    authState = { authenticated: false, user: null, expiresAt: null };
  }

  renderAuthBar();
}

async function refreshAllFeeds() {
  for (const module of feedModules) {
    module.detailCache.clear();
  }

  setLoadingState(true);

  try {
    await Promise.all(feedModules.map((module) => fetchFeed(module)));
  } finally {
    setLoadingState(false);
  }
}

async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch (error) {
    console.error(error);
  }

  for (const module of feedModules) {
    module.detailCache.clear();
  }

  await fetchAuthSession();
  await refreshAllFeeds();
}

function goToPage(module, nextPageIndex) {
  if (!module.payload) {
    return;
  }

  const articles = safeArray(module.payload.articles);
  const safeNextPageIndex = clampPageIndex(module, nextPageIndex, articles);

  if (safeNextPageIndex === module.currentPageIndex) {
    return;
  }

  module.currentPageIndex = safeNextPageIndex;
  renderRail(module, articles, { resetScroll: true });

  if (!authState.authenticated) {
    return;
  }

  const nextArticle = getVisibleArticles(module, articles).articles[0] || null;
  if (nextArticle) {
    module.currentArticleId = nextArticle.id;
    setRequestedArticleId(module.definition.key, nextArticle.id);
    renderReader(module, nextArticle, module.detailCache.get(nextArticle.id) || null);
    loadArticleDetail(module, nextArticle.id);
    markArticleAsViewed(module, nextArticle.id);
  }
}

function bindEvents() {
  globalElements.refreshButton.addEventListener('click', async () => {
    await refreshAllFeeds();
  });
  globalElements.authOpenButton.addEventListener('click', () => redirectToAccountAuthPage('login'));
  globalElements.authRegisterButton.addEventListener('click', () => redirectToAccountAuthPage('register'));
  globalElements.logoutButton.addEventListener('click', async () => {
    await logout();
  });
  globalElements.feedSwitchButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveFeed(button.dataset.feedTarget);
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
        return;
      }

      event.preventDefault();
      const currentIndex = globalElements.feedSwitchButtons.indexOf(button);
      const offset = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + offset + globalElements.feedSwitchButtons.length) % globalElements.feedSwitchButtons.length;
      const nextButton = globalElements.feedSwitchButtons[nextIndex];

      nextButton?.focus();
      if (nextButton?.dataset.feedTarget) {
        setActiveFeed(nextButton.dataset.feedTarget);
      }
    });
  });

  for (const module of feedModules) {
    module.elements.prevPageButton.addEventListener('click', () => goToPage(module, module.currentPageIndex - 1));
    module.elements.nextPageButton.addEventListener('click', () => goToPage(module, module.currentPageIndex + 1));
    module.elements.rail.addEventListener('scroll', () => syncRailScroll(module, module.elements.rail, module.elements.railScrollbar));
    module.elements.railScrollbar.addEventListener('scroll', () => syncRailScroll(module, module.elements.railScrollbar, module.elements.rail));
    module.root.addEventListener('animationend', () => {
      module.root.classList.remove('is-entering');
    });
  }

  window.addEventListener('resize', () => {
    for (const module of feedModules) {
      updateRailScrollbar(module);
    }
  });
}

setStaticCopy();
renderAuthBar();
setActiveFeed(inferInitialFeedKey(), { updateUrl: false });
bindEvents();

await fetchAuthSession();
await refreshAllFeeds();
