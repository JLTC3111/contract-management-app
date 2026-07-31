#!/usr/bin/env node
/**
 * Builds public/loginphotos/manifest.json by listing what is actually in the
 * folder.
 *
 * The login page cannot read a directory over HTTP, and probing for guessed
 * filenames would spray 404s through the console, so the file list is written
 * here instead. This runs from npm's `prebuild` hook: drop images in, build, done.
 *
 * A language code anywhere in the filename, separated by `-`, `_` or `.`, decides
 * which language the photo belongs to. All of these work:
 *
 *   loginphto_vi.png, vi-office.png, cover.vi.jpg  -> Vietnamese
 *   loginphto_jp.png, ja-1.png                     -> Japanese
 *   cover.png, anything.png                        -> shared
 *
 * Country codes are accepted alongside language codes (jp/ja, cn/zh, vn/vi,
 * gb/us/uk for en), since the flags in the picker are named that way.
 */
import { readdirSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', 'public', 'loginphotos');
const OUT = join(DIR, 'manifest.json');

/** Keep in step with the languages the login page offers. */
const LANGS = ['en', 'de', 'fr', 'es', 'ja', 'th', 'zh', 'vi'];

/** Country codes that mean a language, because the flag files are named this way. */
const ALIASES = {
  jp: 'ja', cn: 'zh', vn: 'vi', gb: 'en', uk: 'en', us: 'en', dk: 'de',
};

const IMAGE = /\.(png|jpe?g|webp|avif)$/i;

/**
 * Superseded files kept next to the live ones. Without this an `_OLD` copy still
 * carries a language code, so the page would quietly rotate between the current
 * photo and the one it replaced.
 */
const IGNORED = new Set(['old', 'bak', 'backup', 'copy', 'unused', 'draft', 'tmp', 'orig']);

const tokensOf = (name) => name.replace(IMAGE, '').toLowerCase().split(/[-_.\s]+/);

const isSuperseded = (name) => name.startsWith('_')
  || tokensOf(name).some((token) => IGNORED.has(token));

/** The language a filename declares, or null when it names none. */
const languageOf = (name) => {
  for (const token of tokensOf(name)) {
    const code = ALIASES[token] || token;
    if (LANGS.includes(code)) return code;
  }
  return null;
};

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

const allImages = readdirSync(DIR)
  .filter((name) => IMAGE.test(name))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

const skipped = allImages.filter(isSuperseded);
const files = allImages.filter((name) => !isSuperseded(name));

const manifest = { shared: [], all: [] };
for (const lang of LANGS) manifest[lang] = [];

const unmatched = [];
for (const name of files) {
  const url = `/loginphotos/${name}`;
  const lang = languageOf(name);
  manifest[lang || 'shared'].push(url);
  manifest.all.push(url);
  if (!lang) unmatched.push(name);
}

// Drop empty language buckets so the file stays readable.
for (const lang of LANGS) {
  if (manifest[lang].length === 0) delete manifest[lang];
}

writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);

const counted = Object.entries(manifest)
  .filter(([k]) => k !== 'all')
  .map(([k, v]) => `${k}:${v.length}`)
  .join(' ');
console.log(`loginphotos manifest: ${files.length} image(s) [${counted}]`);
if (unmatched.length > 0) {
  console.log(`  no language in the name, kept as shared: ${unmatched.join(', ')}`);
}
if (skipped.length > 0) {
  console.log(`  skipped as superseded: ${skipped.join(', ')}`);
}

// A background photo shipped at several MB is the page's whole payload.
const heavy = files.filter(
  (name) => statSync(join(DIR, name)).size > 1_000_000
);
if (heavy.length > 0) {
  console.log(`  over 1 MB, consider re-encoding as .webp: ${heavy.join(', ')}`);
}
