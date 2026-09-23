import { useCallback, useEffect, useRef, useState } from 'react';
import { storageApi } from '../api/contracts';

export const isStorageFolder = (entry) => entry.id == null && entry.metadata == null;

export function useStorageFolder(root) {
  const [location, setLocation] = useState({ root, path: '' });
  const path = location.root === root ? location.path : '';
  const prefix = path ? `${root}/${path}` : root;
  const [listing, setListing] = useState({ prefix: null, files: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const files = await storageApi.listFiles(prefix);
      if (request === generation.current) {
        setListing({ prefix, files: files.filter((file) => file.name !== '.keep') });
      }
    } catch (err) {
      if (request === generation.current) setError(err);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [prefix]);

  useEffect(() => {
    reload();
    return () => { generation.current += 1; };
  }, [reload]);

  return {
    path, prefix, loading, error, reload,
    files: listing.prefix === prefix ? listing.files : [],
    relativeName: (name) => path ? `${path}/${name}` : name,
    goTo: (nextPath) => setLocation({ root, path: nextPath }),
    enter: (name) => {
      if (!name || name.includes('/') || name === '.' || name === '..') return;
      setLocation({ root, path: path ? `${path}/${name}` : name });
    },
  };
}
