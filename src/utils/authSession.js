import { browserStorage } from './browserStorage.js';
import { withDeadline } from './network.js';

/** A durable local logout blocks late refreshes, including in another tab. */
export function createAuthStorage(key, storage = browserStorage) {
  const logoutKey = `${key}:signed-out`;
  return {
    key, logoutKey,
    isSignedOut: () => storage.getItem(logoutKey) === 'true',
    getItem(name) {
      return name === key && this.isSignedOut() ? null : storage.getItem(name);
    },
    setItem(name, value) {
      if (name !== key || !this.isSignedOut()) storage.setItem(name, value);
    },
    removeItem: (name) => storage.removeItem(name),
    allowSignIn() { storage.removeItem(logoutKey); },
    clearSession() {
      let session = null;
      try { session = JSON.parse(storage.getItem(key)); } catch { /* invalid/absent session */ }
      storage.setItem(logoutKey, 'true');
      storage.removeItem(key);
      storage.removeItem(`${key}-code-verifier`);
      return session;
    },
  };
}

export async function signOutClient(auth, storage) {
  const session = storage.clearSession();
  // getSession now sees no local token, so this documented API clears SDK state
  // and notifies other tabs without depending on the remote logout endpoint.
  const local = withDeadline(auth.signOut({ scope: 'local' })).catch(() => {});
  const remote = session?.access_token
    ? withDeadline(auth.admin.signOut(session.access_token, 'global')).catch((error) => ({ error }))
    : Promise.resolve({ error: null });
  const [, result] = await Promise.all([local, remote]);
  return result;
}
