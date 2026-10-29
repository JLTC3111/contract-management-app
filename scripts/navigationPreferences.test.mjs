import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTheme, withNavigationPreferences } from '../src/lib/navigationPreferences.js';

test('ICUE navigation preserves theme, language, route, query and fragment', () => {
  for (const theme of ['light', 'dark']) {
    for (const locale of ['vi', 'en', 'de', 'fr', 'ja', 'ko']) {
      for (const host of ['icue.vn', 'www.icue.vn', 'vn.icue.vn', 'en.icue.vn', 'vi.icue.vn']) {
        const url = new URL(withNavigationPreferences(`https://${host}/newsroom/?category=research&theme=old#latest`, { locale, theme }));
        assert.equal(url.origin, 'https://vi.icue.vn');
        assert.equal(url.pathname, '/newsroom/');
        assert.equal(url.searchParams.get('lang'), locale);
        assert.equal(url.searchParams.get('theme'), theme);
        assert.equal(url.searchParams.get('category'), 'research');
        assert.equal(url.hash, '#latest');
      }
    }
  }
});

test('portal navigation carries the live theme without changing the destination', () => {
  for (const host of ['hr.icue.vn', 'contract.icue.vn']) for (const theme of ['light', 'dark']) {
    const url = new URL(withNavigationPreferences(`https://${host}/?next=dashboard&theme=old`, { locale: 'fr', theme }));
    assert.equal(url.hostname, host);
    assert.equal(url.searchParams.get('theme'), theme);
    assert.equal(url.searchParams.get('next'), 'dashboard');
    assert.equal(url.searchParams.has('lang'), false);
  }
});

test('application language aliases resolve to supported main-site languages', () => {
  for (const [locale, expected] of [['vn', 'vi'], ['vn-VN', 'vi'], ['jp', 'ja'], ['kr_KR', 'ko'], ['fr-FR', 'fr'], ['es', 'en'], ['th', 'en'], ['ru', 'en'], ['zh', 'en']]) {
    assert.equal(new URL(withNavigationPreferences('https://icue.vn/', { locale, theme: 'dark' })).searchParams.get('lang'), expected);
  }
});

test('anchors, third-party links and document downloads keep their behavior', () => {
  for (const href of ['#people', '/dashboard', 'mailto:info@icue.vn', 'tel:+842437728485', 'https://facebook.com/icue', 'https://icue.vn.evil.example/']) {
    assert.equal(withNavigationPreferences(href, { locale: 'vi', theme: 'dark' }), href);
  }
  for (const extension of ['pdf', 'zip', 'docx', 'xlsx', 'png', 'jpeg', 'webp', 'mp4']) {
    const url = new URL(withNavigationPreferences(`https://vi.icue.vn/docs/file.${extension}`, { theme: 'dark' }));
    assert.equal(url.searchParams.has('theme'), false);
  }
  assert.equal(normalizeTheme('auto'), null);
  assert.equal(new URL(withNavigationPreferences('https://hr.icue.vn/', { theme: 'auto' })).searchParams.has('theme'), false);
});
