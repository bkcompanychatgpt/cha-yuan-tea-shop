# Photography pipeline

How the photographs on this site were chosen, and how to change them.

## Where the images come from

Every photograph is **openly licensed** — Creative Commons or public domain — and
was sourced from [Wikimedia Commons](https://commons.wikimedia.org) as the primary
source, with [Openverse](https://openverse.org) surveyed as a secondary pool.

Nothing here is copyrighted material borrowed from a competitor. That matters:
using another tea merchant's product photography on a commercial storefront is
copyright infringement, so this pipeline deliberately only accepts licences that
permit commercial use with attribution:

| Accepted | Rejected |
|---|---|
| CC0, Public Domain Mark | anything with `NC` (non-commercial) |
| CC BY (2.0 / 3.0 / 4.0) | anything with `ND` (no derivatives) |
| CC BY-SA (2.0 / 3.0 / 4.0) | unclear or missing licence metadata |

Attribution is published at `/credits` and generated into
`public/img/credits.json`. CC BY and CC BY-SA both require it, so **do not delete
that page** while these images are in use.

## What was deliberately not used

`data/photos/` records the whole selection process, including what was rejected.
Museum pieces photographed behind glass with an object label, square
white-background studio shots, watermarked images, and photographs of loose leaf
that did not match the tea they would be labelled with were all filtered out.

**Exactly one product has no photograph**: the bamboo tea tray. Every Commons
candidate for "Chinese tea tray" was either street furniture or an unrelated
silver platter. It keeps generated artwork, and so does nothing else.

For that product the artwork is written as a coherent **set of three views** —
the brewed vessel, the dry leaf laid out on a grid, and the vessel in profile —
rather than one generated image plus leftover placeholder files:

```
/img/product/<slug>.svg            the chop-mark tile
/img/product/<slug>/layout.svg     the dry leaf, laid out
/img/product/<slug>/profile.svg    the vessel in profile
```

Composing them as a set is the point: a gallery that mixes a generated main image
with stale placeholders reads as broken, whereas three matching plates read as an
illustration. `npm run gaps` reports every place generated artwork is still in use
so this stays a known, deliberate state rather than a surprise.

## The pipeline

```
server/scripts/fetch-photos.mjs      broad survey of Commons by tea family
server/scripts/fetch-targeted.mjs    narrow searches for slots the survey missed
server/scripts/survey-images.mjs     Openverse survey (secondary pool)
server/scripts/download-openverse.mjs
server/scripts/build-sheets.mjs      numbered contact sheets + index for review
server/photo-selection.mjs           ← the curated choices live here
server/scripts/build-photos.mjs      downloads → graded JPEG derivatives
server/scripts/attach-photos.mjs     points the database at the built files
```

### Choosing an image

1. `npm run photos:survey` and `npm run photos:targeted` download candidates and
   write numbered contact sheets to `data/photos/sheets/`.
2. Look at a sheet, note the tile number.
3. Record the choice in `server/photo-selection.mjs` as `group#n`, e.g.
   `silver-needle#2`, along with a grade.
4. `npm run photos:build` then `npm run photos:attach`.
5. `node server/scripts/preview-tiles.mjs --all` renders every product tile into
   one image for review, and `node server/scripts/preview-editorial.mjs` does the
   same for the banner crops.

`docs/photo-sheets/` holds an archived copy of the smaller review sheets, so the
selection can be audited later without re-downloading anything. The large ones
(`white`, `oolong`, `teaware`, `ambiance`, `black`, `floral`, `green-leafy`) are
not archived because they are several hundred kilobytes each; regenerate them
with `npm run photos:sheets`.

### Grading

The source photographs come from dozens of cameras and lighting setups. A house
style is applied in `build-photos.mjs` so the grid reads as one collection:

1. a modest desaturation and warm channel lift, toward the ink-green and
   champagne-gold palette;
2. a translucent ink-green wash — this is the step that actually unifies a bright
   white-background studio shot with a dark one;
3. a radial vignette that darkens the corners but leaves the subject alone.

Four named grades exist: `product` (tiles), `editorial` (story images), `hero`
(dark, for images with no overlay of their own) and `banner` (bright, because the
homepage lays its own dark overlay on top — grading a banner dark crushes it to
black). `plain` skips grading entirely.

### Language

The storefront is English-only and `npm run lang` enforces it. Two rules keep
attribution honest without leaking another language into the UI:

- **Non-Latin file titles and author names are shown transliterated.** The mapping
  lives in `server/scripts/data/photo-transliterations.json` as data, so the source
  stays free of non-Latin characters. The untranslated originals are still stored in
  `public/img/credits.json` as `originalTitle` and `originalAuthor`, so the
  attribution remains verifiable against Wikimedia.
- **`href` and `src` values are not audited.** A link to
  `commons.wikimedia.org/wiki/File:<original name>.jpg` has to carry the file's real
  name or it will not resolve. Only human-visible text is checked.

One product keeps generated artwork rather than a photograph that does not show
the product — the **bamboo tea tray** — and nothing else as of the last build.
`npm run gaps` reports the current list.

### Output sizes

| Suffix | Size | Used by |
|---|---|---|
| `-hero.jpg` | 1200² | product tile, product gallery, spotlight |
| `-thumb.jpg` | 520² | card thumbnails, cart drawer, admin tables |
| `-wide.jpg` | 1920×720 | banner crops |
| `-alt.jpg`, `-alt2.jpg` | 1200² | gallery detail shots, card hover |

179 files, about 22 MB total. Run `npm run assets` to confirm every referenced
file actually resolves.

## Replacing this with your own photography

When you commission real product shots:

1. Put the files in `public/img/photos/` using the naming above, or write your own
   builder.
2. Update `hero_image` and `images` on the products table — `server/seed.mjs`
   reads them from `server/catalog-data.mjs`.
3. Delete `/credits`, `views/credits.ejs`, and the credits block in
   `views/terms.ejs`.
4. `data/photos/` and the fetch scripts can then be removed.

The site is designed so that this swap touches no application logic: pages only
ever ask the database for `hero_image` and `images`, and fall back to the
generated SVG artwork when a product has no photography.
