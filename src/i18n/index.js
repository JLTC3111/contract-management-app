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

// Get saved language from localStorage or use browser language
const savedLanguage = localStorage.getItem('i18nextLng');
const browserLanguage = navigator.language.split('-')[0];
const supportedLanguages = ['en', 'de', 'fr', 'es', 'ja', 'th', 'zh', 'vi'];
const defaultLanguage = supportedLanguages.includes(browserLanguage) ? browserLanguage : 'en';

// Initialize i18n
const initI18n = () => {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        de: { translation: de },
        fr: { translation: fr },
        es: { translation: es },
        ja: { translation: ja },
        th: { translation: th },
        zh: { translation: zh },
        vi: { translation: vi },
      },
      lng: savedLanguage || defaultLanguage,
      fallbackLng: 'en',
      interpolation: { 
        escapeValue: false,
      },
    });

  // Save language preference whenever it changes
  i18n.on('languageChanged', (lng) => {
    localStorage.setItem('i18nextLng', lng);
  });

  return i18n;
};

// Initialize and export i18n instance
export default initI18n(); 