/** Preferences must not prevent the app from starting in restricted browsers. */
export function createBrowserStorage(getStorage) {
  const memory = new Map();
  return {
    getItem(key) {
      if (memory.has(key)) return memory.get(key);
      try { return getStorage()?.getItem(key) ?? null; } catch { return null; }
    },
    setItem(key, value) {
      const text = String(value);
      try {
        getStorage().setItem(key, text);
        memory.delete(key);
        return true;
      } catch {
        memory.set(key, text);
        return false;
      }
    },
    removeItem(key) {
      // A tombstone also hides an old value when persistent removal is denied.
      memory.set(key, null);
      try { getStorage().removeItem(key); memory.delete(key); } catch { /* memory fallback */ }
    },
  };
}

export const browserStorage = createBrowserStorage(() => globalThis.localStorage);
