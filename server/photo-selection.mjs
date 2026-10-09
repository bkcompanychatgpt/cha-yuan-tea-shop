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
export const PRODUCT_PHOTOS = {
  /* ------------------------------------------------------------- green tea */
  'lion-peak-longjing': { picks: ['green-flat#2', 'green-flat#4', 'green-flat#8'], grade: 'product' },
  'biluochun-spring-snail': { picks: ['green-curly#4', 'green-curly#5', 'green-curly#6'], grade: 'product' },
  'huangshan-maofeng': { picks: ['green-leafy#4', 'green-leafy#8', 'green-leafy#7'], grade: 'product' },
  'taiping-houkou': { picks: ['green-leafy#20', 'green-leafy#7', 'green-leafy#19'], grade: 'product' },

  /* ------------------------------------------------------------- white tea */
  'silver-needle-baihao': { picks: ['silver-needle#2', 'silver-needle#3', 'silver-needle#14'], grade: 'product' },
  'white-peony-yueguangbai': { picks: ['white#15', 'white#13', 'white#22'], grade: 'product' },
  'aged-white-2019-shoumei': { picks: ['white#22', 'white#13', 'shoumei#1'], grade: 'product' },

  /* ---------------------------------------------------------------- oolong */
  'tieguanyin-iron-goddess': { picks: ['oolong#2', 'oolong#3', 'oolong#16'], grade: 'product' },
  'wuyi-shuixian': { picks: ['oolong#15', 'oolong#21', 'oolong#20'], grade: 'product' },
  'da-hong-pao': { picks: ['oolong#13', 'oolong#19', 'oolong#4'], grade: 'product' },
  'milk-oolong-jinxuan': { picks: ['oolong#22', 'oolong#10', 'oolong#26'], grade: 'product' },
  'dong-ding-oolong': { picks: ['oolong#28', 'oolong#20', 'oolong#10'], grade: 'product' },

  /* --------------------------------------------------- phoenix dan cong */
  'mi-lan-xiang-dan-cong': { picks: ['dancong#3', 'dancong#1', 'dan-cong#10'], grade: 'product' },
  'ya-shi-xiang-dan-cong': { picks: ['dancong#5', 'dancong#8', 'dan-cong#3'], grade: 'product' },

  /* ------------------------------------------------------------- black tea */
  'lapsang-souchong-tongmuguan': { picks: ['black#14', 'lapsang#7', 'lapsang#11'], grade: 'product' },
  'yunnan-dianhong-golden-bud': { picks: ['dianhong#1', 'dianhong#9', 'dianhong#10'], grade: 'product' },
  'keemun-hao-ya': { picks: ['black#13', 'black#18', 'black#20'], grade: 'product' },
  'jin-jun-mei': { picks: ['jinjunmei#3', 'jinjunmei#1', 'jinjunmei#2'], grade: 'product' },

  /* ----------------------------------------------------------------- puerh */
  'menghai-7572-shou-cake': { picks: ['puerh#1', 'puerh#8', 'puerh#10'], grade: 'product' },
  'jingmai-raw-sheng-cake': { picks: ['puerh#5', 'puerh#3', 'puerh#2'], grade: 'product' },
  'aged-shou-tuocha-2008': { picks: ['puerh#11', 'puerh#4', 'puerh#10'], grade: 'product' },

  /* ---------------------------------------------------------------- floral */
  'jasmine-pearls-nine-scent': { picks: ['floral#8', 'floral#7', 'floral#9'], grade: 'product' },
  'osmanthus-oolong': { picks: ['floral#18', 'floral#23', 'floral#21'], grade: 'product' },
  'rose-black-tea': { picks: ['floral#34', 'floral#30', 'floral#25'], grade: 'product' },
  'chrysanthemum-tai-ju': { picks: ['floral#22', 'silver-needle#6', 'floral#23'], grade: 'product' },

  /* --------------------------------------------------------------- teaware */
  'porcelain-gaiwan-set': { picks: ['gaiwan-good#6', 'teaware#1', 'teaware#5'], grade: 'product' },
  'glass-tea-tumbler': { picks: ['teaware#32', 'gaiwan-good#8', 'teaware#8'], grade: 'product' },
  // No unglazed zisha pot had both clean lighting and no museum label, so the
  // celadon-glazed clay pot is used — same family of Yixing ware, no label.
  'yixing-zisha-shi-piao-pot': { picks: ['yixing#7', 'yixing#12', 'yixing#3'], grade: 'product' },

  /* ------------------------------------------------------------ gift sets */
  'gongfu-starter-kit': { picks: ['bamboo-tray#1', 'gaiwan-good#6', 'yixing#12'], grade: 'product' },
  // No studio shot of a bamboo tea tray exists under an open licence, so the box
  // is represented by its contents: the six teas inside it.
  'the-tea-voyage-gift-box': { picks: ['dianhong#1', 'silver-needle#2', 'puerh#2'], grade: 'product' },
  'oolong-explorer-flight': { picks: ['oolong#2', 'oolong#15', 'oolong#22'], grade: 'product' },

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
  'hetian-jade-buddha-pendant': { picks: ['jade-nephrite#23', 'jade-nephrite#24', 'jade-carving#12'], grade: 'product' },
  'jadeite-bangle-classic-round': { picks: ['jade-jadeite#3', 'jade-jadeite#4', 'jade-jadeite#6'], grade: 'product' },
  'jadeite-bangle-certified': { picks: ['jade-jadeite#7', 'jade-jadeite#3', 'jade-jadeite#12'], grade: 'product' },
  'jadeite-bangle-imperial': { picks: ['jade-jadeite#8', 'jade-jadeite#7', 'jade-jadeite#13'], grade: 'product' },
  'jade-carved-pendant-tiger': { picks: ['jade-jadeite#10', 'jade-nephrite#15', 'jade-nephrite#18'], grade: 'product' },
  'jade-dragon-pendant': { picks: ['jade-nephrite#26', 'jade-nephrite#22', 'jade-carving#20'], grade: 'product' },
  'jade-leaf-and-grape-pendant': { picks: ['jade-nephrite#22', 'jade-nephrite#17', 'jade-carving#12'], grade: 'product' },
  'jade-deer-study': { picks: ['jade-carving#9', 'jade-carving#16', 'jade-carving#12'], grade: 'product' },
  'jade-ruyi-sceptre': { picks: ['jade-carving#32', 'jade-carving#36', 'jade-carving#39'], grade: 'product' },
  'jade-and-nephrite-pair': { picks: ['jade-nephrite#25', 'jade-carving#40', 'jade-nephrite#22'], grade: 'product' },

  /* ------------------------------------------------------------- jewellery */
  'pearl-strand-necklace': { picks: ['pearls#5', 'pearls#4', 'pearls#9'], grade: 'product' },
  'jadeite-diamond-pendant': { picks: ['jade-jadeite#11', 'jewellery#19', 'pearls#10'], grade: 'product' },
  'jade-gold-necklace-beads': { picks: ['jewellery#19', 'jewellery#24', 'jade-nephrite#22'], grade: 'product' },
  'gold-filigree-cuff': { picks: ['jewellery#18', 'jewellery#16', 'jewellery#14'], grade: 'product' },
  'gold-and-jade-ring': { picks: ['rings#3', 'rings#15', 'rings#2'], grade: 'product' },
  'jadeite-and-gold-earrings': { picks: ['pearls#11', 'pearls#10', 'rings#20'], grade: 'product' },
  'imperial-jadeite-earrings': { picks: ['jewellery#20', 'jade-jadeite#11', 'pearls#11'], grade: 'product' },
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
const TRANSLITERATIONS = JSON.parse(fs.readFileSync(TRANSLITERATION_FILE, 'utf8'));

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

export const ALL_ASSIGNMENTS = { ...EDITORIAL_PHOTOS, ...PRODUCT_PHOTOS, ...JADE_PHOTOS };

export default { EDITORIAL_PHOTOS, PRODUCT_PHOTOS, CATEGORY_PHOTOS, englishLabel, ALL_ASSIGNMENTS };
