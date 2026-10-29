// Shared navigation manager from icue-landingpage-react/src/lib/navigationPreferences.js.
export const MAIN_SITE_ORIGIN = 'https://vi.icue.vn'
const MAIN_SITE_HOSTS = new Set(['icue.vn', 'www.icue.vn', 'en.icue.vn', 'vn.icue.vn', 'vi.icue.vn'])
const PORTAL_HOSTS = new Set(['hr.icue.vn', 'contract.icue.vn'])

export function normalizeTheme(value) {
  return value === 'light' || value === 'dark' ? value : null
}

/** Decorate ICUE navigation without changing anchors, downloads or third-party links. */
export function withNavigationPreferences(href, { locale, theme } = {}) {
  if (!href || href.startsWith('#') || !/^https?:\/\//i.test(href)) return href
  let url
  try { url = new URL(href) } catch { return href }
  const mainSite = MAIN_SITE_HOSTS.has(url.hostname)
  if (!mainSite && !PORTAL_HOSTS.has(url.hostname)) return href
  if (mainSite) {
    url.protocol = 'https:'
    url.host = new URL(MAIN_SITE_ORIGIN).host
    if (locale) {
      const code = String(locale).toLowerCase().split(/[-_]/)[0]
      const language = ({ vn: 'vi', jp: 'ja', kr: 'ko' })[code] || code
      url.searchParams.set('lang', ['vi', 'en', 'de', 'fr', 'ko', 'ja'].includes(language) ? language : 'en')
    }
  }
  if (normalizeTheme(theme) && !/\.(?:pdf|zip|docx?|xlsx?|png|jpe?g|webp|mp4)$/i.test(url.pathname)) url.searchParams.set('theme', theme)
  return url.href
}
