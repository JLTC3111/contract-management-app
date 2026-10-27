import { useEffect, useRef, useState } from 'react';
import { browserStorage } from '../utils/browserStorage';
import { useTranslation } from 'react-i18next';

export const draftKey = (accountId, scope) => `contract.draft:${accountId}:${scope}`;
export function readDraft(key) {
  try {
    const saved = JSON.parse(browserStorage.getItem(key));
    return saved?.version === 1 && Object.hasOwn(saved, 'value') ? saved.value : null;
  } catch { return null; }
}

/** Text is durable; File objects remain available during in-app navigation. */
const filesInMemory = new Map();
export const draftFiles = {
  get: (key) => filesInMemory.get(key) || [],
  set: (key, files) => files.length ? filesInMemory.set(key, files) : filesInMemory.delete(key),
};

export function useDraftRecovery({ accountId, scope, value, dirty, onRestore, onDiscard }) {
  const { t } = useTranslation();
  const key = draftKey(accountId, scope);
  const [saved, setSaved] = useState(() => ({ key, value: accountId ? readDraft(key) : null }));
  const pending = saved.key === key ? saved.value : accountId ? readDraft(key) : null;
  const setPending = (next) => setSaved({ key, value: next });
  const [storageFailed, setStorageFailed] = useState(false);
  const context = useRef({ key, cleared: null });
  if (context.current.key !== key) context.current = { key, cleared: null };
  const latest = context.current;
  Object.assign(latest, { value, dirty, pending, onRestore, onDiscard });
  const persist = () => {
    const current = latest;
    if (!accountId || current.pending || !current.dirty || current.cleared === JSON.stringify(current.value)) return;
    const stored = browserStorage.setItem(key, JSON.stringify({ version: 1, value: current.value }));
    setStorageFailed(!stored);
  };

  useEffect(persist, [key, value, dirty, pending]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const beforeUnload = (event) => {
      persist();
      if (latest.dirty) { event.preventDefault(); event.returnValue = ''; }
    };
    const hide = () => persist();
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('pagehide', hide);
    return () => {
      // Also flush when a sidebar/router action unmounts the form.
      persist();
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('pagehide', hide);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const clear = () => {
    latest.cleared = JSON.stringify(latest.value);
    browserStorage.removeItem(key);
    draftFiles.set(key, []);
    setPending(null);
  };
  return {
    key, pending: !!pending, storageFailed,
    restore() { latest.onRestore?.(pending); setPending(null); },
    discard() { clear(); latest.onDiscard?.(); },
    clear,
    checkpoint(nextValue) {
      latest.value = nextValue;
      setStorageFailed(!browserStorage.setItem(key, JSON.stringify({ version: 1, value: nextValue })));
    },
    confirmLeave: () => !latest.dirty || window.confirm(t('recovery.leaveDraft', 'Leave this form? A recovery draft will be kept.')),
  };
}
