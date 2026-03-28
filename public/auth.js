const pageMode = document.body.dataset.authPage === 'register' ? 'register' : 'login';

const elements = {
  form: document.querySelector('#auth-page-form'),
  body: document.querySelector('#auth-page-body'),
  feedback: document.querySelector('#auth-page-feedback'),
  submitButton: document.querySelector('#auth-submit-button'),
  switchLink: document.querySelector('#auth-switch-link'),
  backLink: document.querySelector('#auth-back-link'),
  identifier: document.querySelector('#auth-identifier'),
  name: document.querySelector('#auth-name'),
  email: document.querySelector('#auth-email'),
  password: document.querySelector('#auth-password'),
  confirmPassword: document.querySelector('#auth-confirm-password'),
};

const copy = {
  lockedBody: '这篇内容受登录保护。先完成登录，再回到刚才的新闻或论文继续阅读。',
  defaultLoginBody: '登录后会解锁完整正文、记录已读状态，并保留你的阅读会话。',
  defaultRegisterBody: '注册后可解锁全部本地归档内容，并保存你的个人阅读进度。',
  loginSubmitting: '正在登录…',
  registerSubmitting: '正在创建账号…',
  loginSuccess: '登录成功，正在跳转…',
  registerSuccess: '注册成功，正在跳转…',
  passwordMismatch: '两次输入的密码不一致。',
  genericError: '操作失败，请稍后再试。',
  loginSubmit: '登录账号',
  registerSubmit: '创建账号',
};

const params = new URLSearchParams(window.location.search);
const returnTo = normalizeReturnTo(params.get('returnTo'));
const reason = params.get('reason');

if (elements.backLink) {
  elements.backLink.href = returnTo;
}

if (elements.switchLink) {
  const targetPath = pageMode === 'login' ? '/register' : '/login';
  const nextParams = new URLSearchParams();

  if (reason) {
    nextParams.set('reason', reason);
  }

  if (returnTo) {
    nextParams.set('returnTo', returnTo);
  }

  elements.switchLink.href = `${targetPath}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`;
}

if (elements.body) {
  if (reason === 'locked') {
    elements.body.textContent = copy.lockedBody;
  } else {
    elements.body.textContent = pageMode === 'register' ? copy.defaultRegisterBody : copy.defaultLoginBody;
  }
}

await redirectIfAlreadyAuthenticated();

elements.form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (pageMode === 'register') {
    await register();
    return;
  }

  await login();
});

async function redirectIfAlreadyAuthenticated() {
  try {
    const response = await fetch('/api/auth/session', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    if (payload?.authenticated) {
      window.location.replace(returnTo);
    }
  } catch {
    // Ignore standalone auth page session probe failures.
  }
}

async function login() {
  setFeedback('');
  setSubmittingState(true);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        identifier: elements.identifier?.value.trim() ?? '',
        password: elements.password?.value ?? '',
      }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setFeedback(payload?.error || copy.genericError, 'error');
      return;
    }

    setFeedback(copy.loginSuccess, 'success');
    window.location.assign(returnTo);
  } catch (error) {
    console.error(error);
    setFeedback(copy.genericError, 'error');
  } finally {
    setSubmittingState(false);
  }
}

async function register() {
  if ((elements.password?.value ?? '') !== (elements.confirmPassword?.value ?? '')) {
    setFeedback(copy.passwordMismatch, 'error');
    return;
  }

  setFeedback('');
  setSubmittingState(true);

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: elements.name?.value.trim() ?? '',
        email: elements.email?.value.trim() ?? '',
        password: elements.password?.value ?? '',
      }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setFeedback(payload?.error || copy.genericError, 'error');
      return;
    }

    setFeedback(copy.registerSuccess, 'success');
    window.location.assign(returnTo);
  } catch (error) {
    console.error(error);
    setFeedback(copy.genericError, 'error');
  } finally {
    setSubmittingState(false);
  }
}

function setSubmittingState(isSubmitting) {
  const inputs = [
    elements.identifier,
    elements.name,
    elements.email,
    elements.password,
    elements.confirmPassword,
  ].filter(Boolean);

  for (const input of inputs) {
    input.disabled = isSubmitting;
  }

  if (elements.submitButton) {
    elements.submitButton.disabled = isSubmitting;
    elements.submitButton.textContent = isSubmitting
      ? (pageMode === 'register' ? copy.registerSubmitting : copy.loginSubmitting)
      : (pageMode === 'register' ? copy.registerSubmit : copy.loginSubmit);
  }
}

function setFeedback(message, tone = 'neutral') {
  if (!elements.feedback) {
    return;
  }

  elements.feedback.textContent = message;
  elements.feedback.dataset.tone = tone;
}

function normalizeReturnTo(value) {
  const fallback = '/account';
  const raw = String(value ?? '').trim();

  if (!raw || !raw.startsWith('/')) {
    return fallback;
  }

  return raw;
}
