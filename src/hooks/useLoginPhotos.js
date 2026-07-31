import { useEffect, useRef, useState } from 'react';

/** How long each photo is held before crossfading to the next. */
const INTERVAL_MS = 7000;

/** Fetched once per page load and shared by every caller. */
let manifestPromise = null;

const loadManifest = () => {
  if (!manifestPromise) {
    manifestPromise = fetch('/loginphotos/manifest.json')
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));
  }
  return manifestPromise;
};

/**
 * The photo set for a language, rotating.
 *
 * `public/loginphotos/manifest.json` is written at build time by
 * scripts/loginphotos-manifest.js - a browser cannot list a folder, and probing
 * for guessed names would put 404s in the console.
 *
 * A language with no photos of its own falls back to the ones that name no
 * language, and failing that to the whole pool - better a photo meant for another
 * language than an empty panel. With nothing at all, the caller draws its
 * placeholder.
 */
export function useLoginPhotos(language) {
  const [photos, setPhotos] = useState([]);
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    let active = true;
    loadManifest().then((manifest) => {
      if (!active) return;
      // 'vi-VN' and 'vi' should land on the same set.
      const base = String(language || '').split('-')[0].toLowerCase();
      const next = [manifest[base], manifest.shared, manifest.all]
        .find((set) => set?.length) || [];
      setPhotos(next);
      setIndex(0);
    });
    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    clearInterval(timer.current);
    setPrev(null);
    if (photos.length < 2) return undefined;
    timer.current = setInterval(() => {
      setIndex((i) => {
        setPrev(i);
        return (i + 1) % photos.length;
      });
    }, INTERVAL_MS);
    return () => clearInterval(timer.current);
  }, [photos]);

  // The frame on screen plus the one fading out behind it - never the whole set.
  const mounted = prev === null || prev === index ? [index] : [prev, index];

  return { photos, index, mounted };
}

export default useLoginPhotos;
