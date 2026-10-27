import { useEffect, useRef } from 'react';

/** Refresh reads after reconnect/resume without remounting the page or its forms. */
export function useRevalidate(refresh, enabled = true) {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    if (!enabled) return undefined;
    let timer;
    const resume = () => {
      if (document.visibilityState === 'hidden' || navigator.onLine === false) return;
      clearTimeout(timer);
      timer = setTimeout(() => { Promise.resolve(latest.current()).catch(() => {}); }, 250);
    };
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [enabled]);
}
