// src/i18n/languages.js
// The one list of offered languages. Anything that lets a user switch language
// reads from here, so the set cannot drift between the login page and the app.
// `code` must match a translation bundle in this folder; `flag` is a file in
// /public/flags.
export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '/flags/gb.svg' },
  { code: 'de', label: 'Deutsch', flag: '/flags/de.svg' },
  { code: 'fr', label: 'Français', flag: '/flags/fr.svg' },
  { code: 'es', label: 'Español', flag: '/flags/es.svg' },
  { code: 'ja', label: '日本語', flag: '/flags/jp.svg' },
  { code: 'th', label: 'ไทย', flag: '/flags/th.svg' },
  { code: 'zh', label: '中文', flag: '/flags/cn.svg' },
  { code: 'vi', label: 'Tiếng Việt', flag: '/flags/vn.svg' },
];

/** The entry for `code`, falling back to the first language if it is unknown. */
export const languageFor = (code) =>
  LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];

export default LANGUAGES;
