const TERM_EXPLANATIONS = [
  ['LLM', '一种通过大量文本训练出来、擅长理解和生成文字的 AI 模型。'],
  ['大语言模型', '一种通过大量文本训练出来、擅长理解和生成文字的 AI 模型。'],
  ['多模态', '指模型能同时处理文字、图片、音频或视频等多种信息。'],
  ['智能体', '会把目标拆成步骤、调用工具并自动执行任务的 AI 系统。'],
  ['Agent', '会把目标拆成步骤、调用工具并自动执行任务的 AI 系统。'],
  ['RAG', '一种先检索资料、再让模型回答的问题解决方式，能减少胡编。'],
  ['推理模型', '更强调分步骤思考、解题和分析过程的模型。'],
  ['开源', '代码或模型权重可以公开获取，开发者可以自行部署和改造。'],
  ['微调', '在现有模型基础上继续训练，让它更适合某个具体任务。'],
  ['Benchmark', '用来比较模型表现的一组标准测试。'],
  ['API', '让不同系统可以互相调用功能的接口。'],
  ['GPU', '适合并行计算的芯片，常用于训练和运行 AI 模型。'],
  ['token', '模型处理文字时使用的最小计数单位，可以理解为词片段。'],
  ['推理', '模型真正生成答案或执行任务时的运行过程。'],
];

const STORY_TYPES = [
  {
    type: 'policy',
    keywords: ['禁令', '监管', '法案', '法院', '诉讼', 'government', 'policy', 'ban', 'court', 'lawsuit'],
    why: '它的重要性在于：这类变化会直接影响 AI 产品能不能上线、公司能不能合作，以及整个行业接下来要遵守哪些规则。',
    focus: '重点看清楚限制是否收紧、影响的是哪类公司，以及它会不会改变产品上线和采购节奏。',
    impact: '对普通读者来说，这通常会影响以后哪些 AI 服务能正常提供，以及企业使用 AI 时要面对哪些新门槛。',
  },
  {
    type: 'release',
    keywords: ['发布', '推出', '上线', 'launch', 'release', 'model', '模型', 'agent', '智能体'],
    why: '它的重要性在于：这通常意味着 AI 工具的能力、价格或可用范围出现了变化，开发者和企业会随之调整选型。',
    focus: '重点看它到底新增了什么能力、比上一代强在哪，以及普通用户或开发者现在能不能用。',
    impact: '对普通读者来说，这往往意味着更好用的 AI 工具会更快进入工作、学习和内容创作场景。',
  },
  {
    type: 'research',
    keywords: ['研究', '论文', '实验', 'benchmark', 'study', 'research', 'test'],
    why: '它的重要性在于：这类进展会影响大家对 AI 能力上限、可靠性和未来方向的判断。',
    focus: '重点看研究到底解决了什么问题、结果有没有明显提升，以及结论离实际产品还有多远。',
    impact: '对普通读者来说，这类研究会决定未来的 AI 工具能否更准确、更安全，也更值得长期使用。',
  },
  {
    type: 'business',
    keywords: ['融资', '收购', '合作', 'funding', 'acquire', 'investment', 'partnership'],
    why: '它的重要性在于：资金和合作流向往往代表行业资源正在向哪里集中，也会影响下一波产品竞争。',
    focus: '重点看谁和谁绑得更紧、钱投向了哪里，以及这种合作会不会很快体现在新产品上。',
    impact: '对普通读者来说，这类消息会影响未来哪些公司更有机会做大，以及哪些 AI 服务更可能持续更新。',
  },
  {
    type: 'infrastructure',
    keywords: ['chip', 'gpu', '算力', 'data center', '云', 'cloud', 'inference', '部署'],
    why: '它的重要性在于：AI 的性能、成本和普及速度，很多时候取决于底层算力和部署方式。',
    focus: '重点看成本有没有下降、速度有没有提升，以及谁因此获得了更强的交付能力。',
    impact: '对普通读者来说，这最终会体现在 AI 工具是否更快、更便宜，以及响应是否更稳定。',
  },
];

const INLINE_REPLACEMENTS = [
  [/\bAI\b/gi, 'AI'],
  [/\bLLM\b/gi, '大语言模型'],
  [/\bAgentic AI\b/gi, '智能体 AI'],
  [/\bAgent\b/gi, '智能体'],
  [/\bRAG\b/gi, 'RAG 检索增强生成'],
  [/\bBenchmark\b/gi, '基准测试'],
  [/\bInference\b/gi, '推理'],
  [/\bFine[- ]?tuning\b/gi, '微调'],
  [/\bOpen source\b/gi, '开源'],
  [/\bMultimodal\b/gi, '多模态'],
  [/\bRealtime\b/gi, '实时'],
  [/\bAPI\b/g, 'API'],
  [/\bGPU\b/g, 'GPU'],
];

const NOISE_PATTERNS = [
  /^by\s+[a-z]/i,
  /^updated\s+/i,
  /^published\s+/i,
  /^image credit/i,
  /^copyright/i,
  /^all rights reserved/i,
  /^sign up/i,
  /^read more/i,
  /^advertisement/i,
];

export function createEmptyEasyRead() {
  return {
    plainSummary: '',
    whyItMatters: '',
    keyTakeaways: [],
    glossary: [],
  };
}

export function buildEasyReadArticle(article) {
  const storyType = inferStoryType(article);
  const sentences = collectUsefulSentences(article);
  const lead = buildLead(article, storyType, sentences);
  const secondary = sentences.find((sentence) => sentence !== lead) || '';
  const plainSummary = lead ? `简单说，这篇新闻讲的是：${ensureSentence(lead)}` : buildGenericSummary(article, storyType);
  const whyItMatters = buildWhyItMatters(article, storyType, secondary);
  const keyTakeaways = buildKeyTakeaways(article, storyType, lead, secondary);
  const glossary = detectGlossary(article).slice(0, 4);

  return {
    plainSummary,
    whyItMatters,
    keyTakeaways,
    glossary,
  };
}

function inferStoryType(article) {
  const combined = [
    article?.titleZh,
    article?.summaryZh,
    article?.title,
    article?.summary,
    article?.sourceName,
    ...safeArray(article?.categories),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let selectedType = STORY_TYPES[1];
  let highestScore = 0;

  for (const storyType of STORY_TYPES) {
    const score = storyType.keywords.reduce(
      (total, keyword) => total + (matchesKeyword(combined, keyword) ? 1 : 0),
      0,
    );

    if (score > highestScore) {
      highestScore = score;
      selectedType = storyType;
    }
  }

  return selectedType;
}

function collectUsefulSentences(article) {
  const preferred = [
    article?.summaryZh,
    article?.contentTextZh,
    article?.titleZh,
    article?.summary,
    article?.contentText,
    article?.title,
  ];

  return dedupeStrings(
    preferred
      .flatMap((value) => splitIntoSentences(value))
      .map((sentence) => sanitizeSentence(sentence))
      .filter((sentence) => isUsefulSentence(sentence)),
  ).slice(0, 8);
}

function buildLead(article, storyType, sentences) {
  const chineseSentence = sentences.find((sentence) => isReadableChineseSentence(sentence));
  if (chineseSentence) {
    return chineseSentence;
  }

  const translatedTitle = sanitizeSentence(article?.titleZh || article?.title || '');
  if (isReadableChineseSentence(translatedTitle) && isUsefulSentence(translatedTitle)) {
    return translatedTitle;
  }

  return buildGenericSummary(article, storyType).replace(/^简单说，这篇新闻讲的是：/u, '').replace(/[。！？]$/u, '');
}

function buildWhyItMatters(article, storyType, secondarySentence) {
  if (isReadableChineseSentence(secondarySentence) && secondarySentence.length >= 18) {
    return `为什么值得关注：${ensureSentence(secondarySentence)}`;
  }

  if (storyType?.why) {
    return storyType.why;
  }

  return '它的重要性在于：这类 AI 动态通常会影响产品能力、行业竞争，以及普通用户接下来能用到什么新工具。';
}

function buildKeyTakeaways(article, storyType, lead, secondary) {
  const items = [];

  if (lead) {
    items.push(`发生了什么：${ensureSentence(lead)}`);
  }

  if (isReadableChineseSentence(secondary) && secondary.length >= 18) {
    items.push(`重点信息：${ensureSentence(secondary)}`);
  } else if (storyType?.focus) {
    items.push(ensureSentence(storyType.focus));
  }

  if (storyType?.impact) {
    items.push(ensureSentence(storyType.impact));
  } else {
    items.push('对普通读者来说，最值得关注的是它会不会很快改变你能接触到的 AI 工具和使用成本。');
  }

  return dedupeStrings(items).slice(0, 3);
}

function buildGenericSummary(article, storyType) {
  const sourceName = String(article?.sourceName || '').trim();
  const category = safeArray(article?.categories).find(Boolean) || 'AI';

  if (storyType?.type === 'policy') {
    return '简单说，这篇新闻讲的是：监管、法院或政府对 AI 公司和产品的限制出现了新变化。';
  }

  if (storyType?.type === 'research') {
    return '简单说，这篇新闻讲的是：研究团队公布了与 AI 能力或评测结果有关的新发现。';
  }

  if (storyType?.type === 'business') {
    return '简单说，这篇新闻讲的是：AI 公司之间的融资、合作或收购关系出现了新动向。';
  }

  if (storyType?.type === 'infrastructure') {
    return '简单说，这篇新闻讲的是：支撑 AI 运行的算力、部署或基础设施正在发生变化。';
  }

  if (sourceName || category) {
    return `简单说，这篇新闻讲的是：${sourceName || category} 报道了一项新的 AI 产品或能力更新。`;
  }

  return '简单说，这篇新闻讲的是：AI 领域又出现了一项值得关注的新动态。';
}

function detectGlossary(article) {
  const content = buildTextBundle(article);
  const lowerContent = content.toLowerCase();
  const glossary = [];

  for (const [term, explanation] of TERM_EXPLANATIONS) {
    if (lowerContent.includes(term.toLowerCase())) {
      glossary.push({ term, explanation });
    }
  }

  return dedupeByKey(glossary, (item) => item.term.toLowerCase());
}

function buildTextBundle(article) {
  return [
    article?.titleZh,
    article?.summaryZh,
    article?.contentTextZh,
    article?.title,
    article?.summary,
    article?.contentText,
    ...safeArray(article?.categories),
  ]
    .filter(Boolean)
    .join('\n');
}

function splitIntoSentences(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？!?])\s+|(?<=\.)\s+(?=[A-Z0-9])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sanitizeSentence(value) {
  let output = String(value ?? '')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/\(([^)]{0,120})\)/g, ' ')
    .replace(/（[^）]{0,120}）/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const [pattern, replacement] of INLINE_REPLACEMENTS) {
    output = output.replace(pattern, replacement);
  }

  output = output
    .replace(/^[-–—•\s]+/u, '')
    .replace(/\s+[|｜].*$/u, '')
    .replace(/^[^:：]{0,24}(?:作者|撰文|来源)[:：]\s*/u, '')
    .trim();

  if (output.length > 110) {
    output = `${output.slice(0, 107).trimEnd()}...`;
  }

  return output;
}

function isUsefulSentence(value) {
  const text = String(value ?? '').trim();

  if (!text || text.length < 12) {
    return false;
  }

  if (NOISE_PATTERNS.some((pattern) => pattern.test(text))) {
    return false;
  }

  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}$/u.test(text)) {
    return false;
  }

  return true;
}

function containsChinese(value) {
  return /[\u3400-\u9fff]/u.test(String(value ?? ''));
}

function isReadableChineseSentence(value) {
  const text = String(value ?? '').trim();
  if (!text || !containsChinese(text)) {
    return false;
  }

  const chineseMatches = text.match(/[\u3400-\u9fff]/gu) ?? [];
  return chineseMatches.length >= Math.max(6, Math.ceil(text.length * 0.24))
    && !/[A-Za-z][A-Za-z\s,:;'"()/-]{18,}/u.test(text);
}

function matchesKeyword(text, keyword) {
  const query = String(keyword ?? '').trim().toLowerCase();
  if (!query) {
    return false;
  }

  if (/[a-z0-9]/i.test(query)) {
    const pattern = new RegExp(`\\b${escapeRegExp(query)}s?\\b`, 'i');
    return pattern.test(text);
  }

  return text.includes(query);
}

function escapeRegExp(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ensureSentence(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  return /[。！？]$/u.test(text) ? text : `${text}。`;
}

function dedupeStrings(items) {
  return dedupeByKey(items, (item) => String(item ?? '').replace(/\s+/g, ' ').toLowerCase());
}

function dedupeByKey(items, getKey) {
  const seen = new Set();
  const unique = [];

  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
