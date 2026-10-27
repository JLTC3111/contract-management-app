export const REQUEST_TIMEOUT_MS = 15000;
export const UPLOAD_TIMEOUT_MS = 120000;
let sessionVerified = false;
export const setSessionVerified = (verified) => { sessionVerified = verified; };

export function withDeadline(work, timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('The connection timed out. Please try again.'), {
      code: 'request_timeout',
    })), timeoutMs);
    Promise.resolve(work).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

/** Bound both response headers and the body; never automatically replay writes. */
export async function fetchWithDeadline(input, options = {}, timeoutMs) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  const method = (options.method || input.method || 'GET').toUpperCase();
  if (!sessionVerified && !url.pathname.startsWith('/auth/v1/') &&
      !['GET', 'HEAD', 'OPTIONS'].includes(method) && !url.pathname.startsWith('/storage/v1/object/list/')) {
    throw Object.assign(new Error('Reconnect and verify your session before saving changes.'), { code: 'session_unverified' });
  }
  const controller = new AbortController();
  const signal = options.signal || (typeof Request !== 'undefined' && input instanceof Request ? input.signal : null);
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const largeTransfer = url.pathname.startsWith('/storage/v1/object/') &&
    !/^\/storage\/v1\/object\/(list|sign)\//.test(url.pathname) && ['GET', 'POST', 'PUT'].includes(method);
  const limit = timeoutMs ?? (largeTransfer ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
  try {
    return await withDeadline((async () => {
      const response = await fetch(input, { ...options, signal: controller.signal });
      const body = await response.arrayBuffer();
      return new Response([204, 205, 304].includes(response.status) ? null : body, {
        status: response.status, statusText: response.statusText, headers: response.headers,
      });
    })(), limit);
  } finally {
    controller.abort();
    signal?.removeEventListener('abort', abort);
  }
}

export const isRetryableError = (error) => {
  if (/^(22|23|28|42)/.test(error?.code || '') ||
      /^PGRST(1|2|3)/.test(error?.code || '') ||
      ['CONTRACT_SCHEMA_MISMATCH', 'session_unverified'].includes(error?.code)) return false;
  const status = Number(error?.status || error?.statusCode || 0);
  return !status || status === 408 || status === 429 || status >= 500;
};
