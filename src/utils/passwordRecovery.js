const STORAGE_KEY = 'passwordRecoveryUserId';

/** Keep recovery separate from ordinary sign-in, including after a page reload. */
export function createPasswordRecovery(auth, browser = globalThis) {
  const listeners = new Set();
  const url = new URL(browser.location?.href || 'http://localhost');
  const hash = new URLSearchParams(url.hash.slice(1));
  const isRecoveryLink = hash.get('type') === 'recovery';
  const hasLinkError = [hash, url.searchParams].some((params) =>
    params.has('error') || params.has('error_code') || params.has('error_description'));
  const invalidLink = (hasLinkError && (isRecoveryLink || url.pathname === '/login')) ||
    (isRecoveryLink && (!hash.get('access_token') || !hash.get('refresh_token')));

  // Store only the account ID. Supabase owns the session and validates the token.
  const readAccount = () => {
    try { return browser.sessionStorage?.getItem(STORAGE_KEY); }
    catch { return null; }
  };
  const storeAccount = (id) => {
    try {
      if (id) browser.sessionStorage?.setItem(STORAGE_KEY, id);
      else browser.sessionStorage?.removeItem(STORAGE_KEY);
    } catch { /* Recovery still works when browser storage is unavailable. */ }
  };
  const savedAccount = readAccount();
  let state = isRecoveryLink || invalidLink || savedAccount ? { status: 'pending' } : null;
  const setState = (next) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  const invalidate = () => {
    storeAccount(null);
    setState({ status: 'invalid' });
  };
  const activate = (session) => {
    if (!session?.user?.id) return invalidate();
    storeAccount(session.user.id);
    setState({ status: 'ready', userId: session.user.id, email: session.user.email });
  };

  // Subscribe before React mounts: the SDK consumes the URL and emits recovery
  // during initialization. Calling other auth methods inside this callback
  // would contend with the SDK's session lock.
  const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      if (invalidLink) invalidate();
      else activate(session);
    } else if (state?.status === 'ready' && session?.user?.id !== state.userId) {
      invalidate();
    }
  });

  const initialized = (async () => {
    try {
      const { error } = await auth.initialize();
      if (state?.status !== 'pending') return;
      if (error || invalidLink) return invalidate();
      const { data: { session }, error: sessionError } = await auth.getSession();
      if (sessionError || !session?.user?.id ||
          (!isRecoveryLink && session.user.id !== savedAccount)) return invalidate();
      activate(session);
    } catch {
      if (state?.status === 'pending') invalidate();
    }
  })();

  return {
    initialized,
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async updatePassword(password) {
      const userId = state?.status === 'ready' ? state.userId : null;
      const { data: { session }, error } = await auth.getSession();
      if (error || !userId || session?.user?.id !== userId ||
          state?.status !== 'ready' || state.userId !== userId) {
        invalidate();
        return { error: { code: 'session_expired' } };
      }
      const result = await auth.updateUser({ password });
      if (!result.error) {
        storeAccount(null);
        setState({ status: 'complete' });
      } else if (result.error.status === 401 ||
          ['session_expired', 'session_not_found', 'refresh_token_not_found'].includes(result.error.code)) {
        invalidate();
      }
      return result;
    },
    dismiss() {
      storeAccount(null);
      setState(null);
    },
    dispose() {
      subscription.unsubscribe();
      listeners.clear();
    },
  };
}
