# Login page photos

Drop images in this folder. The login page shows them behind the headline, in
grayscale, picking the set that matches the language chosen on the page.

## Naming

A language code anywhere in the filename decides the language. It can be
separated by `-`, `_` or `.`, so all of these work:

| File | Shown when the login page is in |
| --- | --- |
| `loginphoto_vi.jpg`, `vi-office.png`, `cover.vi.webp` | Vietnamese |
| `loginphoto_en.jpg`, `en-archive.png` | English |
| `…_de`, `…_fr`, `…_es`, `…_th`, `…_zh` | that language |
| `loginphoto_jp.jpg` | Japanese — `jp`/`cn`/`vn`/`gb`/`us`/`uk` are accepted as well as `ja`/`zh`/`vi`/`en` |
| `cover.jpg` (no language in the name) | any language with no set of its own |

Give one language several files and the page rotates through them, one every
seven seconds.

A language with no images of its own falls back to the ones naming no language,
and failing that to the whole pool. If the folder is empty the page draws a
hatched placeholder instead — nothing breaks.

`.png`, `.jpg`, `.jpeg`, `.webp` and `.avif` are all picked up. Files sort
naturally, so `vi-2` comes before `vi-10`.

## Retiring an image

A file whose name contains `old`, `bak`, `backup`, `copy`, `unused`, `draft`,
`tmp` or `orig`, or that starts with `_`, is skipped — otherwise
`loginphoto_en_OLD.jpg` still reads as English and the page would rotate between
the current photo and the one it replaced. The build prints whatever it skipped.

## Size

These are full-bleed background photos, so they are most of the page's payload.
Keep them under a couple of hundred KB; the build warns about anything over 1 MB.

## After adding or removing images

`manifest.json` is what the page actually reads — a browser cannot list a folder
over HTTP, and guessing filenames would fill the console with 404s. It is
regenerated automatically by the `predev` and `prebuild` npm hooks, so:

```
npm run build      # or npm run dev
```

is enough. To refresh it on its own:

```
npm run loginphotos
```

Do not edit `manifest.json` by hand — it is overwritten on every build.
