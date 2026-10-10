/**
 * Build the storefront's photographic assets from the curated selection.
 *
 * For every product and editorial slot this produces:
 *   public/img/photos/<slot>-hero.jpg     1400x1400   product tile / gallery
 *   public/img/photos/<slot>-thumb.jpg     700x700    thumbnails, cart, admin
 *   public/img/photos/<slot>-detail.jpg   1400x1050   editorial blocks
 *   public/img/photos/<slot>-wide.jpg     1920x1080   hero banners
 *
 * Grading notes: the source photographs come from many different cameras, so a
 * light unifying pass is applied — a warm lift, a touch of desaturation and a
 * soft vignette. The vignette matters most: it keeps the bright white-background
 * studio shots (common on Wikimedia) from glaring against the dark storefront,
 * without darkening the subject in the middle of the frame.
 *
 * Also writes public/img/credits.json so the app can display attribution.
 *
 *   node server/scripts/build-photos.mjs            # build everything
 *   node server/scripts/build-photos.mjs --preview  # plus a verification sheet
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ALL_ASSIGNMENTS, CATEGORY_PHOTOS, PRODUCT_PHOTOS, JADE_PHOTOS, TEA_PHOTOS, EDITORIAL_PHOTOS, englishLabel } from '../photo-selection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PHOTO_DIR = path.join(ROOT, 'data', 'photos');
const OUT_DIR = path.join(ROOT, 'public', 'img', 'photos');
const CREDITS = path.join(ROOT, 'public', 'img', 'credits.json');
const PREVIEW_DIR = path.join(PHOTO_DIR, 'preview');

const SHEETS_INDEX = path.join(PHOTO_DIR, 'sheets-index.json');
const TARGETED_INDEX = path.join(PHOTO_DIR, 'targeted-index.json');

/**
 * Resolve `group#n` to a source file plus its licence metadata.
 * Both the broad survey sheets and the targeted follow-up sheets are searchable,
 * so a pick can quote either `white#22` or `target-silver-needle#4`.
 *
 * The targeted index is loaded first because the broad survey happened to
 * contain groups with the same bare names (`silver-needle`, `dancong`); loading
 * it second would let those shadow the targeted picks.
 */
function buildLookup() {
  const lookup = new Map();
  for (const file of [TARGETED_INDEX, SHEETS_INDEX]) {
    if (!fs.existsSync(file)) continue;
    const sheets = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [group, entries] of Object.entries(sheets)) {
      for (const entry of entries) {
        const key = `${group}#${entry.n}`;
        if (!lookup.has(key)) lookup.set(key, entry);
      }
    }
  }
  return lookup;
}

/**
 * A radial vignette as a composited RGBA layer.
 * `strength` sets the corner opacity, `inner` the radius that stays untouched.
 */
function vignetteLayer(size, { strength = 0.42, inner = 0.52 } = {}) {
  const half = size / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}">
      <defs>
        <radialGradient id="v" cx="50%" cy="50%" r="72%">
          <stop offset="${Math.round(inner * 100)}%" stop-color="#04100a" stop-opacity="0"/>
          <stop offset="78%" stop-color="#04100a" stop-opacity="${(strength * 0.45).toFixed(3)}"/>
          <stop offset="100%" stop-color="#04100a" stop-opacity="${strength.toFixed(3)}"/>
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#v)"/>
    </svg>`,
  );
}

/** A faint warm gradient in the lower third, so overlay text always reads. */
function bottomShadeLayer(width, height, strength = 0.3) {
  return Buffer.from(
    `<svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="b" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#04100a" stop-opacity="${strength}"/>
          <stop offset="45%" stop-color="#04100a" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#b)"/>
    </svg>`,
  );
}

/**
 * The source photographs come from dozens of different cameras and lighting
 * setups — some are studio shots on white, some are dim snapshots. An editorial
 * brand needs one look, so each grade is a small pipeline rather than a single
 * filter:
 *
 *   1. slight desaturation and a warm channel lift, to move everything toward
 *      the ink-green and champagne-gold palette;
 *   2. a translucent ink-green wash, which is what actually unifies a bright
 *      white-background shot with a dark one;
 *   3. a radial vignette that darkens the corners while leaving the subject in
 *      the middle of the frame alone.
 *
 * `wash` and `vignette` are the two dials worth turning.
 */
const GRADES = {
  product: {
    modulate: { saturation: 0.94, brightness: 1.0 },
    warm: { r: 1.03, g: 1.0, b: 0.95 },
    wash: { colour: '#08201a', opacity: 0.13 },
    vignette: { strength: 0.5, inner: 0.42 },
  },
  editorial: {
    modulate: { saturation: 0.88, brightness: 0.97 },
    warm: { r: 1.04, g: 1.0, b: 0.94 },
    wash: { colour: '#06160f', opacity: 0.26 },
    vignette: { strength: 0.64, inner: 0.32 },
  },
  hero: {
    modulate: { saturation: 0.8, brightness: 0.86 },
    warm: { r: 1.02, g: 1.0, b: 0.96 },
    wash: { colour: '#04120c', opacity: 0.36 },
    vignette: { strength: 0.74, inner: 0.26 },
  },
  /**
   * Banner grade: the hero image sits *behind* the page's own dark overlay, so it
   * is graded bright instead of dark. Grading it like a product tile crushes it
   * to black once the overlay is applied on top.
   */
  banner: {
    modulate: { saturation: 0.94, brightness: 1.1 },
    warm: { r: 1.02, g: 1.0, b: 0.96 },
    wash: { colour: '#04120c', opacity: 0.06 },
    vignette: { strength: 0.34, inner: 0.5 },
  },
  plain: {
    modulate: { saturation: 1, brightness: 1 },
    warm: { r: 1, g: 1, b: 1 },
    wash: null,
    vignette: null,
  },
};

/**
 * A flat translucent wash of one colour over the whole frame, as an RGBA layer.
 * Encoding the colour as hex with alpha is exactly what the SVG wants.
 */
function washLayer(width, height, { colour, opacity }) {
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${colour}" fill-opacity="${opacity}"/></svg>`,
  );
}

/** Apply a grade to a raw pipeline at the given output size. */
async function gradeResize(srcFile, width, height, gradeName, { focus = null, shade = false } = {}) {
  const grade = GRADES[gradeName] || GRADES.product;

  let pipeline = sharp(srcFile, { failOn: 'none' })
    .rotate()
    .resize(width, height, { fit: 'cover', position: focus || 'centre' })
    .recomb([
      [grade.warm.r, 0.01, 0],
      [0, grade.warm.g, 0],
      [0, 0.01, grade.warm.b],
    ])
    .modulate(grade.modulate);

  const layers = [];
  if (grade.wash) layers.push({ input: washLayer(width, height, grade.wash), blend: 'over' });
  if (grade.vignette) {
    // A composited layer may not be larger than the base image, so the square
    // vignette is drawn at the *smaller* dimension and stretched to fill.
    layers.push({ input: vignetteLayer(Math.min(width, height), grade.vignette), blend: 'over' });
  }
  if (shade || gradeName === 'hero' || gradeName === 'editorial') {
    const strength = gradeName === 'hero' ? 0.5 : gradeName === 'editorial' ? 0.28 : 0.42;
    layers.push({ input: bottomShadeLayer(width, height, strength), blend: 'over' });
  }
  if (layers.length) pipeline = pipeline.composite(layers);

  return pipeline.jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: '4:2:0' });
}

/**
 * Photo manifest consumed by the application.
 *
 * Written next to the images rather than into the database, because
 * `server/seed.mjs` rewrites the stored editorial copy from catalog-data.mjs on
 * every boot and would otherwise wipe the paths. The seed merges this file in.
 */
const MANIFEST = path.join(OUT_DIR, 'manifest.json');

/**
 * Output sizes. Every derivative that is written is also referenced somewhere,
 * so the shipped weight stays proportional to what the pages actually use.
 *
 *   hero   1200 sq    product tile, product gallery, spotlight
 *   thumb   520 sq    card thumbnails, cart drawer, admin tables (2x of 260 CSS px)
 *   wide   1920x720   hero banner (the crop is shallow because the overlay covers it)
 *   tile    960x1200  category tile, which is portrait (4:5)
 */
const SIZES = {
  hero: [1200, 1200],
  thumb: [520, 520],
  wide: [1920, 720],
  tile: [960, 1200],
};

async function main() {
  const lookup = buildLookup();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  const credits = {};
  const missing = [];
  let built = 0;

  for (const [slot, config] of Object.entries(ALL_ASSIGNMENTS)) {
    if (config.enabled === false) continue;
    const picks = config.picks || [config.pick];
    const gradeName = config.grade || 'product';
    const files = [];

    for (let i = 0; i < picks.length; i += 1) {
      const entry = lookup.get(picks[i]);
      if (!entry) {
        missing.push(`${slot}: ${picks[i]} not found in the sheet index`);
        continue;
      }
      const srcFile = path.join(ROOT, entry.file);
      if (!fs.existsSync(srcFile)) {
        missing.push(`${slot}: missing file ${entry.file}`);
        continue;
      }
      files.push({ entry, srcFile });
    }

    if (!files.length) continue;

    const suffix = ['hero', 'alt', 'alt2'];
    for (let i = 0; i < files.length; i += 1) {
      const { entry, srcFile } = files[i];
      // The `hero` slot is the banner itself, so `hero-hero` would read badly.
      const name = slot === 'hero' ? (i === 0 ? 'hero' : `hero-${i}`) : `${slot}-${suffix[i]}`;

      await (await gradeResize(srcFile, ...SIZES.hero, gradeName)).toFile(path.join(OUT_DIR, `${name}.jpg`));
      if (i === 0) {
        await (await gradeResize(srcFile, ...SIZES.thumb, gradeName)).toFile(path.join(OUT_DIR, `${name}-thumb.jpg`));
        await (await gradeResize(srcFile, ...SIZES.wide, gradeName)).toFile(path.join(OUT_DIR, `${name}-wide.jpg`));

        credits[slot] = {
          // Decoded so the credits page stays readable ASCII rather than a wall
          // of percent-escapes. Browsers re-encode the path when following it.
          source: entry.descriptionUrl ? decodeURIComponent(entry.descriptionUrl) : '',
          // The original non-Latin title and author are kept alongside English
          // display labels: attribution must name the author, and this is an
          // English storefront.
          title: englishLabel(entry.title),
          originalTitle: entry.title,
          licence: entry.licence,
          licenceUrl: entry.licenceUrl,
          author: englishLabel(entry.author),
          originalAuthor: entry.author,
          via: 'Wikimedia Commons',
        };
      }
      built += 1;
    }
  }

  fs.writeFileSync(CREDITS, JSON.stringify({ generatedAt: new Date().toISOString(), credits }, null, 2));

  /* ---------------------------------------------------------- category tiles */
  let tiles = 0;
  for (const [slug, config] of Object.entries(CATEGORY_PHOTOS)) {
    const entry = lookup.get(config.pick);
    if (!entry) {
      missing.push(`category ${slug}: ${config.pick} not found`);
      continue;
    }
    const srcFile = path.join(ROOT, entry.file);
    if (!fs.existsSync(srcFile)) {
      missing.push(`category ${slug}: missing file ${entry.file}`);
      continue;
    }
    await (await gradeResize(srcFile, ...SIZES.tile, config.grade || 'product', { shade: true })).toFile(
      path.join(OUT_DIR, `category-${slug}-tile.jpg`),
    );
    credits[`category-${slug}`] = {
      source: entry.descriptionUrl ? decodeURIComponent(entry.descriptionUrl) : '',
      title: englishLabel(entry.title),
      originalTitle: entry.title,
      licence: entry.licence,
      licenceUrl: entry.licenceUrl,
      author: englishLabel(entry.author),
      originalAuthor: entry.author,
      via: 'Wikimedia Commons',
    };
    tiles += 1;
  }
  fs.writeFileSync(CREDITS, JSON.stringify({ generatedAt: new Date().toISOString(), credits }, null, 2));
  fs.writeFileSync(MANIFEST, JSON.stringify(buildManifest(), null, 2));

  console.log(`${built} source images processed → ${path.relative(ROOT, OUT_DIR)}`);
  console.log(`${tiles} category tile(s) written`);
  console.log(`${Object.keys(credits).length} slots credited → ${path.relative(ROOT, CREDITS)}`);
  console.log(`paths indexed → ${path.relative(ROOT, MANIFEST)}`);
  if (missing.length) {
    console.log(`\n${missing.length} assignment problem(s):`);
    missing.slice(0, 20).forEach((m) => console.log(`  - ${m}`));
  }

  if (process.argv.includes('--preview')) {
    await buildPreview();
  }
}

/**
 * The map the application reads: which files exist for each slot.
 * Deliberately derived from what is on disk rather than from the selection, so a
 * slot whose photographs failed to download is simply absent instead of pointing
 * at a missing file.
 */
function buildManifest() {
  const list = (pattern) => {
    if (!fs.existsSync(OUT_DIR)) return [];
    return fs
      .readdirSync(OUT_DIR)
      .filter((f) => pattern.test(f))
      .sort();
  };

  const products = {};
  /*
   * Every product slot that has photography: the hand-written teaware and gift
   * sets, jade and jewellery, and the generated tea lots. A slot missing from
   * this loop produces images that nothing ever references — the first run of
   * the pooled assignment built three hundred files and registered none of the
   * tea, so the storefront quietly fell back to artwork for the whole
   * department.
   */
  for (const slug of [...Object.keys(PRODUCT_PHOTOS), ...Object.keys(JADE_PHOTOS), ...Object.keys(TEA_PHOTOS)]) {
    const gallery = ['hero', 'alt', 'alt2']
      .map((suffix) => `/img/photos/${slug}-${suffix}.jpg`)
      .filter((rel) => fs.existsSync(path.join(ROOT, 'public', rel.replace(/^\//, ''))));
    if (gallery.length) products[slug] = { gallery };
  }

  const categories = {};
  for (const slug of Object.keys(CATEGORY_PHOTOS)) {
    const rel = `/img/photos/category-${slug}-tile.jpg`;
    if (fs.existsSync(path.join(OUT_DIR, `category-${slug}-tile.jpg`))) categories[slug] = rel;
  }

  const story = Object.keys(EDITORIAL_PHOTOS)
    .filter((key) => key.startsWith('story-'))
    .map((key) => ({
      key,
      src: `/img/photos/${key}-hero.jpg`,
      wide: `/img/photos/${key}-hero-wide.jpg`,
    }))
    .filter((entry) => fs.existsSync(path.join(OUT_DIR, `${entry.key}-hero.jpg`)));

  const hero = fs.existsSync(path.join(OUT_DIR, 'hero-wide.jpg')) ? '/img/photos/hero-wide.jpg' : null;

  const all = list(/\.jpg$/).map((f) => `/img/photos/${f}`);

  return {
    generatedAt: new Date().toISOString(),
    counts: { products: Object.keys(products).length, categories: Object.keys(categories).length, story: story.length, files: all.length },
    hero,
    story,
    categories,
    products,
    all,
  };
}

/** A verification sheet: every product tile at a size a human can judge. */
async function buildPreview() {
  const { PRODUCT_PHOTOS } = await import('../photo-selection.mjs');
  const slots = Object.keys(PRODUCT_PHOTOS);
  const cols = 4;
  const cell = 390;
  const labelH = 32;
  const rows = Math.ceil(slots.length / cols);

  const composites = [];
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    const file = path.join(OUT_DIR, `${slot}-hero.jpg`);
    const left = (i % cols) * cell;
    const top = Math.floor(i / cols) * cell;
    if (fs.existsSync(file)) {
      const img = await sharp(file).resize(cell - 8, cell - 8 - labelH, { fit: 'cover' }).toBuffer();
      composites.push({ input: img, left: left + 4, top: top + 4 });
    } else {
      composites.push({
        input: Buffer.from(
          `<svg width="${cell - 8}" height="${cell - 8 - labelH}"><rect width="100%" height="100%" fill="#1a1a1a"/><text x="8" y="26" font-family="monospace" font-size="15" fill="#d4715f">MISSING</text></svg>`,
        ),
        left: left + 4,
        top: top + 4,
      });
    }
    const svg = Buffer.from(
      `<svg width="${cell - 8}" height="${labelH}"><rect width="100%" height="100%" fill="#0b1c13"/>` +
        `<text x="5" y="21" font-family="monospace" font-size="14" fill="#dcc07a">${escapeXmlPreview(slot.slice(0, 40))}</text></svg>`,
    );
    composites.push({ input: svg, left: left + 4, top: top + cell - labelH });
  }

  const out = path.join(PREVIEW_DIR, 'product-heroes.jpg');
  await sharp({
    create: { width: cols * cell, height: rows * cell, channels: 3, background: { r: 6, g: 16, b: 11 } },
  })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(out);
  console.log(`preview → ${path.relative(ROOT, out)} (${slots.length} products)`);
}

function escapeXmlPreview(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
