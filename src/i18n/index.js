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
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n; 