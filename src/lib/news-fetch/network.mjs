import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const DEFAULT_FETCH_USER_AGENT = 'DailyAINewsBot/1.0 (+https://github.com/openai/codex)';

export async function fetchTextWithFallback(url, options = {}) {
  const accept = options.accept ?? '*/*';
  const userAgent = options.userAgent ?? DEFAULT_FETCH_USER_AGENT;
  const timeoutMs = options.timeoutMs ?? 15000;

  try {
    return await fetchTextWithNative(url, { accept, userAgent, timeoutMs });
  } catch (nativeError) {
    if (process.platform === 'win32') {
      try {
        return await fetchTextWithPowerShell(url, { accept, timeoutMs });
      } catch {
        // Fall through and surface the original network error below.
      }
    }

    throw nativeError;
  }
}

async function fetchTextWithNative(url, { accept, userAgent, timeoutMs }) {
  const response = await fetch(url, {
    headers: {
      accept,
      'user-agent': userAgent,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchTextWithPowerShell(url, { accept, timeoutMs }) {
  const command = [
    '$ProgressPreference = "SilentlyContinue"',
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    `$response = Invoke-WebRequest -UseBasicParsing -TimeoutSec ${Math.max(5, Math.ceil(timeoutMs / 1000))} -Uri '${escapePowerShellString(url)}' -Headers @{ 'User-Agent' = 'Mozilla/5.0'; 'Accept' = '${escapePowerShellString(accept)}' }`,
    '$response.Content',
  ].join('; ');

  const result = await execFileAsync(
    'powershell',
    ['-NoProfile', '-Command', command],
    {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      timeout: timeoutMs + 5000,
    },
  );

  return String(result.stdout ?? '').trim();
}

function escapePowerShellString(value) {
  return String(value ?? '').replace(/'/g, "''");
}
