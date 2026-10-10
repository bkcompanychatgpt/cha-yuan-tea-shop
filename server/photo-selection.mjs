/**
 * Curated photo assignments.
 *
 * Selections quote a tile number from the numbered contact sheets in
 * data/photos/sheets (`group#n`). To review or change a choice:
 *
 *   1. node server/scripts/build-sheets.mjs       (broad survey sheets)
 *      node server/scripts/fetch-targeted.mjs    (targeted follow-up sheets)
 *   2. look at data/photos/sheets/<group>.jpg
 *   3. edit the number here
 *   4. node server/scripts/build-photos.mjs --preview
 *   5. look at data/photos/preview/product-heroes.jpg and tile-check.jpg
 *
 * `grade` picks a look from build-photos.mjs. Slots with no good
 * openly-licensed photograph are deliberately left out and keep the generated
 * SVG artwork — a hand-drawn tile beats a mismatched photo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_PRODUCTS } from './catalog-data.mjs';
import { TEA_LOT_ROWS } from './data-lots.mjs';
import { buildTeaPhotos } from './build-tea-photos.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Editorial and banner photography. */
export const EDITORIAL_PHOTOS = {
  // The homepage and about-page hero banner. Uses the `banner` grade, which is
  // deliberately bright because the page lays its own dark overlay over it.
  hero: { pick: 'ambiance#22', grade: 'banner' },
  'story-terraces': { pick: 'ambiance#22', grade: 'editorial' },
  'story-plantation': { pick: 'ambiance#19', grade: 'editorial' },
  'story-harvest': { pick: 'ambiance#21', grade: 'editorial' },
  'story-pluck': { pick: 'ambiance#14', grade: 'editorial' },
  'story-withering': { pick: 'silver-needle#4', grade: 'editorial' },
  'story-ceremony': { pick: 'ambiance#27', grade: 'editorial' },
  'story-ceremony-2': { pick: 'gaiwan-good#6', grade: 'editorial' },
};

/**
 * Product photography.
 *
 * picks[0] is the tile; [1] and [2] are the gallery detail shots shown on the
 * product page and on card hover.
 *
 * Deliberately mixed subjects: leaf close-ups, brewed liquor, steeping vessels
 * and teaware. A grid of nothing but piles of dried leaf reads as monotonous, so
 * roughly a third of the tiles show the tea as a drink or in the vessel it is
 * brewed in.
 */
/**
 * Product photography for the products that are not tea.
 *
 * The tea department is deliberately absent. With a hundred teas and a rule that
 * no two products may share an image, hand-picking each one is how duplicates
 * crept in — `white#13` and `white#22` were each used twice, and every tea
 * category tile then collided with a product. Tea photographs are now drawn from
 * the pools in ./photo-pools.mjs by ./build-tea-photos.mjs, which hands out each
 * tile exactly once; `CATEGORY_PHOTOS` below still quotes tiles of its own, and
 * the pool skips anything already claimed.
 *
 * The teaware and gift-set entries stay hand-picked because there are only seven
 * of them and they are not part of the pooling problem.
 */
export const PRODUCT_PHOTOS = {
  /* --------------------------------------------------------------- teaware */
  'porcelain-gaiwan-set': { picks: ['gaiwan-good#6', 'teaware#1', 'teaware#5'], grade: 'product' },
  'glass-tea-tumbler': { picks: ['teaware#32', 'gaiwan-good#8', 'teaware#8'], grade: 'product' },
  // No unglazed zisha pot had both clean lighting and no museum label, so the
  // celadon-glazed clay pot is used — same family of Yixing ware, no label.
  'yixing-zisha-shi-piao-pot': { picks: ['yixing#7', 'yixing#12', 'yixing#3'], grade: 'product' },

  /* ------------------------------------------------------------ gift sets */
  'gongfu-starter-kit': { picks: ['bamboo-tray#1', 'gaiwan-good#1', 'yixing#4'], grade: 'product' },
  // No studio shot of a bamboo tea tray exists under an open licence, so the box
  // is represented by its contents: three of the teas inside it.
  'the-tea-voyage-gift-box': { picks: ['black#32', 'white#17', 'puerh#12'], grade: 'product' },
  // A flight of oolongs is presented in the vessels it is brewed in, because
  // the three teas inside it are already used as product photographs elsewhere.
  'oolong-explorer-flight': { picks: ['gaiwan-good#3', 'teaware#14', 'teaware#21'], grade: 'product' },

  // The last product without a photograph. A slatted bamboo tray, photographed
  // straight on, which is what the product is.
  'bamboo-tea-tray': { picks: ['bamboo-tray-photo#5', 'bamboo-tray-photo#4', 'teaware#11'], grade: 'product' },
};

/**
 * Category tile photography.
 *
 * Category tiles are portrait (4:5), so `build-photos.mjs` writes a
 * `<slug>-tile.jpg` derivative for these. Every category has a photograph —
 * teaware uses a table set with a gaiwan, cups and a pot, which reads as the
 * family rather than as one product.
 */
export const CATEGORY_PHOTOS = {
  'green-tea': { pick: 'green-leafy#9', grade: 'product' },
  'white-tea': { pick: 'silver-needle#3', grade: 'product' },
  'oolong-tea': { pick: 'oolong#2', grade: 'product' },
  'dan-cong': { pick: 'dancong#3', grade: 'product' },
  'rock-oolong': { pick: 'oolong#15', grade: 'product' },
  'black-tea': { pick: 'black#13', grade: 'product' },
  'pu-erh': { pick: 'puerh#1', grade: 'product' },
  'floral-blends': { pick: 'floral#34', grade: 'product' },
  'gift-sets': { pick: 'dianhong#1', grade: 'product' },
  teaware: { pick: 'teaware#3', grade: 'product' },
  jade: { pick: 'jade-jadeite#8', grade: 'product' },
  jewellery: { pick: 'jewellery#19', grade: 'product' },
};

/**
 * Jade and jewellery photography.
 *
 * These entries were written the other way round from the teas: the photographs
 * that actually exist were inventoried first, and the products in
 * server/data-jade.mjs were written to describe those pieces. Several drafts —
 * earrings, a chain pendant, a jade tea set — were dropped because the only
 * candidates on Commons were museum artefacts of a different object entirely,
 * and a photograph that does not show the product is worse than no photograph.
 */
export const JADE_PHOTOS = {
  /* ------------------------------------------------------------------ jade */
  'hetian-jade-buddha-pendant': { picks: ['jade-nephrite#23', 'jade-nephrite#24', 'jade-carving#2'], grade: 'product' },
  'jadeite-bangle-classic-round': { picks: ['jade-jadeite#3', 'jade-jadeite#4', 'jade-jadeite#6'], grade: 'product' },
  'jadeite-bangle-certified': { picks: ['jade-jadeite#7', 'jade-jadeite#5', 'jade-jadeite#12'], grade: 'product' },
  'jadeite-bangle-imperial': { picks: ['jade-jadeite#8', 'jade-jadeite#9', 'jade-jadeite#13'], grade: 'product' },
  'jade-carved-pendant-tiger': { picks: ['jade-jadeite#10', 'jade-nephrite#15', 'jade-nephrite#18'], grade: 'product' },
  'jade-dragon-pendant': { picks: ['jade-nephrite#26', 'jade-nephrite#27', 'jade-carving#20'], grade: 'product' },
  'jade-leaf-and-grape-pendant': { picks: ['jade-nephrite#22', 'jade-nephrite#17', 'jade-carving#12'], grade: 'product' },
  'jade-deer-study': { picks: ['jade-carving#9', 'jade-carving#16', 'jade-carving#6'], grade: 'product' },
  'jade-ruyi-sceptre': { picks: ['jade-carving#32', 'jade-carving#36', 'jade-carving#39'], grade: 'product' },
  'jade-and-nephrite-pair': { picks: ['jade-nephrite#25', 'jade-carving#40', 'jade-nephrite#29'], grade: 'product' },

  /* ------------------------------------------------------------- jewellery */
  'pearl-strand-necklace': { picks: ['pearls#5', 'pearls#4', 'pearls#9'], grade: 'product' },
  'jadeite-diamond-pendant': { picks: ['jade-jadeite#11', 'jewellery#19', 'jewellery#5'], grade: 'product' },
  'jade-gold-necklace-beads': { picks: ['jewellery#12', 'jewellery#24', 'jewellery#7'], grade: 'product' },
  'gold-filigree-cuff': { picks: ['jewellery#18', 'jewellery#16', 'jewellery#14'], grade: 'product' },
  'gold-and-jade-ring': { picks: ['rings#3', 'rings#15', 'rings#2'], grade: 'product' },
  'jadeite-and-gold-earrings': { picks: ['earrings#4', 'earrings#9', 'rings#20'], grade: 'product' },
  'imperial-jadeite-earrings': { picks: ['jewellery#20', 'earrings#14', 'earrings#2'], grade: 'product' },
};

/**
 * Non-Latin file titles and author names, transliterated.
 *
 * Some Wikimedia Commons files are titled in Chinese or Japanese, and a few
 * authors sign in their own script. Attribution has to name them, but this is an
 * English-language storefront, so both are shown transliterated. The mapping
 * lives in ./scripts/data/photo-transliterations.json — as data rather than
 * literals here, so the source stays free of non-Latin text.
 *
 * Keys are matched as substrings; the untranslated originals are preserved in
 * full in public/img/credits.json.
 */
const TRANSLITERATION_FILE = path.join(__dirname, 'scripts', 'data', 'photo-transliterations.json');

/**
 * Load the transliteration tables, tolerating the file being absent.
 *
 * This read used to be unconditional, and an unconditional read from a file that
 * was not in the repository took the whole site down on a fresh clone: the import
 * threw, the process exited, and Render reported only "deploy failed". Losing the
 * transliterations costs some non-Latin titles on the credits page and nothing
 * else, so it must not be fatal.
 */
function loadTransliterations() {
  try {
    const parsed = JSON.parse(fs.readFileSync(TRANSLITERATION_FILE, 'utf8'));
    return { titles: parsed.titles || {}, authors: parsed.authors || {} };
  } catch (err) {
    console.warn(`[photos] transliteration table unavailable (${err.code || err.message}) — credits will show original titles`);
    return { titles: {}, authors: {} };
  }
}

const TRANSLITERATIONS = loadTransliterations();

/**
 * Return an English display string for a title or author field.
 * Falls back to the original when nothing matches, so nothing is ever hidden.
 */
export function englishLabel(value) {
  const original = String(value ?? '');
  for (const table of [TRANSLITERATIONS.titles, TRANSLITERATIONS.authors]) {
    for (const [needle, english] of Object.entries(table || {})) {
      if (original.includes(needle)) return english;
    }
  }
  return original;
}

/**
 * The complete photo assignment.
 *
 * The generated tea lots are added here rather than pasted in, so the pools
 * remain the single place that decides which photograph goes to which tea. The
 * pools are seeded with everything the hand-written entries already claim, so a
 * tile can never be handed to two products.
 */
const _teaPhotos = buildTeaPhotos(BASE_PRODUCTS, TEA_LOT_ROWS, {
  ...EDITORIAL_PHOTOS,
  ...PRODUCT_PHOTOS,
  ...JADE_PHOTOS,
});
export const TEA_PHOTOS = _teaPhotos.photos;
export const TEA_PHOTO_PROBLEMS = _teaPhotos.problems;

export const ALL_ASSIGNMENTS = {
  ...EDITORIAL_PHOTOS,
  ...PRODUCT_PHOTOS,
  ...JADE_PHOTOS,
  ...TEA_PHOTOS,
};

export default {
  EDITORIAL_PHOTOS,
  PRODUCT_PHOTOS,
  CATEGORY_PHOTOS,
  JADE_PHOTOS,
  TEA_PHOTOS,
  englishLabel,
  ALL_ASSIGNMENTS,
};
