import { browserStorage } from '../utils/browserStorage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import de from './de.json';
import fr from './fr.json';
import es from './es.json';
import ja from './ja.json';
import th from './th.json';
import zh from './zh.json';
import vi from './vi.json';
import recovery from './recovery.json';

// Get saved language from localStorage or use browser language
const savedLanguage = browserStorage.getItem('i18nextLng');
const browserLanguage = navigator.language.split('-')[0];
const supportedLanguages = ['en', 'de', 'fr', 'es', 'ja', 'th', 'zh', 'vi'];
const defaultLanguage = supportedLanguages.includes(browserLanguage) ? browserLanguage : 'en';

// Initialize i18n
const initI18n = () => {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: { ...en, recovery: recovery.en } },
        de: { translation: { ...de, recovery: recovery.de } },
        fr: { translation: { ...fr, recovery: recovery.fr } },
        es: { translation: { ...es, recovery: recovery.es } },
        ja: { translation: { ...ja, recovery: recovery.ja } },
        th: { translation: { ...th, recovery: recovery.th } },
        zh: { translation: { ...zh, recovery: recovery.zh } },
        vi: { translation: { ...vi, recovery: recovery.vi } },
      },
      lng: savedLanguage || defaultLanguage,
      fallbackLng: 'en',
      contextSeparator: '::',
      interpolation: { 
        escapeValue: false,
      },
      debug: false,
    });

  // Save language preference whenever it changes
  i18n.on('languageChanged', (lng) => {
    browserStorage.setItem('i18nextLng', lng);
  });

  return i18n;
};

// Initialize and export i18n instance
export default initI18n();
