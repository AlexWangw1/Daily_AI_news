const elements = {
  headerStatus: document.querySelector('#account-header-status'),
  logoutButton: document.querySelector('#account-logout-button'),
  name: document.querySelector('#account-name'),
  email: document.querySelector('#account-email'),
  createdAt: document.querySelector('#account-created-at'),
  viewedCount: document.querySelector('#account-viewed-count'),
  passwordStatus: document.querySelector('#account-password-status'),
  passwordUpdatedAt: document.querySelector('#account-password-updated-at'),
  sessionExpiresAt: document.querySelector('#account-session-expires-at'),
  providerList: document.querySelector('#account-provider-list'),
  passwordForm: document.querySelector('#account-password-form'),
  currentPassword: document.querySelector('#account-current-password'),
  nextPassword: document.querySelector('#account-next-password'),
  confirmPassword: document.querySelector('#account-confirm-password'),
  passwordSubmit: document.querySelector('#account-password-submit'),
  passwordFeedback: document.querySelector('#account-password-feedback'),
};

const copy = {
  passwordSaved: '密码已更新。',
  passwordMismatch: '两次输入的新密码不一致。',
  genericError: '操作失败，请稍后再试。',
  submitting: '保存中…',
  submit: '保存新密码',
  passwordEnabled: '已启用密码登录',
  passwordDisabled: '尚未设置密码',
  unknown: '暂未记录',
  viewedUnit: '篇',
  providerAction: '等待接入',
};

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Shanghai',
});

let accountState = null;

await bootstrap();

async function bootstrap() {
  bindEvents();
  const account = await fetchAccountProfile();

  if (!account) {
    return;
  }

  accountState = account;
  renderAccount(account);
}

function bindEvents() {
  elements.logoutButton?.addEventListener('click', async () => {
    await logout();
  });

  elements.passwordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await changePassword();
  });
}

async function fetchAccountProfile() {
  try {
    const response = await fetch('/api/account', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (response.status === 401) {
      redirectToLogin();
      return null;
    }

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    setPasswordFeedback(copy.genericError, 'error');
    return null;
  }
}

function renderAccount(account) {
  const user = account?.user || {};
  const security = account?.security || {};

  document.title = `${user.name || '用户'} | 用户中心`;
  elements.headerStatus.textContent = `${user.name || '已登录'} · ${user.email || '未填写邮箱'}`;
  elements.name.textContent = user.name || copy.unknown;
  elements.email.textContent = user.email || copy.unknown;
  elements.createdAt.textContent = formatDate(user.createdAt);
  elements.viewedCount.textContent = `${Number(user.viewedCount ?? security.viewedCount ?? 0)} ${copy.viewedUnit}`;
  elements.passwordStatus.textContent = security.passwordEnabled ? copy.passwordEnabled : copy.passwordDisabled;
  elements.passwordUpdatedAt.textContent = formatDate(security.passwordUpdatedAt);
  elements.sessionExpiresAt.textContent = formatDate(security.sessionExpiresAt);
  renderProviders(account?.providers ?? []);
}

function renderProviders(providers) {
  if (!elements.providerList) {
    return;
  }

  elements.providerList.replaceChildren();

  for (const provider of providers) {
    const article = document.createElement('article');
    article.className = 'account-provider';

    const main = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'account-provider__name';
    title.textContent = provider.name || '第三方平台';

    const body = document.createElement('p');
    body.className = 'account-provider__body';
    body.textContent = provider.description || '';

    const hint = document.createElement('p');
    hint.className = 'account-provider__hint';
    hint.textContent = provider.detail || '';

    main.append(title, body, hint);

    const side = document.createElement('div');
    side.className = 'account-provider__side';

    const badge = document.createElement('span');
    badge.className = `account-provider__badge ${provider.status === 'ready' ? 'is-ready' : ''}`.trim();
    badge.textContent = provider.statusLabel || copy.providerAction;

    const button = document.createElement('button');
    button.className = 'ghost-button account-provider__action';
    button.type = 'button';
    button.textContent = copy.providerAction;
    button.disabled = true;

    side.append(badge, button);
    article.append(main, side);
    elements.providerList.append(article);
  }
}

async function changePassword() {
  const currentPassword = elements.currentPassword?.value ?? '';
  const nextPassword = elements.nextPassword?.value ?? '';
  const confirmPassword = elements.confirmPassword?.value ?? '';

  if (nextPassword !== confirmPassword) {
    setPasswordFeedback(copy.passwordMismatch, 'error');
    return;
  }

  setPasswordFeedback('', 'neutral');
  setPasswordSubmitting(true);

  try {
    const response = await fetch('/api/account/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        currentPassword,
        nextPassword,
      }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));

    if (response.status === 401) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      setPasswordFeedback(payload?.error || copy.genericError, 'error');
      return;
    }

    if (accountState) {
      accountState.user = payload.user || accountState.user;
      accountState.security = {
        ...accountState.security,
        ...payload.security,
      };
      renderAccount(accountState);
    }

    elements.passwordForm?.reset();
    setPasswordFeedback(copy.passwordSaved, 'success');
  } catch (error) {
    console.error(error);
    setPasswordFeedback(copy.genericError, 'error');
  } finally {
    setPasswordSubmitting(false);
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

  redirectToLogin('/');
}

function setPasswordSubmitting(isSubmitting) {
  const fields = [
    elements.currentPassword,
    elements.nextPassword,
    elements.confirmPassword,
  ].filter(Boolean);

  for (const field of fields) {
    field.disabled = isSubmitting;
  }

  if (elements.passwordSubmit) {
    elements.passwordSubmit.disabled = isSubmitting;
    elements.passwordSubmit.textContent = isSubmitting ? copy.submitting : copy.submit;
  }
}

function setPasswordFeedback(message, tone = 'neutral') {
  if (!elements.passwordFeedback) {
    return;
  }

  elements.passwordFeedback.textContent = message;
  elements.passwordFeedback.dataset.tone = tone;
}

function redirectToLogin(returnTo = '/account') {
  const params = new URLSearchParams();
  params.set('returnTo', returnTo);
  window.location.replace(`/login?${params.toString()}`);
}

function formatDate(value) {
  const timestamp = Date.parse(String(value ?? ''));

  if (Number.isNaN(timestamp)) {
    return copy.unknown;
  }

  return dateFormatter.format(timestamp);
}
