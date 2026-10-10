/**
 * Photograph pools for the tea catalogue.
 *
 * The owner's requirement is that no two products share an image. With a hundred
 * teas that cannot be met by hand-picking a hundred tiles one at a time and
 * hoping, so the tiles are grouped into pools by the kind of tea they actually
 * show, and products draw from their pool in order. A tile is consumed once:
 * `buildTeaPhotos` walks the pools and strikes each pick off, so a photograph can
 * never appear on two products.
 *
 * Pools are ordered best-first. Every entry quotes a numbered tile from the
 * contact sheets in data/photos/sheets, and `validatePools` refuses to run if a
 * tile does not exist — a typo here would otherwise become a missing image on
 * the storefront rather than an error.
 *
 * Tiles known to carry burned-in captions, price tags, watermarks, shop
 * interiors or the wrong tea were seen during review and are deliberately absent.
 */

/**
 * Tiles that looked acceptable in a contact sheet and are not.
 *
 * Reviewing the pools by tile number is not enough: a tile has to be seen at the
 * size a customer sees it, next to the product it was assigned to. Rendering
 * every assignment with its product name attached — `check-photo-fit.mjs` — is
 * what caught these, and each line below is a photograph that would have shipped
 * on the wrong product:
 *
 *   green-leafy#20   flat leaves arranged in a star, a herbarium specimen
 *   green-flat#8     a pale grey pile; white tea, not Longjing
 *   green-flat#11    coarse dry leaf, wrong for a pan-fired flat tea
 *   green-more#15    long leaves laid out in a row, another specimen shot
 *   shoumei#1        a plastic tub with a Chinese label on it
 *   silver-needle#3  a bag with a scoop, Chinese label visible
 *   silver-needle#1  the same bag from another angle
 *   silver-needle#11/#13  coarse brown leaf, not silver needle
 *   white#3          a tea service with a slice of cake
 *   white-more#18    the same tea service
 *   white#29         a slice of cake on a plate
 *   floral#34/#35    read as peppercorns at thumbnail size; on inspection they
 *                    are dried rose, so they are used for the rose listings
 *   floral-more#2    a teabag in a cup, retail packaging behind it
 *   floral-more#34   a floral china teacup
 *   floral-more#3    orange slices in a plastic cup
 */
export const REJECTED_TILES = new Set([
  'green-leafy#20',
  'green-flat#8',
  'green-flat#11',
  'green-more#15',
  'shoumei#1',
  'silver-needle#3',
  'silver-needle#1',
  'silver-needle#11',
  'silver-needle#13',
  'white#3',
  'white-more#18',
  'white#29',
  'floral-more#2',
  'floral-more#34',
  'floral-more#3',
]);

/**
 * Which pool each hand-written base tea draws from. Lots inherit their base
 * tea's pool, because a lot of Longjing is still Longjing.
 */
export const BASE_POOL = {
  /* green */
  'lion-peak-longjing': 'green-flat',
  'biluochun-spring-snail': 'green-curly',
  'huangshan-maofeng': 'green-leafy',
  'taiping-houkou': 'green-leafy',

  /* white */
  'silver-needle-baihao': 'white-bud',
  'white-peony-yueguangbai': 'white-leaf',
  'aged-white-2019-shoumei': 'white-aged',

  /* oolong */
  'tieguanyin-iron-goddess': 'oolong-rolled',
  'milk-oolong-jinxuan': 'oolong-rolled',
  'dong-ding-oolong': 'oolong-rolled',

  /* rock oolong */
  'wuyi-shuixian': 'oolong-rock',
  'da-hong-pao': 'oolong-rock',

  /* dan cong */
  'mi-lan-xiang-dan-cong': 'oolong-dancong',
  'ya-shi-xiang-dan-cong': 'oolong-dancong',

  /* black */
  'lapsang-souchong-tongmuguan': 'black-smoky',
  'yunnan-dianhong-golden-bud': 'black-bud',
  'keemun-hao-ya': 'black-leaf',
  'jin-jun-mei': 'black-bud',

  /* pu-erh */
  'menghai-7572-shou-cake': 'puerh',
  'jingmai-raw-sheng-cake': 'puerh',
  'aged-shou-tuocha-2008': 'puerh',

  /* floral */
  'jasmine-pearls-nine-scent': 'floral-jasmine',
  'osmanthus-oolong': 'floral-other',
  'rose-black-tea': 'floral-other',
  'chrysanthemum-tai-ju': 'floral-chrysanthemum',
};

/** Ordered tiles per pool. First entry is the best photograph in the group. */
export const TEA_POOLS = {
  /* --------------------------------------------------------------- green */
  'green-flat': [
    'green-flat#4', 'green-flat#1', 'green-flat#3', 'green-flat#2', 'green-flat#8', 'green-flat#11',
    'green-more#1', 'green-more#57', 'green-more#15',
    'green-more#12', 'green-more#2', 'green-more#35',
  ],
  'green-curly': [
    'green-curly#1', 'green-curly#10', 'green-curly#3', 'green-curly#6', 'green-curly#11',
    'green-more#33', 'green-more#17', 'green-more#16',
    'green-more#38', 'green-more#30',
  ],
  'green-leafy': [
    'green-leafy#9', 'green-leafy#8', 'green-leafy#22', 'green-leafy#5', 'green-leafy#4',
    'green-leafy#2', 'green-leafy#1', 'green-leafy#10', 'green-leafy#20', 'green-leafy#19',
    'green-leafy#18', 'green-leafy#21', 'green-leafy#17', 'green-leafy#3',
    'green-more#22', 'green-more#25', 'green-more#26', 'green-more#13', 'green-more#55',
  ],
  'green-matcha': ['green-matcha#2', 'green-matcha#6', 'green-matcha#1', 'green-matcha#4', 'green-more#65'],

  /* --------------------------------------------------------------- white */
  'white-bud': [
    'silver-needle#2', 'silver-needle#6', 'silver-needle#7', 'white#8', 'white#9',
    'silver-needle#15', 'silver-needle#3', 'white#18', 'white#19', 'white#13',
    'silver-needle#13', 'silver-needle#11', 'silver-needle#12', 'silver-needle#1',
    'white-more#30', 'white-more#13', 'white-more#12',
  ],
  'white-leaf': [
    'white#22', 'white#15', 'white#3', 'white#12',
    'white-more#14', 'white-more#15', 'white-more#10', 'white-more#2', 'white-more#8',
  ],
  'white-aged': [
    'white-more#6', 'white-more#7', 'white-more#11', 'white-more#16', 'white-more#17',
    // White tea is pressed and stored, so the withering and cake photographs are
    // honest for an aged listing even though they are not studio shots.
    'white#4', 'white#5', 'white#6',
  ],

  /* -------------------------------------------------------------- oolong */
  'oolong-rolled': [
    'oolong-more#2', 'oolong-more#3', 'oolong-more#6', 'oolong-more#7', 'oolong-more#10',
    'oolong-more#11', 'oolong-more#16', 'oolong-more#1', 'oolong-more#4', 'oolong-more#8',
    'oolong-more#34', 'oolong-more#36',
    'oolong#2', 'oolong#3', 'oolong#13', 'oolong#20', 'oolong#11', 'oolong#12',
    'oolong#15', 'oolong#19', 'oolong#14', 'oolong#8', 'oolong#17', 'oolong#22',
  ],
  'oolong-rock': [
    'oolong-more#12', 'oolong-more#13', 'oolong-more#14', 'oolong-more#17', 'oolong-more#18',
    'oolong-more#31', 'oolong-more#33', 'rock-more#1', 'rock-more#2', 'rock-more#6', 'rock-more#5',
    'rock-oolong#1', 'rock-oolong#8', 'rock-oolong#15',
    'oolong-more#21', 'oolong-more#22', 'oolong-more#23',
    'oolong#21', 'oolong#16', 'oolong#6', 'oolong#28', 'oolong#7', 'oolong#9', 'oolong#10', 'oolong#26',
  ],
  'oolong-dancong': [
    'dan-cong#2', 'dan-cong#3', 'dan-cong#4', 'dan-cong#5', 'dan-cong#6', 'dan-cong#9',
    'dancong#1', 'dancong#2', 'dancong#3', 'dancong#4', 'dancong#5', 'dancong#8',
    'dan-cong#7', 'dan-cong#1', 'dan-cong#8', 'dan-cong#10', 'dan-cong#11',
    'dancong#6', 'dancong#7', 'dancong#9', 'dancong#10',
    'oolong-more#9', 'oolong-more#24', 'oolong-more#29',
  ],

  /* --------------------------------------------------------------- black */
  'black-smoky': [
    'lapsang#3', 'lapsang#6', 'lapsang#7', 'lapsang#9', 'lapsang#1', 'lapsang#2',
    'lapsang#13', 'lapsang#12', 'lapsang#11', 'lapsang#5', 'lapsang#8',
    'black#20', 'black#36', 'black#23',
  ],
  'black-bud': [
    'jinjunmei#2', 'jinjunmei#3', 'dianhong#10', 'dianhong#1', 'dianhong#2',
    'dianhong#11', 'dianhong#12', 'dianhong#3', 'dianhong#9',
    'rock-more#25', 'rock-more#19', 'rock-more#24',
    'black#35', 'black#14', 'black#12', 'black#17',
  ],
  'black-leaf': [
    'black#24', 'black#18', 'black#19', 'black#15', 'black#16', 'black#1',
    'black#33', 'black#26', 'black#20', 'black#36', 'black#23',
  ],

  /* --------------------------------------------------------------- pu-erh */
  puerh: [
    'puerh#7', 'puerh#6', 'puerh#19', 'puerh#20', 'puerh#1', 'puerh#8',
    'puerh#27', 'puerh#9', 'puerh#3', 'puerh#5', 'puerh#10', 'puerh#26',
    'puerh#28', 'puerh#18', 'puerh#21', 'puerh#2', 'puerh#4', 'puerh#11',
    'puerh-brewed#4',
  ],

  /* --------------------------------------------------------------- floral */
  /*
   * Split by the flower actually in the picture, not by "floral tea".
   *
   * The first version pooled all of them together, which put an osmanthus tile
   * on a jasmine listing and a cup of jasmine on a chrysanthemum one. Each pool
   * below was classified by looking at the sheet.
   */
  'floral-jasmine': [
    'floral#1', 'floral#4', 'floral#7', 'floral#8', 'floral#9',
    'floral-more#1', 'floral-more#5', 'floral-more#6', 'floral-more#7',
  ],
  'floral-chrysanthemum': [
    'floral#22', 'floral#23', 'floral#24', 'floral#39',
    'floral-more#9', 'floral-more#10', 'floral-more#14', 'floral-more#15',
  ],
  'floral-other': [
    /*
     * Ordered by the products that will consume it.
     *
     * The two osmanthus listings take the first two pairs, so the osmanthus tiles
     * come first and everything after them is dried rose. The pool is drawn in
     * order and a product takes both its pictures before the next one is served,
     * which is why this ordering is the fix and not a comment: putting an
     * osmanthus tile fifth gave it to the first rose listing.
     */
    'floral#18', 'floral#19', 'floral#29', 'floral-more#20',
    'floral-more#37', 'floral-more#27', 'floral#34', 'floral#35', 'floral-more#21', 'floral-more#1',
  ],
};
