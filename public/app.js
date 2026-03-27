const elements = {
  brandLabel: document.querySelector("#brand-label"),
  siteNote: document.querySelector("#site-note"),
  refreshButton: document.querySelector("#refresh-button"),
  userPanelLabel: document.querySelector("#user-panel-label"),
  userSelect: document.querySelector("#user-select"),
  userForm: document.querySelector("#user-form"),
  userInput: document.querySelector("#user-input"),
  userCreateButton: document.querySelector("#user-create-button"),
  userMeta: document.querySelector("#user-meta"),
  statusPanel: document.querySelector("#status-panel"),
  statusLabel: document.querySelector("#status-label"),
  statusTitle: document.querySelector("#status-title"),
  statusBody: document.querySelector("#status-body"),
  railKicker: document.querySelector("#rail-kicker"),
  railTitle: document.querySelector("#rail-title"),
  railCount: document.querySelector("#rail-count"),
  prevPageButton: document.querySelector("#prev-page-button"),
  nextPageButton: document.querySelector("#next-page-button"),
  railScrollbar: document.querySelector("#rail-scrollbar"),
  railScrollbarSpacer: document.querySelector("#rail-scrollbar-spacer"),
  newsRail: document.querySelector("#news-rail"),
  readerPanel: document.querySelector("#reader-panel"),
  readerKicker: document.querySelector("#reader-kicker"),
  readerTitle: document.querySelector("#reader-title"),
  readerMeta: document.querySelector("#reader-meta"),
  readerArchive: document.querySelector("#reader-archive"),
  readerViewed: document.querySelector("#reader-viewed"),
  readerSummary: document.querySelector("#reader-summary"),
  readerBody: document.querySelector("#reader-body"),
};

const ui = {
  brand: "\u0041\u0049 \u65B0\u95FB\u60C5\u62A5\u53F0",
  siteNote:
    "\u6A2A\u5411\u5361\u7247\u5728\u4E0A\u65B9\u7B5B\u9009\uFF0C\u6B63\u6587\u9605\u8BFB\u5728\u4E0B\u65B9\u5C55\u5F00\u3002\u5207\u6362\u7528\u6237\u540E\uFF0C\u5DF2\u770B\u8BB0\u5F55\u4F1A\u6309\u4EBA\u72EC\u7ACB\u4FDD\u5B58\u3002",
  refresh: "\u5237\u65B0\u65B0\u95FB",
  refreshing: "\u5237\u65B0\u4E2D...",
  userPanelLabel: "\u7528\u6237\u7BA1\u7406",
  userPlaceholder: "\u65B0\u5EFA\u7528\u6237\u540D",
  userCreate: "\u521B\u5EFA\u7528\u6237",
  userCreating: "\u521B\u5EFA\u4E2D...",
  userSwitching: "\u5207\u6362\u4E2D...",
  userFallback: "\u6682\u65E0\u7528\u6237",
  userMeta: "\u5F53\u524D\u7528\u6237\uFF1A{name} \u00B7 \u5DF2\u770B {count} \u6761",
  railKicker: "\u6BCF\u9875 10 \u6761\u6A2A\u5411\u5207\u6362",
  railTitle:
    "\u53EF\u4EE5\u5411\u524D\u770B\u4E4B\u524D 10 \u6761\uFF0C\u4E5F\u53EF\u4EE5\u5411\u540E\u770B\u540E\u9762 10 \u6761\u3002\u70B9\u51FB\u4EFB\u610F\u5361\u7247\u540E\uFF0C\u6B63\u6587\u4F1A\u5728\u4E0B\u65B9\u6253\u5F00\u3002",
  prevPage: "\u4E0A\u4E00\u7EC4",
  nextPage: "\u4E0B\u4E00\u7EC4",
  readerKicker: "\u672C\u5730\u5F52\u6863\u6B63\u6587",
  loadingLabel: "\u52A0\u8F7D\u4E2D",
  loadingTitle: "\u6B63\u5728\u8BFB\u53D6\u672C\u5730\u5F52\u6863\u65B0\u95FB...",
  loadingBody:
    "\u5217\u8868\u4F1A\u5148\u52A0\u8F7D\u6458\u8981\uFF0C\u70B9\u51FB\u5361\u7247\u540E\u4F1A\u5728\u4E0B\u65B9\u8BFB\u53D6 SQLite \u91CC\u7684\u5B8C\u6574\u4E2D\u6587\u6B63\u6587\u3002",
  emptyLabel: "\u6682\u65E0\u65B0\u95FB",
  emptyTitle: "\u76EE\u524D\u8FD8\u6CA1\u6709\u53EF\u5C55\u793A\u7684\u5F52\u6863\u6587\u7AE0\u3002",
  emptyBody:
    "\u5148\u8FD0\u884C news:fetch \u628A RSS \u53D1\u73B0\u7684\u6587\u7AE0\u6293\u53D6\u3001\u5F52\u6863\u3001\u7FFB\u8BD1\u540E\u5199\u5165\u672C\u5730\u6570\u636E\u5E93\u3002",
  errorLabel: "\u52A0\u8F7D\u5931\u8D25",
  errorTitle: "\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6 /api/news\u3002",
  errorBody:
    "\u8BF7\u786E\u8BA4\u6293\u53D6\u811A\u672C\u5DF2\u7ECF\u8FD0\u884C\u8FC7\uFF0C\u5E76\u4E14\u672C\u5730\u670D\u52A1\u6B63\u5728\u8FD0\u884C\u3002",
  leadFallback: "\u6682\u65E0\u6807\u9898",
  readerSummaryFallback: "\u8FD9\u6761\u65B0\u95FB\u6682\u65F6\u6CA1\u6709\u53EF\u7528\u7684\u6458\u8981\u3002",
  readerArchiveReady: "\u539F\u6587\u5DF2\u4E0B\u8F7D\u5E76\u5B58\u5165\u672C\u5730 SQLite \u6570\u636E\u5E93",
  readerArchivePending: "\u76EE\u524D\u53EA\u6709\u6458\u8981\uFF0C\u672A\u627E\u5230\u53EF\u7528\u7684\u539F\u6587\u6B63\u6587",
  readerViewedSeen: "\u5F53\u524D\u7528\u6237\u5DF2\u770B\u8FC7",
  readerViewedSeenAt: "\u5F53\u524D\u7528\u6237\u5DF2\u4E8E {time} \u770B\u8FC7",
  readerViewedUnseen: "\u5F53\u524D\u7528\u6237\u8FD8\u6CA1\u770B\u8FC7",
  readerBodyLoading: "\u6B63\u5728\u8BFB\u53D6\u8FD9\u6761\u65B0\u95FB\u7684\u672C\u5730\u5F52\u6863\u6B63\u6587...",
  readStatusSeen: "\u5DF2\u770B\u8FC7",
  readStatusUnread: "\u672A\u770B",
  cardStored: "\u5DF2\u5F52\u6863",
  cardSummaryOnly: "\u4EC5\u6458\u8981",
  cardOpen: "\u70B9\u51FB\u9605\u8BFB",
  unknownTime: "\u65F6\u95F4\u672A\u77E5",
  unknownSource: "\u672A\u77E5\u6765\u6E90",
  readerMetaSep: " / ",
};

const categoryMap = {
  "ai": "\u4EBA\u5DE5\u667A\u80FD",
  "ai agents": "AI \u667A\u80FD\u4F53",
  "agentic ai": "\u667A\u80FD\u4F53 AI",
  "applications": "\u5E94\u7528",
  "artificial intelligence": "\u4EBA\u5DE5\u667A\u80FD",
  "audio language model": "\u97F3\u9891\u8BED\u8A00\u6A21\u578B",
  "automatic speech recognition": "\u8BED\u97F3\u8BC6\u522B",
  "chatgpt": "ChatGPT",
  "company": "\u516C\u53F8",
  "deep learning": "\u6DF1\u5EA6\u5B66\u4E60",
  "editors pick": "\u7F16\u8F91\u7CBE\u9009",
  "government & policy": "\u653F\u7B56",
  "in brief": "\u7B80\u8BAF",
  "language model": "\u8BED\u8A00\u6A21\u578B",
  "large language model": "\u5927\u8BED\u8A00\u6A21\u578B",
  "machine learning": "\u673A\u5668\u5B66\u4E60",
  "new releases": "\u65B0\u54C1\u53D1\u5E03",
  "open source": "\u5F00\u6E90",
  "research": "\u7814\u7A76",
  "safety & alignment": "\u5B89\u5168\u4E0E\u5BF9\u9F50",
  "security": "\u5B89\u5168",
  "startups": "\u521B\u4E1A\u516C\u53F8",
  "tech news": "\u79D1\u6280\u65B0\u95FB",
  "technology": "\u6280\u672F",
  "tutorials": "\u6559\u7A0B",
  "voice ai": "\u8BED\u97F3 AI",
};

let currentPayload = null;
let currentArticleId = null;
let currentPageIndex = 0;
let detailRequestToken = 0;
let isSyncingRailScroll = false;
let currentSession = {
  currentUser: null,
  users: [],
};

const articleDetailCache = new Map();
const PAGE_SIZE = 10;

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Shanghai",
});

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function setStaticCopy() {
  document.title = ui.brand;
  elements.brandLabel.textContent = ui.brand;
  elements.siteNote.textContent = ui.siteNote;
  elements.refreshButton.textContent = ui.refresh;
  elements.userPanelLabel.textContent = ui.userPanelLabel;
  elements.userInput.placeholder = ui.userPlaceholder;
  elements.userCreateButton.textContent = ui.userCreate;
  elements.railKicker.textContent = ui.railKicker;
  elements.railTitle.textContent = ui.railTitle;
  elements.prevPageButton.textContent = ui.prevPage;
  elements.nextPageButton.textContent = ui.nextPage;
  elements.readerKicker.textContent = ui.readerKicker;
}

function showStatus(label, title, body) {
  elements.statusPanel.classList.remove("is-hidden");
  elements.statusLabel.textContent = label;
  elements.statusTitle.textContent = title;
  elements.statusBody.textContent = body;
}

function hideStatus() {
  elements.statusPanel.classList.add("is-hidden");
}

function setLoadingState(isLoading) {
  elements.refreshButton.disabled = isLoading;
  elements.refreshButton.textContent = isLoading ? ui.refreshing : ui.refresh;
}

function setUserBusyState(isBusy, mode = "idle") {
  const createLabel = mode === "create" ? ui.userCreating : ui.userCreate;

  elements.userSelect.disabled = isBusy;
  elements.userInput.disabled = isBusy;
  elements.userCreateButton.disabled = isBusy;
  elements.userCreateButton.textContent = isBusy ? (mode === "select" ? ui.userSwitching : createLabel) : ui.userCreate;
}

function formatDate(value) {
  if (!value) {
    return ui.unknownTime;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return ui.unknownTime;
  }

  return dateFormatter.format(date);
}

function getDisplayTitle(article) {
  return article?.titleZh?.trim() || article?.title?.trim() || ui.leadFallback;
}

function getDisplaySummary(article) {
  return article?.summaryZh?.trim()
    || article?.summary?.trim()
    || article?.previewTextZh?.trim()
    || article?.previewText?.trim()
    || ui.readerSummaryFallback;
}

function translateCategory(value) {
  if (!value) {
    return "";
  }

  return categoryMap[value.toLowerCase()] || value;
}

function articleBadge(article) {
  const categories = safeArray(article?.categories)
    .map((item) => translateCategory(String(item).trim()))
    .filter(Boolean);

  return categories[0] || (article?.storedLocally ? ui.cardStored : ui.cardSummaryOnly);
}

function getRequestedArticleId() {
  return new URL(window.location.href).searchParams.get("article");
}

function setRequestedArticleId(articleId) {
  const url = new URL(window.location.href);

  if (articleId) {
    url.searchParams.set("article", articleId);
  } else {
    url.searchParams.delete("article");
  }

  window.history.replaceState({}, "", url);
}

function getTotalPages(totalArticles) {
  return Math.max(1, Math.ceil(totalArticles / PAGE_SIZE));
}

function clampPageIndex(pageIndex, articles) {
  return Math.min(Math.max(pageIndex, 0), getTotalPages(articles.length) - 1);
}

function getVisibleArticles(articles) {
  const safePageIndex = clampPageIndex(currentPageIndex, articles);
  const start = safePageIndex * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  currentPageIndex = safePageIndex;

  return {
    start,
    end,
    articles: articles.slice(start, end),
  };
}

function updateRailScrollbar(options = {}) {
  const resetScroll = options.resetScroll === true;

  if (!elements.railScrollbar || !elements.railScrollbarSpacer || !elements.newsRail) {
    return;
  }

  const scrollWidth = elements.newsRail.scrollWidth;
  const clientWidth = elements.newsRail.clientWidth;
  const hasOverflow = scrollWidth > clientWidth + 1;

  elements.railScrollbar.hidden = !hasOverflow;
  elements.railScrollbarSpacer.style.width = `${scrollWidth}px`;

  if (resetScroll) {
    elements.newsRail.scrollLeft = 0;
    elements.railScrollbar.scrollLeft = 0;
    return;
  }

  elements.railScrollbar.scrollLeft = elements.newsRail.scrollLeft;
}

function syncRailScroll(source, target) {
  if (isSyncingRailScroll) {
    return;
  }

  isSyncingRailScroll = true;
  target.scrollLeft = source.scrollLeft;

  window.requestAnimationFrame(() => {
    isSyncingRailScroll = false;
  });
}

function renderUserPanel() {
  const users = safeArray(currentSession.users);
  const currentUserId = currentSession.currentUser?.id || "";

  elements.userSelect.innerHTML = users.length > 0
    ? users.map((user) => `
        <option value="${escapeAttribute(user.id)}"${user.id === currentUserId ? " selected" : ""}>
          ${escapeHtml(user.name)}
        </option>
      `).join("")
    : `<option value="">${escapeHtml(ui.userFallback)}</option>`;

  if (currentSession.currentUser) {
    elements.userMeta.textContent = ui.userMeta
      .replace("{name}", currentSession.currentUser.name)
      .replace("{count}", String(currentSession.currentUser.viewedCount || 0));
  } else {
    elements.userMeta.textContent = ui.userFallback;
  }
}

function renderReader(article, detail) {
  const source = detail || article || null;
  const bodySource = source?.contentTextZh?.trim()
    || source?.contentText?.trim()
    || article?.previewTextZh?.trim()
    || article?.previewText?.trim()
    || "";
  const paragraphs = bodySource
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const isViewed = Boolean(source?.isViewed);
  const viewedAt = source?.viewedAt;

  elements.readerTitle.textContent = source ? getDisplayTitle(source) : ui.emptyTitle;
  elements.readerMeta.textContent = source
    ? [source.sourceName || ui.unknownSource, formatDate(source.publishedAt)].join(ui.readerMetaSep)
    : ui.unknownSource;
  elements.readerArchive.textContent = source?.storedLocally
    ? ui.readerArchiveReady
    : ui.readerArchivePending;
  elements.readerViewed.textContent = isViewed
    ? (viewedAt ? ui.readerViewedSeenAt.replace("{time}", formatDate(viewedAt)) : ui.readerViewedSeen)
    : ui.readerViewedUnseen;
  elements.readerSummary.textContent = source ? getDisplaySummary(source) : ui.readerSummaryFallback;
  elements.readerBody.innerHTML = paragraphs.length > 0
    ? paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")
    : `<p>${escapeHtml(ui.readerBodyLoading)}</p>`;
}

function scrollReaderIntoView() {
  elements.readerPanel?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function updateArticleViewedState(articleId, viewedAt) {
  if (!currentPayload) {
    return;
  }

  currentPayload.articles = safeArray(currentPayload.articles).map((article) => (
    article.id === articleId
      ? { ...article, isViewed: true, viewedAt }
      : article
  ));

  if (articleDetailCache.has(articleId)) {
    articleDetailCache.set(articleId, {
      ...articleDetailCache.get(articleId),
      isViewed: true,
      viewedAt,
    });
  }
}

function updateCurrentUser(user) {
  if (!user) {
    return;
  }

  currentSession = {
    currentUser: user,
    users: safeArray(currentSession.users).map((item) => (item.id === user.id ? user : item)),
  };
  renderUserPanel();
}

async function markArticleAsViewed(articleId) {
  if (!articleId || !currentSession.currentUser) {
    return;
  }

  const article = safeArray(currentPayload?.articles).find((item) => item.id === articleId);
  if (!article || article.isViewed) {
    return;
  }

  try {
    const response = await fetch(`/api/news/${encodeURIComponent(articleId)}/view`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const viewedAt = payload?.viewedAt || new Date().toISOString();

    updateArticleViewedState(articleId, viewedAt);

    if (payload?.currentUser) {
      updateCurrentUser(payload.currentUser);
    }

    if (currentArticleId === articleId) {
      const selectedArticle = safeArray(currentPayload?.articles).find((item) => item.id === articleId) || article;
      renderReader(selectedArticle, articleDetailCache.get(articleId) || null);
      renderRail(safeArray(currentPayload?.articles));
    }
  } catch (error) {
    console.error(error);
  }
}

function selectArticle(article, options = {}) {
  if (!article) {
    return;
  }

  currentArticleId = article.id;
  setRequestedArticleId(article.id);
  renderReader(article, articleDetailCache.get(article.id) || null);
  renderRail(safeArray(currentPayload?.articles));
  loadArticleDetail(article.id);
  markArticleAsViewed(article.id);

  if (options.scroll === true) {
    scrollReaderIntoView();
  }
}

function renderRail(articles, options = {}) {
  const resetScroll = options.resetScroll === true;
  const { start, articles: visibleArticles } = getVisibleArticles(articles);
  const rangeStart = visibleArticles.length > 0 ? start + 1 : 0;
  const rangeEnd = start + visibleArticles.length;
  const totalPages = getTotalPages(articles.length);

  elements.newsRail.innerHTML = visibleArticles.map((article) => `
      <button
        class="news-card${article.id === currentArticleId ? " is-active" : ""}"
        type="button"
        data-article-id="${escapeAttribute(article.id)}"
      >
        <p class="news-card__source">${escapeHtml(article.sourceName || ui.unknownSource)}</p>
        <h3 class="news-card__title">${escapeHtml(getDisplayTitle(article))}</h3>
        <p class="news-card__summary">${escapeHtml(article.previewTextZh || getDisplaySummary(article))}</p>
        <div class="news-card__footer">
          <span class="pill">${escapeHtml(articleBadge(article))}</span>
          <span class="pill">${escapeHtml(article.storedLocally ? ui.cardStored : ui.cardSummaryOnly)}</span>
          <span class="pill${article.isViewed ? " pill--seen" : ""}">${escapeHtml(article.isViewed ? ui.readStatusSeen : ui.readStatusUnread)}</span>
        </div>
      </button>
    `).join("");

  elements.railCount.textContent = `\u5F53\u524D ${rangeStart}-${rangeEnd} / ${articles.length} \u6761`;
  elements.prevPageButton.disabled = currentPageIndex <= 0;
  elements.nextPageButton.disabled = currentPageIndex >= totalPages - 1;

  elements.newsRail.querySelectorAll(".news-card").forEach((button) => {
    button.addEventListener("click", () => {
      const articleItem = safeArray(currentPayload?.articles).find(
        (item) => item.id === button.dataset.articleId,
      );

      if (!articleItem) {
        return;
      }

      selectArticle(articleItem, { scroll: true });
    });
  });

  updateRailScrollbar({ resetScroll });
}

function normalizePayload(payload) {
  const articles = safeArray(payload?.articles)
    .map((article) => ({
      id: article?.id || crypto.randomUUID(),
      title: article?.title || "",
      titleZh: article?.titleZh || "",
      summary: article?.summary || "",
      summaryZh: article?.summaryZh || "",
      url: article?.url || "",
      sourceId: article?.sourceId || "",
      sourceName: article?.sourceName || ui.unknownSource,
      publishedAt: article?.publishedAt || "",
      imageUrl: article?.imageUrl || "",
      categories: safeArray(article?.categories),
      previewText: article?.previewText || "",
      previewTextZh: article?.previewTextZh || "",
      storedLocally: Boolean(article?.storedLocally),
      isViewed: Boolean(article?.isViewed),
      viewedAt: article?.viewedAt || null,
    }))
    .sort((left, right) => new Date(right.publishedAt || 0) - new Date(left.publishedAt || 0));

  return {
    generatedAt: payload?.generatedAt || "",
    total: typeof payload?.total === "number" ? payload.total : articles.length,
    sources: safeArray(payload?.sources),
    articles,
  };
}

function normalizeArticleDetail(article) {
  return {
    id: article?.id || "",
    title: article?.title || "",
    titleZh: article?.titleZh || "",
    summary: article?.summary || "",
    summaryZh: article?.summaryZh || "",
    contentText: article?.contentText || "",
    contentTextZh: article?.contentTextZh || "",
    sourceName: article?.sourceName || ui.unknownSource,
    publishedAt: article?.publishedAt || "",
    categories: safeArray(article?.categories),
    storedLocally: Boolean(article?.storedLocally),
    isViewed: Boolean(article?.isViewed),
    viewedAt: article?.viewedAt || null,
  };
}

async function loadArticleDetail(articleId) {
  if (!articleId) {
    return;
  }

  if (articleDetailCache.has(articleId)) {
    const summaryArticle = safeArray(currentPayload?.articles).find((item) => item.id === articleId);
    if (summaryArticle) {
      renderReader(summaryArticle, articleDetailCache.get(articleId));
    }
    return;
  }

  const requestToken = ++detailRequestToken;
  const summaryArticle = safeArray(currentPayload?.articles).find((item) => item.id === articleId);

  if (summaryArticle) {
    elements.readerBody.innerHTML = `<p>${escapeHtml(ui.readerBodyLoading)}</p>`;
  }

  try {
    const response = await fetch(`/api/news/${encodeURIComponent(articleId)}`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const detail = normalizeArticleDetail(await response.json());
    articleDetailCache.set(articleId, detail);

    if (requestToken === detailRequestToken && summaryArticle && currentArticleId === articleId) {
      renderReader(summaryArticle, detail);
    }
  } catch (error) {
    console.error(error);
    if (requestToken === detailRequestToken && summaryArticle) {
      renderReader(summaryArticle, null);
    }
  }
}

async function fetchSession() {
  try {
    const response = await fetch("/api/session", {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const payload = await response.json();
    currentSession = {
      currentUser: payload?.currentUser || null,
      users: safeArray(payload?.users),
    };
    renderUserPanel();
  } catch (error) {
    console.error(error);
    currentSession = {
      currentUser: null,
      users: [],
    };
    renderUserPanel();
  }
}

async function fetchNews() {
  setLoadingState(true);
  showStatus(ui.loadingLabel, ui.loadingTitle, ui.loadingBody);

  try {
    const response = await fetch("/api/news", {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    currentPayload = normalizePayload(await response.json());
    currentArticleId = getRequestedArticleId() || currentPayload.articles[0]?.id || null;

    if (!currentPayload.articles.length) {
      renderReader(null, null);
      elements.newsRail.innerHTML = "";
      elements.railScrollbar.hidden = true;
      elements.railCount.textContent = "";
      elements.prevPageButton.disabled = true;
      elements.nextPageButton.disabled = true;
      showStatus(ui.emptyLabel, ui.emptyTitle, ui.emptyBody);
      return;
    }

    const requestedArticle = safeArray(currentPayload.articles).find(
      (item) => item.id === currentArticleId,
    ) || currentPayload.articles[0];
    const requestedArticleIndex = safeArray(currentPayload.articles).findIndex(
      (item) => item.id === requestedArticle.id,
    );

    currentArticleId = requestedArticle.id;
    currentPageIndex = Math.floor(Math.max(requestedArticleIndex, 0) / PAGE_SIZE);
    hideStatus();
    renderRail(currentPayload.articles, { resetScroll: true });
    renderReader(requestedArticle, articleDetailCache.get(currentArticleId) || null);
    await loadArticleDetail(currentArticleId);
    markArticleAsViewed(currentArticleId);
  } catch (error) {
    console.error(error);
    showStatus(ui.errorLabel, ui.errorTitle, ui.errorBody);
  } finally {
    setLoadingState(false);
  }
}

async function switchUser(userId) {
  if (!userId) {
    return;
  }

  setUserBusyState(true, "select");

  try {
    const response = await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ userId }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const payload = await response.json();
    currentSession = {
      currentUser: payload?.currentUser || null,
      users: safeArray(payload?.users),
    };
    renderUserPanel();
    articleDetailCache.clear();
    await fetchNews();
  } catch (error) {
    console.error(error);
    await fetchSession();
  } finally {
    setUserBusyState(false);
  }
}

async function createUser(name) {
  const normalizedName = String(name ?? "").replace(/\s+/g, " ").trim();

  if (!normalizedName) {
    elements.userInput.focus();
    return;
  }

  setUserBusyState(true, "create");

  try {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ name: normalizedName }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const payload = await response.json();
    currentSession = {
      currentUser: payload?.currentUser || null,
      users: safeArray(payload?.users),
    };
    elements.userInput.value = "";
    renderUserPanel();
    articleDetailCache.clear();
    await fetchNews();
  } catch (error) {
    console.error(error);
  } finally {
    setUserBusyState(false);
  }
}

function goToPage(nextPageIndex) {
  if (!currentPayload) {
    return;
  }

  const articles = safeArray(currentPayload.articles);
  const safeNextPageIndex = clampPageIndex(nextPageIndex, articles);

  if (safeNextPageIndex === currentPageIndex) {
    return;
  }

  currentPageIndex = safeNextPageIndex;
  const nextVisibleArticles = getVisibleArticles(articles).articles;
  const nextArticle = nextVisibleArticles[0] || null;

  if (nextArticle) {
    currentArticleId = nextArticle.id;
    setRequestedArticleId(nextArticle.id);
    renderReader(nextArticle, articleDetailCache.get(nextArticle.id) || null);
    loadArticleDetail(nextArticle.id);
    markArticleAsViewed(nextArticle.id);
  }

  renderRail(articles, { resetScroll: true });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

setStaticCopy();
renderUserPanel();

elements.refreshButton.addEventListener("click", async () => {
  articleDetailCache.clear();
  await fetchNews();
});

elements.userSelect.addEventListener("change", async (event) => {
  await switchUser(event.target.value);
});

elements.userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createUser(elements.userInput.value);
});

elements.prevPageButton.addEventListener("click", () => {
  goToPage(currentPageIndex - 1);
});

elements.nextPageButton.addEventListener("click", () => {
  goToPage(currentPageIndex + 1);
});

elements.newsRail.addEventListener("scroll", () => {
  syncRailScroll(elements.newsRail, elements.railScrollbar);
});

elements.railScrollbar.addEventListener("scroll", () => {
  syncRailScroll(elements.railScrollbar, elements.newsRail);
});

window.addEventListener("resize", () => {
  updateRailScrollbar();
});

await fetchSession();
await fetchNews();
