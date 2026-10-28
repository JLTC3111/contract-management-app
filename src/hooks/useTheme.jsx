import { browserStorage } from '../utils/browserStorage';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const incoming = new URLSearchParams(window.location.search).get('theme');
    if (incoming === 'dark' || incoming === 'light') return incoming === 'dark';
    const stored = browserStorage.getItem('darkMode');
    return stored === null ? window.matchMedia('(prefers-color-scheme: dark)').matches : stored === 'true';
  });

  useEffect(() => {
    browserStorage.setItem('darkMode', darkMode);
    const url = new URL(window.location.href);
    if (url.searchParams.has('theme')) {
      url.searchParams.set('theme', darkMode ? 'dark' : 'light');
      window.history.replaceState(window.history.state, '', url);
    }
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
