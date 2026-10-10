/**
 * The product catalogue.
 *
 * The hand-written core is `BASE_PRODUCTS`; `PRODUCTS` at the foot of this file
 * is the core plus everything generated from it. The derived entries are built
 * by code rather than pasted in as literals, so a change to a base tea — its
 * origin, its photograph, its price — flows through to its lots automatically
 * instead of leaving a stale copy behind.
 *
 * Kept as structured data so it is readable and editable without touching
 * application code. `server/seed.mjs` turns this into database rows.
 *
 * Prices are written in dollars and converted to integer cents on seeding —
 * every amount that reaches OTT Pay or the database is cents.
 */
import { buildTeaLots } from './build-lots.mjs';
import { buildPieces } from './build-pieces.mjs';

export const CATEGORIES = [
  {
    slug: 'green-tea',
    name: 'Green Tea',
    kind: 'tea',
    tagline: 'Unoxidised · pan-fired or steamed',
    family: 'Green',
    description:
      'Picked in spring and fixed within hours, green tea keeps the leaf green. Expect chestnut, cut grass and a clean, sweet finish — the taste of a Fujian or Zhejiang hillside in April.',
  },
  {
    slug: 'white-tea',
    name: 'White Tea',
    kind: 'tea',
    tagline: 'Withered only · the gentlest craft',
    family: 'White',
    description:
      'Nothing is fired, rolled or roasted. Buds and young leaves are simply withered in sun and air, then dried. The result is downy, delicate and quietly sweet, and it ages beautifully into honey and herb.',
  },
  {
    slug: 'oolong-tea',
    name: 'Oolong Tea',
    kind: 'tea',
    tagline: 'Partially oxidised · the artisan’s tea',
    family: 'Oolong',
    description:
      'The most demanding craft in tea: bruise the leaf, coax oxidation to a chosen point, then roast or roll it into shape. Oolong spans the floral and buttery to the deep, mineral and toasty.',
  },
  {
    slug: 'dan-cong',
    name: 'Phoenix Dan Cong',
    kind: 'tea',
    tagline: 'Single-tree Guangdong oolong',
    family: 'Dan Cong',
    description:
      'Grown on the Phoenix Mountain of Chaozhou from named single bushes, each with its own aroma signature — gardenia, honey orchid, almond. Picked from trees that can be a century old.',
  },
  {
    slug: 'rock-oolong',
    name: 'Wuyi Rock Oolong',
    kind: 'tea',
    tagline: 'Yancha · grown in mineral cliff soil',
    family: 'Rock Oolong',
    description:
      'Yancha means “rock tea”. These bushes grow in the narrow gorges of the Wuyi Mountains, rooted in weathered volcanic scree that gives the leaf its unmistakable mineral backbone, or yanyun.',
  },
  {
    slug: 'black-tea',
    name: 'Black Tea',
    kind: 'tea',
    tagline: 'Fully oxidised · malty and warm',
    family: 'Black',
    description:
      'Called hong cha, “red tea”, in China for the colour of the liquor. Full oxidation brings malt, cocoa, dried fruit and rose — the most forgiving tea to brew and the best with milk or on its own.',
  },
  {
    slug: 'pu-erh',
    name: 'Pu-erh',
    kind: 'tea',
    tagline: 'Yunnan · aged and fermented',
    family: 'Pu-erh',
    description:
      'Pressed into cakes and aged, pu-erh is the only tea that improves like wine. Raw (sheng) cakes mature slowly into camphor and stone fruit; ripe (shou) cakes are pile-fermented for an immediate dark, earthy depth.',
  },
  {
    slug: 'floral-blends',
    name: 'Floral & Scented',
    kind: 'tea',
    tagline: 'Scented with real blossom',
    family: 'Floral',
    description:
      'Tea layered with fresh jasmine, osmanthus, rose or chrysanthemum, repeatedly re-scented until the flowers have given everything to the leaf. Nothing artificial, ever.',
  },
  {
    slug: 'teaware',
    name: 'Teaware',
    kind: 'teaware',
    tagline: 'Yixing clay · gaiwan · glass',
    family: 'Teaware',
    description:
      'The vessels that make the tea. Unglazed Yixing zisha that seasons with every session, porcelain gaiwan for honest tasting, and heat-proof glass so you can watch the leaves open.',
  },
  {
    slug: 'gift-sets',
    name: 'Gift Sets',
    kind: 'gift',
    tagline: 'Boxed, ribboned, ready to give',
    family: 'Gift',
    description:
      'Curated flights in a lacquered presentation box, with tasting notes and brewing cards. The easy answer for a birthday, a client, or a first step into Chinese tea.',
  },
  {
    slug: 'jade',
    name: 'Jade & Stone',
    kind: 'jade',
    tagline: 'Nephrite and jadeite · hand-carved',
    family: 'Jade',
    description:
      'Chinese jade is worked, not cut: a piece is ground and polished for weeks until the stone gives up its depth. Nephrite from Hetian and Xinjiang, jadeite from the Burmese border, and carvers who still work entirely by hand.',
  },
  {
    slug: 'jewellery',
    name: 'Fine Jewellery',
    kind: 'jewellery',
    tagline: 'Gold, jade, pearl and silver',
    family: 'Jewellery',
    description:
      'Pieces built around the stone rather than the setting: 18k and 22k gold, South Sea pearls, and jade set the traditional way, with as little metal between you and the stone as the structure allows.',
  },
];

/**
 * Products. `family` drives the artwork palette (see server/imagery.mjs).
 * `variants` carry the price; the first is the default.
 */
const BASE_PRODUCTS = [
  /* ------------------------------------------------------------ GREEN TEA */
  {
    slug: 'lion-peak-longjing',
    sku: 'CY-GR-001',
    name: 'Lion Peak Longjing',
    subtitle: 'Pre-Qingming Dragon Well · handmade',
    category: 'green-tea',
    family: 'Green',
    seal: 'Dragon',
    origin: 'Lion Peak (Shifeng), West Lake, Hangzhou, Zhejiang',
    altitude: '280 m',
    cultivar: 'Longjing #43',
    harvest: 'Pre-Qingming (before 5 April), hand-picked',
    oxidation: 'Unoxidised',
    roast: 'Pan-fired in a wok by hand',
    caffeine: 'Moderate (~30 mg per cup)',
    liquor: 'Pale jade green',
    badges: ['Pre-Qingming', 'Handmade', 'Single origin'],
    rating: 4.9,
    review_count: 38,
    is_featured: 1,
    short_description:
      'The most famous green tea in China: flat, pressed leaves like little spears, pan-fired by hand the day they were picked.',
    description:
      'Longjing — “Dragon Well” — is the benchmark against which every Chinese green tea is judged, and Lion Peak is its most storied origin. Our lot is picked before the Qingming festival, when the buds are still tight and the amino acid content at its yearly peak, then fired by hand in a hot wok using the ten classical motions that flatten the leaf into a spear.\n\nBrewed, it gives chestnut and toasted soy, a whisper of orchid, and a sweetness that arrives late and lingers. There is no bitterness to manage. The leaves are so tender that we recommend water at 75 °C — pour it over the side of the vessel, never onto the leaf.',
    tasting_notes: ['Roasted chestnut', 'Toasted soy', 'Orchid', 'Sweet pea', 'Long finish'],
    brewing: {
      gaiwan: '3 g · 150 ml · 75 °C · 45 s, then +15 s per infusion · 5+ infusions',
      western: '2 g per 250 ml · 75 °C · 2 min',
      vessel: 'Glass or porcelain gaiwan, so you can watch the leaves sink',
    },
    variants: [
      { label: '25 g tin', grams: 25, price: 42, stock: 24, default: true },
      { label: '50 g tin', grams: 50, price: 78, stock: 16 },
      { label: '100 g tin', grams: 100, price: 146, stock: 7 },
    ],
  },
  {
    slug: 'biluochun-spring-snail',
    sku: 'CY-GR-002',
    name: 'Biluochun Spring Snail',
    subtitle: 'Dongting Mountain, Jiangsu',
    category: 'green-tea',
    family: 'Green',
    seal: 'Snail',
    origin: 'Dongting Mountain, Suzhou, Jiangsu',
    altitude: '220 m',
    cultivar: 'Local small-leaf',
    harvest: 'Late March, bud and one leaf',
    oxidation: 'Unoxidised',
    roast: 'Pan-fired, rolled by hand into spirals',
    caffeine: 'Moderate (~30 mg per cup)',
    liquor: 'Bright green-gold',
    badges: ['Fruit & floral', 'Hand-rolled'],
    rating: 4.8,
    review_count: 21,
    is_featured: 1,
    short_description: 'Tight spirals of bud and leaf with a fruit-and-floral perfume unlike any other green tea.',
    description:
      'Biluochun is grown between fruit orchards on Dongting Mountain, and growers swear the tea absorbs the perfume of the plum and apricot blossom around it. Whether or not that is botany, the cup does taste of white peach skin and honeysuckle over a green, slightly creamy base.\n\nThe leaf is rolled into “spring snail” spirals and dried with a light touch, so it stays intact and generous in the gaiwan. This is the green tea to pour for someone who says they do not like green tea.',
    tasting_notes: ['White peach', 'Honeysuckle', 'Creamed corn', 'Green apple'],
    brewing: {
      gaiwan: '3 g · 150 ml · 75–80 °C · 60 s, then +20 s · 4 infusions',
      western: '2 g per 250 ml · 80 °C · 2 min',
      vessel: 'Tall glass, to watch the spirals unfurl',
    },
    variants: [
      { label: '25 g tin', grams: 25, price: 32, stock: 30, default: true },
      { label: '50 g tin', grams: 50, price: 58, stock: 18 },
      { label: '100 g tin', grams: 100, price: 108, stock: 9 },
    ],
  },
  {
    slug: 'huangshan-maofeng',
    sku: 'CY-GR-003',
    name: 'Huangshan Maofeng',
    subtitle: 'Fur Peak · Anhui',
    category: 'green-tea',
    family: 'Green',
    seal: 'Fur Peak',
    origin: 'Huangshan (Yellow Mountain), Anhui',
    altitude: '800 m',
    cultivar: 'Huangshan big-leaf',
    harvest: 'Early April, bud and two leaves',
    oxidation: 'Unoxidised',
    roast: 'Pan-fired and baked',
    caffeine: 'Moderate',
    liquor: 'Clear pale gold',
    badges: ['High mountain', 'Classic'],
    rating: 4.7,
    review_count: 17,
    short_description: 'A misty-mountain green with downy buds, gentle smoke and an almost savoury depth.',
    description:
      'Huangshan Maofeng has been made on Yellow Mountain for well over a century, and its hallmark is the white down, or “fur”, that still clings to the bud. Grown at 800 m in near-permanent cloud, the leaf is thicker and slower-growing than lowland tea, and that shows up in the cup as body.\n\nExpect toasted rice, a faint woodsmoke from the bake, edamame and a softly savoury middle before a clean, sweet tail. It holds up to a heavier hand with the water than most greens.',
    tasting_notes: ['Toasted rice', 'Edamame', 'Light woodsmoke', 'Savoury', 'Clean finish'],
    brewing: {
      gaiwan: '4 g · 150 ml · 80 °C · 45 s, then +15 s · 5 infusions',
      western: '2 g per 250 ml · 80 °C · 2 min',
      vessel: 'Porcelain gaiwan',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 28, stock: 40, default: true },
      { label: '100 g tin', grams: 100, price: 52, stock: 22 },
      { label: '250 g pouch', grams: 250, price: 112, stock: 8 },
    ],
  },
  {
    slug: 'taiping-houkou',
    sku: 'CY-GR-004',
    name: 'Taiping Houkui',
    subtitle: 'Monkey King tea · giant flat leaves',
    category: 'green-tea',
    family: 'Green',
    seal: 'Hou Kui',
    origin: 'Houkeng village, Taiping, Anhui',
    altitude: '500 m',
    cultivar: 'Shidaccha',
    harvest: 'Late April, second leaf only',
    oxidation: 'Unoxidised',
    roast: 'Pressed flat between cloth and iron',
    caffeine: 'Low-moderate',
    liquor: 'Pale yellow-green',
    badges: ['Pressed flat', 'Low bitterness'],
    rating: 4.6,
    review_count: 11,
    short_description: 'Enormous flat jade leaves pressed into ribbons — the mildest, easiest-drinking green tea we sell.',
    description:
      'Houkui leaves are the largest in Chinese tea, sometimes 15 cm long, and they are pressed flat between cloth and iron plates until they look like little green blades. Because the leaf is mature, the tea is extraordinarily low in bitterness and almost impossible to over-brew.\n\nIt tastes of fresh corn silk, orchid and a soft orchid-like sweetness, with a faint minerality from the granite soil. A wonderful introduction — and a striking thing to put in a glass.',
    tasting_notes: ['Corn silk', 'Orchid', 'Steamed greens', 'Gentle mineral'],
    brewing: {
      gaiwan: '4 g · 150 ml · 80–85 °C · 60 s, then +20 s · 4 infusions',
      western: '2 g per 250 ml · 85 °C · 2–3 min',
      vessel: 'Tall glass; the leaf is the show',
    },
    variants: [
      { label: '25 g box', grams: 25, price: 26, stock: 26, default: true },
      { label: '50 g box', grams: 50, price: 46, stock: 14 },
    ],
  },

  /* ------------------------------------------------------------ WHITE TEA */
  {
    slug: 'silver-needle-baihao',
    sku: 'CY-WH-001',
    name: 'Silver Needle',
    subtitle: 'Bai Hao Yin Zhen · Fuding',
    category: 'white-tea',
    family: 'White',
    seal: 'Silver',
    origin: 'Taimu Mountain, Fuding, Fujian',
    altitude: '600 m',
    cultivar: 'Fuding Da Bai (Great White)',
    harvest: 'First ten days of spring, buds only',
    oxidation: 'Unoxidised — withered and air-dried only',
    roast: 'None',
    caffeine: 'Low (~15 mg per cup)',
    liquor: 'Almost colourless, silvered gold',
    badges: ['Buds only', 'Sun-withered', 'Ages well'],
    rating: 4.9,
    review_count: 44,
    is_featured: 1,
    short_description: 'Nothing but down-covered spring buds, withered in air. Hay, honey and melon — and it keeps improving for years.',
    description:
      'Silver Needle is the purest expression of white tea: only the unopened bud, still wrapped in silver down, picked in the first ten days of the spring flush and then left alone. No rolling, no firing, no shaping — just a slow wither and a low, patient dry.\n\nThe liquor is so pale it looks like water, and then the aroma arrives: fresh hay, cucumber skin, wildflower honey, white melon. It is nearly impossible to make bitter. Buy two tins: one to drink now, one to forget in a cupboard for three years, when it turns to apricot and dried herb.',
    tasting_notes: ['Fresh hay', 'Wildflower honey', 'White melon', 'Cucumber', 'Apricot (when aged)'],
    brewing: {
      gaiwan: '4 g · 150 ml · 85 °C · 60 s, then +20 s per infusion · 6+ infusions',
      western: '3 g per 250 ml · 85 °C · 3 min',
      vessel: 'Gaiwan; white tea rewards patience and heat',
    },
    variants: [
      { label: '25 g tin', grams: 25, price: 38, stock: 28, default: true },
      { label: '50 g tin', grams: 50, price: 70, stock: 15 },
      { label: '100 g tin', grams: 100, price: 132, stock: 6 },
    ],
  },
  {
    slug: 'white-peony-yueguangbai',
    sku: 'CY-WH-002',
    name: 'White Peony',
    subtitle: 'Bai Mudan · bud and leaf',
    category: 'white-tea',
    family: 'White',
    seal: 'Peony',
    origin: 'Zhenghe, Fujian',
    altitude: '500 m',
    cultivar: 'Zhenghe Da Bai',
    harvest: 'April, one bud and two leaves',
    oxidation: 'Unoxidised',
    roast: 'None',
    caffeine: 'Low (~20 mg per cup)',
    liquor: 'Soft straw gold',
    badges: ['Everyday white', 'Value'],
    rating: 4.7,
    review_count: 29,
    short_description: 'More leaf, more body, more forgiveness than Silver Needle — the white tea we drink daily.',
    description:
      'White Peony takes one bud and the two leaves below it, which means more leaf surface, more oxidation at the edges, and a rounder cup. Where Silver Needle whispers, White Peony speaks: melon rind, dried apricot, a touch of autumn leaf and a soft, slightly sour brightness that keeps it refreshing.\n\nIt is also remarkably good value, and it takes heat and long steeping without complaint. If you drink tea all day rather than ceremonially, start here.',
    tasting_notes: ['Melon rind', 'Dried apricot', 'Autumn leaf', 'Brown sugar'],
    brewing: {
      gaiwan: '5 g · 150 ml · 90 °C · 45 s, then +15 s · 6 infusions',
      western: '3 g per 250 ml · 90 °C · 3 min',
      vessel: 'Gaiwan or a big teapot; hard to spoil',
    },
    variants: [
      { label: '50 g pouch', grams: 50, price: 24, stock: 44, default: true },
      { label: '100 g pouch', grams: 100, price: 44, stock: 26 },
      { label: '250 g pouch', grams: 250, price: 96, stock: 10 },
    ],
  },
  {
    slug: 'aged-white-2019-shoumei',
    sku: 'CY-WH-003',
    name: 'Aged White 2019',
    subtitle: 'Shoumei cake · five years in Fuding',
    category: 'white-tea',
    family: 'White',
    seal: 'Aged',
    origin: 'Fuding, Fujian',
    altitude: '550 m',
    cultivar: 'Fuding Da Bai',
    harvest: 'Autumn 2019, pressed 2020',
    oxidation: 'Unoxidised, naturally aged',
    roast: 'None',
    caffeine: 'Low',
    liquor: 'Deep amber',
    badges: ['Aged 5 years', 'Compressed cake', 'Limited'],
    rating: 4.8,
    review_count: 16,
    is_new: 1,
    short_description: 'A 350 g pressed cake of autumn white tea, five years old: honey, date, warm wood and no astringency left at all.',
    description:
      'Shoumei is the leafier grade of white tea, and it is the grade that ages most dramatically. Pressed into a 350 g cake in 2020 and stored dry in Fuding since, this tea has gone from green and brisk to something closer to a light oolong: dark honey, dried jujube, warm cedar and a syrupy, almost oily texture.\n\nBreak the cake with a pick rather than a knife, use 6–7 g, and give it boiling water — aged white tea wants heat. It will keep improving for another decade.',
    tasting_notes: ['Dark honey', 'Dried jujube', 'Cedar', 'Stewed fruit', 'Syrupy'],
    brewing: {
      gaiwan: '6 g · 150 ml · 100 °C · 20 s, then +10 s · 8+ infusions',
      western: '4 g per 300 ml · 100 °C · 4 min',
      vessel: 'Yixing or a thick-walled gaiwan that holds heat',
    },
    variants: [
      { label: '350 g cake', grams: 350, price: 96, stock: 12, default: true },
      { label: 'Sample 25 g', grams: 25, price: 14, stock: 40 },
    ],
  },

  /* ----------------------------------------------------------- OOLONG TEA */
  {
    slug: 'tieguanyin-iron-goddess',
    sku: 'CY-OL-001',
    name: 'Tieguanyin Iron Goddess',
    subtitle: 'Anxi · light roast, orchid aroma',
    category: 'oolong-tea',
    family: 'Oolong',
    seal: 'Iron',
    origin: 'Xiping, Anxi, Fujian',
    altitude: '700 m',
    cultivar: 'Tieguanyin',
    harvest: 'Spring, after the rain',
    oxidation: '30% — light oxidation',
    roast: 'Light, gently baked to finish',
    caffeine: 'Moderate (~35 mg per cup)',
    liquor: 'Pale gold with a green cast',
    badges: ['Orchid aroma', 'Spring pick', 'Best seller'],
    rating: 4.9,
    review_count: 63,
    is_featured: 1,
    short_description: 'Tight jade-green pellets that open into a buttery, orchid-scented cup with a long, floral sweetness.',
    description:
      'Tieguanyin is rolled into dense pellets that rattle in the tin and unfurl into whole, thick leaves in the gaiwan. Our lot is a spring pick from Xiping, lightly oxidised and only barely roasted, which is the modern “jade” style: the aroma is all orchid and gardenia, the body is buttery and thick, and the finish hums with sweetness for minutes.\n\nThis is the oolong to pour for a sceptic. Nothing about it is difficult, and it will give seven or eight infusions from a single 5 g measure — one of the best value teas in the shop measured per cup.',
    tasting_notes: ['Orchid', 'Gardenia', 'Butter', 'Sugarcane', 'Creamy finish'],
    brewing: {
      gaiwan: '5 g · 150 ml · 95 °C · 30 s, then +10 s · 7+ infusions',
      western: '3 g per 250 ml · 95 °C · 2 min',
      vessel: 'Porcelain gaiwan; this tea wants to be smelled as much as drunk',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 34, stock: 36, default: true },
      { label: '100 g tin', grams: 100, price: 62, stock: 20 },
      { label: '250 g pouch', grams: 250, price: 138, stock: 6 },
    ],
  },
  {
    slug: 'wuyi-shuixian',
    sku: 'CY-RO-001',
    name: 'Wuyi Shuixian',
    subtitle: 'Rock oolong · charcoal roasted',
    category: 'rock-oolong',
    family: 'Rock Oolong',
    seal: 'Rock',
    origin: 'Wuyi Mountains, Fujian',
    altitude: '400 m, cliff-side terrace',
    cultivar: 'Shuixian (Water Sprite)',
    harvest: 'Late spring, open-face leaf',
    oxidation: '55%',
    roast: 'Traditional charcoal roast, three rounds',
    caffeine: 'Moderate',
    liquor: 'Deep amber, almost brandy',
    badges: ['Charcoal roasted', 'Mineral yanyun', 'Traditional'],
    rating: 4.8,
    review_count: 34,
    is_featured: 1,
    short_description: 'The definitive yancha: dark chocolate, wet stone and a mineral depth the Chinese call yanyun — “rock rhyme”.',
    description:
      'Shuixian is the workhorse cultivar of the Wuyi Mountains and, made properly with a charcoal roast, one of the great teas of China. Three separate roastings over glowing charcoal, with rest between each, drive off the green and leave behind cocoa, dried longan, sandalwood and wet slate.\n\nThe signature is yanyun — a cooling, mineral sensation that sits in the throat after you swallow and stays there. Unlike most oolongs, this one is better in its second year than its first, and it takes boiling water happily.',
    tasting_notes: ['Dark chocolate', 'Wet stone', 'Dried longan', 'Sandalwood', 'Mineral finish'],
    brewing: {
      gaiwan: '6 g · 120 ml · 100 °C · 20 s, then +10 s · 8+ infusions',
      western: '4 g per 300 ml · 100 °C · 3 min',
      vessel: 'Yixing zisha pot or thick gaiwan, pre-heated hard',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 46, stock: 22, default: true },
      { label: '100 g tin', grams: 100, price: 84, stock: 11 },
    ],
  },
  {
    slug: 'da-hong-pao',
    sku: 'CY-RO-002',
    name: 'Da Hong Pao',
    subtitle: 'Big Red Robe · reserve lot',
    category: 'rock-oolong',
    family: 'Rock Oolong',
    seal: 'Robes',
    origin: 'Wuyi Mountains, Fujian',
    altitude: '450 m',
    cultivar: 'Blend of Qi Dan and Bei Dou',
    harvest: 'Spring, first flush',
    oxidation: '60%',
    roast: 'Slow charcoal roast, five rounds',
    caffeine: 'Moderate',
    liquor: 'Burnished amber-red',
    badges: ['Reserve', 'Five-round roast', 'Gift worthy'],
    rating: 5.0,
    review_count: 19,
    short_description: 'China’s most famous tea, made from the Qi Dan and Bei Dou cultivars that stand in for the legendary mother trees.',
    description:
      'The original Da Hong Pao mother trees on the Wuyi cliffs produce a few hundred grams a year and are effectively unobtainable. What is obtainable — and what we buy — is tea from the Qi Dan and Bei Dou cultivars, direct descendants of those trees, grown a short walk away and roasted with the same five-round charcoal method.\n\nThe cup is extraordinary: caramelised plum, roasted chestnut, a floral top note that fades as the tea cools, and that rock-mineral throat feeling that never quite leaves. If you are buying one tea as a gift for someone who knows tea, it is this.',
    tasting_notes: ['Caramelised plum', 'Roasted chestnut', 'Orchid', 'Cocoa nib', 'Deep mineral'],
    brewing: {
      gaiwan: '6 g · 120 ml · 100 °C · 15 s, then +10 s · 9+ infusions',
      western: '4 g per 300 ml · 100 °C · 2–3 min',
      vessel: 'Pre-heated Yixing zisha; never wash the pot with soap',
    },
    variants: [
      { label: '25 g tin', grams: 25, price: 68, stock: 14, default: true },
      { label: '50 g tin', grams: 50, price: 126, stock: 7 },
      { label: '100 g tin', grams: 100, price: 238, stock: 3 },
    ],
  },
  {
    slug: 'milk-oolong-jinxuan',
    sku: 'CY-OL-002',
    name: 'Milk Oolong',
    subtitle: 'Jin Xuan · naturally milky',
    category: 'oolong-tea',
    family: 'Oolong',
    seal: 'Jin Xuan',
    origin: 'Nantou, Taiwan-style cultivar grown in Fujian',
    altitude: '900 m',
    cultivar: 'Jin Xuan (TTES #12)',
    harvest: 'Spring',
    oxidation: '25%',
    roast: 'Very light',
    caffeine: 'Low-moderate',
    liquor: 'Creamy pale gold',
    badges: ['No flavourings', 'Naturally creamy'],
    rating: 4.6,
    review_count: 41,
    short_description: 'Genuinely creamy — no flavouring added. The Jin Xuan cultivar produces lactones that taste of warm milk and vanilla.',
    description:
      'Most “milk oolong” on the market is sprayed with flavouring. Ours is not. The Jin Xuan cultivar, bred in Taiwan, naturally produces lactones during its particular wither, and grown at 900 m with the right timing those compounds read unmistakably as warm milk, vanilla custard and coconut.\n\nBecause there is nothing added, the aroma is soft rather than aggressive, and underneath it is a real oolong with real body. A superb tea for people who take milk in their coffee.',
    tasting_notes: ['Warm milk', 'Vanilla custard', 'Coconut', 'Sugarcane', 'Buttery'],
    brewing: {
      gaiwan: '5 g · 150 ml · 90 °C · 40 s, then +15 s · 6 infusions',
      western: '3 g per 250 ml · 90 °C · 2–3 min',
      vessel: 'Porcelain gaiwan',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 30, stock: 32, default: true },
      { label: '100 g tin', grams: 100, price: 54, stock: 18 },
    ],
  },
  {
    slug: 'dong-ding-oolong',
    sku: 'CY-OL-003',
    name: 'Dong Ding',
    subtitle: 'Frozen Summit · medium roast',
    category: 'oolong-tea',
    family: 'Oolong',
    seal: 'Dong Ding',
    origin: 'Lugu, Nantou, Taiwan',
    altitude: '1,200 m',
    cultivar: 'Qing Xin',
    harvest: 'Winter pick, hand-plucked',
    oxidation: '35%',
    roast: 'Medium, bamboo-basket baked',
    caffeine: 'Moderate',
    liquor: 'Clear golden amber',
    badges: ['High mountain', 'Winter pick'],
    rating: 4.8,
    review_count: 27,
    short_description: 'High-mountain Taiwanese oolong with the balance of floral top note and toasted, nutty base that Dong Ding is loved for.',
    description:
      'Dong Ding — “Frozen Summit” — is the classic Taiwanese oolong, and the style sits exactly between the green, floral high-mountain teas and the dark roasted ones. Ours is a winter pick from 1,200 m, given a medium bamboo-basket roast that leaves the aroma intact while building a toasted, nutty foundation.\n\nGinger flower and gardenia at the top, then roasted hazelnut and brown butter, then a clean, cool, sweet tail. Very stable in the gaiwan: it will keep giving past eight infusions without turning bitter.',
    tasting_notes: ['Ginger flower', 'Gardenia', 'Roasted hazelnut', 'Brown butter', 'Cool finish'],
    brewing: {
      gaiwan: '5 g · 150 ml · 95 °C · 30 s, then +10 s · 8 infusions',
      western: '3 g per 250 ml · 95 °C · 2 min',
      vessel: 'Gaiwan or small clay pot',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 44, stock: 20, default: true },
      { label: '100 g tin', grams: 100, price: 80, stock: 10 },
    ],
  },

  /* --------------------------------------------------- PHOENIX DAN CONG */
  {
    slug: 'mi-lan-xiang-dan-cong',
    sku: 'CY-DC-001',
    name: 'Mi Lan Xiang',
    subtitle: 'Honey Orchid Dan Cong',
    category: 'dan-cong',
    family: 'Dan Cong',
    seal: 'Honey',
    origin: 'Wudong, Phoenix Mountain, Chaozhou, Guangdong',
    altitude: '1,000 m',
    cultivar: 'Mi Lan Xiang single bush',
    harvest: 'Spring, single-bush pick',
    oxidation: '50%',
    roast: 'Light charcoal, twice',
    caffeine: 'Moderate-high',
    liquor: 'Golden apricot',
    badges: ['Single bush', 'Honey orchid', 'Chaozhou classic'],
    rating: 4.9,
    review_count: 31,
    is_featured: 1,
    short_description: 'The aroma that made Dan Cong famous: ripe peach, honey and orchid, in a cup that stays floral through ten infusions.',
    description:
      'Dan Cong means “single bush”, and on Phoenix Mountain each named bush is propagated by cutting and picked separately, so the aroma is a fixed characteristic rather than a blend. Mi Lan Xiang — Honey Orchid — is the most beloved of them all.\n\nThe dry leaf smells of stone fruit before you even add water. Brewed, it is ripe peach and longan, honeycomb, then a distinct orchid note that shifts and deepens across the session. Be generous with leaf and quick with the pour: Dan Cong is the one tea where a 10-second over-steep turns floral into bitter.',
    tasting_notes: ['Ripe peach', 'Longan', 'Honeycomb', 'Orchid', 'Almond skin'],
    brewing: {
      gaiwan: '6 g · 120 ml · 95–100 °C · 8 s first, then +5 s · 10+ infusions',
      western: '4 g per 300 ml · 95 °C · 90 s',
      vessel: 'Small porcelain gaiwan, pre-heated; pour fast and completely',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 52, stock: 18, default: true },
      { label: '100 g tin', grams: 100, price: 96, stock: 9 },
    ],
  },
  {
    slug: 'ya-shi-xiang-dan-cong',
    sku: 'CY-DC-002',
    name: 'Ya Shi Xiang',
    subtitle: 'Almond Aroma Dan Cong',
    category: 'dan-cong',
    family: 'Dan Cong',
    seal: 'Almond',
    origin: 'Wudong, Phoenix Mountain, Chaozhou, Guangdong',
    altitude: '1,050 m',
    cultivar: 'Ya Shi Xiang single bush',
    harvest: 'Spring',
    oxidation: '50%',
    roast: 'Light charcoal',
    caffeine: 'Moderate-high',
    liquor: 'Pale gold',
    badges: ['Single bush', 'Nutty', 'Limited'],
    rating: 4.7,
    review_count: 12,
    is_new: 1,
    short_description: 'Famously mis-named (“Duck Shit Aroma”): the cup is pure almond, marzipan and cream over a floral spine.',
    description:
      'The name is a legend — a farmer supposedly hid his best bush from tax collectors by giving it an ugly name. What matters is the cup: sweet almond, marzipan, warm cream, and underneath it the same orchid-and-stone-fruit spine that runs through all great Dan Cong.\n\nIf Mi Lan Xiang is the extrovert, Ya Shi Xiang is the quieter, more textural tea: less perfume, more body, a slightly oily mouthfeel and a very long sweet aftertaste.',
    tasting_notes: ['Sweet almond', 'Marzipan', 'Warm cream', 'Orchid', 'Oily texture'],
    brewing: {
      gaiwan: '6 g · 120 ml · 95 °C · 8 s first, then +5 s · 10 infusions',
      western: '4 g per 300 ml · 95 °C · 90 s',
      vessel: 'Small porcelain gaiwan',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 48, stock: 15, default: true },
      { label: '100 g tin', grams: 100, price: 88, stock: 8 },
    ],
  },

  /* ----------------------------------------------------------- BLACK TEA */
  {
    slug: 'lapsang-souchong-tongmuguan',
    sku: 'CY-BL-001',
    name: 'Lapsang Souchong',
    subtitle: 'Smoked over pine · Tongmu village',
    category: 'black-tea',
    family: 'Black',
    seal: 'Smoke',
    origin: 'Tongmu Pass, Wuyi Mountains, Fujian',
    altitude: '1,000 m',
    cultivar: 'Local Tongmu cultivar',
    harvest: 'May, mature leaf',
    oxidation: 'Fully oxidised',
    roast: 'Smoke-dried over burning pine for 8 hours',
    caffeine: 'High (~50 mg per cup)',
    liquor: 'Deep copper',
    badges: ['Pine smoked', 'Birthplace of black tea'],
    rating: 4.7,
    review_count: 25,
    short_description: 'The original smoked black tea, from the village where black tea was invented — pine smoke, longan and dark caramel.',
    description:
      'Black tea was invented here, in Tongmu, in the 16th century, and Lapsang Souchong is still made the old way: the leaf is withered and dried over smouldering pine wood in a two-storey smoke house, taking on resins that no flavouring can imitate.\n\nGood Lapsang is not an ash tray. Ours is sweet and round — pine resin, dried longan, dark caramel and a tarry edge — with none of the acrid harshness of cheaper versions. Excellent with a splash of milk in the morning, and a revelation in a whisky sour.',
    tasting_notes: ['Pine resin', 'Dried longan', 'Dark caramel', 'Tar', 'Campfire'],
    brewing: {
      gaiwan: '5 g · 150 ml · 95 °C · 30 s, then +15 s · 5 infusions',
      western: '3 g per 250 ml · 95 °C · 3 min; milk optional',
      vessel: 'Any pot you do not mind perfuming — the smoke lingers',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 26, stock: 34, default: true },
      { label: '100 g tin', grams: 100, price: 46, stock: 20 },
      { label: '250 g pouch', grams: 250, price: 98, stock: 8 },
    ],
  },
  {
    slug: 'yunnan-dianhong-golden-bud',
    sku: 'CY-BL-002',
    name: 'Golden Bud Dianhong',
    subtitle: 'Yunnan · all-bud reserve',
    category: 'black-tea',
    family: 'Black',
    seal: 'Dian Hong',
    origin: 'Fengqing, Lincang, Yunnan',
    altitude: '1,800 m',
    cultivar: 'Yunnan Da Ye (big-leaf assamica)',
    harvest: 'Spring, golden buds only',
    oxidation: 'Fully oxidised',
    roast: 'Sun-dried, traditional Yunnan method',
    caffeine: 'High (~55 mg per cup)',
    liquor: 'Bright red-gold with a golden halo',
    badges: ['All-bud', 'High mountain', 'Naturally sweet'],
    rating: 4.9,
    review_count: 52,
    is_featured: 1,
    short_description: 'Covered in golden down, sweet enough to drink without sugar: malt, cocoa, sweet potato and rose.',
    description:
      'Yunnan’s big-leaf assamica varietal grows slowly at 1,800 m and accumulates extraordinary sugar and amino acid content. This is an all-bud pick — only the golden, down-covered tips — and it needs nothing done to it: a long wither, full oxidation, and sun drying.\n\nThe cup is thick and syrupy, honeyed gold at the rim, and it tastes of malt, cocoa nib, roasted sweet potato and a rose-water top note. It takes milk well, but honestly it does not need it. This is the tea that converts coffee drinkers.',
    tasting_notes: ['Malt', 'Cocoa nib', 'Roasted sweet potato', 'Rose water', 'Honey'],
    brewing: {
      gaiwan: '5 g · 150 ml · 95 °C · 25 s, then +10 s · 6 infusions',
      western: '3 g per 250 ml · 95 °C · 3 min',
      vessel: 'Gaiwan or Western pot; milk optional',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 36, stock: 30, default: true },
      { label: '100 g tin', grams: 100, price: 66, stock: 17 },
      { label: '250 g pouch', grams: 250, price: 148, stock: 6 },
    ],
  },
  {
    slug: 'keemun-hao-ya',
    sku: 'CY-BL-003',
    name: 'Keemun Hao Ya',
    subtitle: 'Anhui · orchid and cocoa',
    category: 'black-tea',
    family: 'Black',
    seal: 'Keemun',
    origin: 'Qimen County, Anhui',
    altitude: '600 m',
    cultivar: 'Qimen Zhu Ye Zhong',
    harvest: 'April, bud and one leaf',
    oxidation: 'Fully oxidised',
    roast: 'Traditional basket-fired',
    caffeine: 'Moderate-high',
    liquor: 'Wine-red, clear and bright',
    badges: ['Classic', 'Fireside tea'],
    rating: 4.8,
    review_count: 23,
    short_description: 'The most refined of Chinese blacks: cocoa, orchid, dried plum and a faint pine-smoke memory.',
    description:
      'Keemun was, for a century, the tea China sold to the world under its own name — the base of English Breakfast blends at their best. Hao Ya is the top grade: fine, wiry, slightly grey leaves that brew a clear wine-red cup.\n\nIt is subtler than Yunnan and more complex than most: cocoa and dried plum first, then a distinct orchid aroma, then a restrained smokiness left over from the basket firing. Elegant rather than powerful, and wonderful in the late afternoon.',
    tasting_notes: ['Cocoa', 'Orchid', 'Dried plum', 'Faint pine smoke', 'Stone fruit'],
    brewing: {
      gaiwan: '5 g · 150 ml · 95 °C · 30 s, then +15 s · 5 infusions',
      western: '3 g per 250 ml · 95 °C · 3 min',
      vessel: 'Porcelain gaiwan or fine china pot',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 30, stock: 26, default: true },
      { label: '100 g tin', grams: 100, price: 54, stock: 14 },
    ],
  },
  {
    slug: 'jin-jun-mei',
    sku: 'CY-BL-004',
    name: 'Jin Jun Mei',
    subtitle: 'Tongmu · black tea dressed as gold',
    category: 'black-tea',
    family: 'Black',
    seal: 'Golden',
    origin: 'Tongmu Pass, Wuyi Mountains, Fujian',
    altitude: '1,100 m',
    cultivar: 'Local Tongmu cultivar, buds only',
    harvest: 'First flush, buds only',
    oxidation: 'Fully oxidised',
    roast: 'Unsmoaked, low charcoal finish',
    caffeine: 'High',
    liquor: 'Bright gold with rose-gold edge',
    badges: ['Buds only', 'Sister of Lapsang', 'Premium'],
    rating: 4.9,
    review_count: 18,
    is_new: 1,
    short_description: 'The refined sibling of Lapsang Souchong: unsmoked, all-bud, and startlingly sweet, floral and light.',
    description:
      'Jin Jun Mei was created in Tongmu in 2005 as an answer to the question: what would this village’s tea taste like without the smoke? The answer is one of the most sought-after black teas in China — all buds, fully oxidised, finished with a low charcoal bake instead of pine smoke.\n\nIt tastes unlike any other black tea: lychee and rose at first, then honey, then a light cocoa note, with a body that is silky rather than heavy. Because it is all bud, it is also unusually generous — six or seven infusions from 5 g.',
    tasting_notes: ['Lychee', 'Rose', 'Honey', 'Light cocoa', 'Silky body'],
    brewing: {
      gaiwan: '5 g · 150 ml · 90–95 °C · 20 s, then +10 s · 7 infusions',
      western: '3 g per 250 ml · 95 °C · 2–3 min',
      vessel: 'Porcelain gaiwan, to keep the aroma clean',
    },
    variants: [
      { label: '25 g tin', grams: 25, price: 58, stock: 16, default: true },
      { label: '50 g tin', grams: 50, price: 108, stock: 9 },
    ],
  },

  /* ------------------------------------------------------------ PU-ERH */
  {
    slug: 'menghai-7572-shou-cake',
    sku: 'CY-PE-001',
    name: 'Menghai 7572 Style',
    subtitle: 'Ripe (shou) cake · 357 g',
    category: 'pu-erh',
    family: 'Pu-erh',
    seal: 'Ripe',
    origin: 'Menghai, Xishuangbanna, Yunnan',
    altitude: '1,500 m',
    cultivar: 'Menghai big-leaf',
    harvest: 'Blend of 2019–2021 leaf, pressed 2022',
    oxidation: 'Post-fermented (pile-fermented)',
    roast: 'None',
    caffeine: 'Moderate',
    liquor: 'Dark mahogany, almost black',
    badges: ['Aged', 'Pile-fermented', '357 g cake'],
    rating: 4.8,
    review_count: 36,
    short_description: 'The everyday ripe pu-erh benchmark: dark, smooth and earthy, with date, cocoa and forest floor, and no bitterness at all.',
    description:
      '7572 is the recipe code of the tea that taught China to drink ripe pu-erh, and this is our homage: a blend of 2019–2021 Menghai leaf, pile-fermented to completion and pressed into a 357 g cake in 2022.\n\nRipe pu-erh is the most forgiving tea in the world. It cannot go bitter, it loves boiling water, and it steeps past a dozen infusions. The flavour is dark and rounded: dried date, cocoa, damp forest, a touch of camphor rising at the back of the throat. In Guangzhou it is drunk all day with dim sum, and for good reason — it cuts through fat better than anything else.',
    tasting_notes: ['Dried date', 'Cocoa', 'Forest floor', 'Camphor', 'Smooth, no astringency'],
    brewing: {
      gaiwan: '7 g · 150 ml · 100 °C · rinse once, then 15 s, +10 s · 12+ infusions',
      western: '5 g per 300 ml · 100 °C · 4 min',
      vessel: 'Yixing zisha pot, dedicated to pu-erh if you can',
    },
    variants: [
      { label: '357 g cake', grams: 357, price: 78, stock: 14, default: true },
      { label: 'Sample 25 g', grams: 25, price: 12, stock: 45 },
    ],
  },
  {
    slug: 'jingmai-raw-sheng-cake',
    sku: 'CY-PE-002',
    name: 'Jingmai Raw Sheng',
    subtitle: 'Raw cake · 357 g · 2021',
    category: 'pu-erh',
    family: 'Pu-erh',
    seal: 'Raw',
    origin: 'Jingmai Mountain, Pu’er Prefecture, Yunnan',
    altitude: '1,600 m',
    cultivar: 'Ancient-tree (gushu) big-leaf',
    harvest: 'Spring 2021, ancient-tree pick',
    oxidation: 'Unoxidised, sun-dried, ageing',
    roast: 'None — sun-dried (shai qing)',
    caffeine: 'Moderate-high',
    liquor: 'Pale gold turning amber with age',
    badges: ['Ancient trees', 'Sun-dried', 'Ageing potential'],
    rating: 4.9,
    review_count: 21,
    short_description: 'Pressed from ancient-tree spring leaf — bright, cooling and intensely aromatic now, and built to age for twenty years.',
    description:
      'Raw pu-erh is the long game. This cake was pressed from ancient-tree (gushu) spring leaf on Jingmai Mountain in 2021, sun-dried rather than kiln-fired, so the enzymes are still alive and the tea is still slowly changing in the wrapper.\n\nToday it is bright and bracing: orchid, raw sugarcane, a cooling menthol sensation down the throat and a distinct apricot sweetness in the aftertaste. In five years it will be rounder; in fifteen, it will be something else entirely. Buy two cakes — drink one, store one.',
    tasting_notes: ['Orchid', 'Raw sugarcane', 'Cooling menthol', 'Apricot', 'Slight astringency that will soften'],
    brewing: {
      gaiwan: '7 g · 150 ml · 100 °C · rinse once, then 10 s, +5 s · 12+ infusions',
      western: '5 g per 300 ml · 100 °C · 2–3 min',
      vessel: 'Porcelain gaiwan for tasting; clay pot for daily drinking',
    },
    variants: [
      { label: '357 g cake', grams: 357, price: 128, stock: 9, default: true },
      { label: 'Sample 25 g', grams: 25, price: 18, stock: 30 },
    ],
  },
  {
    slug: 'aged-shou-tuocha-2008',
    sku: 'CY-PE-003',
    name: 'Aged Shou Tuo 2008',
    subtitle: 'Bird’s nest tuo cha · 16 years old',
    category: 'pu-erh',
    family: 'Pu-erh',
    seal: 'Vintage',
    origin: 'Menghai, Yunnan',
    altitude: '1,400 m',
    cultivar: 'Menghai big-leaf',
    harvest: 'Pile-fermented 2008, stored in Kunming since',
    oxidation: 'Post-fermented, long-aged',
    roast: 'None',
    caffeine: 'Moderate',
    liquor: 'Deep, almost ink-black with a red rim',
    badges: ['16 years aged', 'Dry Kunming storage', 'Collector'],
    rating: 5.0,
    review_count: 9,
    short_description: 'Sixteen years of dry Kunming storage turned this tuo into something closer to old books and Chinese medicine than tea.',
    description:
      'A tuo cha is the little bowl-shaped brick that pu-erh was traditionally traded in. This one was pile-fermented in Menghai in 2008 and has since sat in dry Kunming storage — cool, stable, no warehouse mustiness — for well over a decade.\n\nAge has done what nothing else can. The cup is thick and dark, tasting of old books, ginseng, sandalwood and dried citrus peel, with a sweetness that arrives long after you swallow and an almost medicinal warmth that spreads through the chest. This is the tea to drink when you want to be quiet.',
    tasting_notes: ['Old books', 'Ginseng', 'Sandalwood', 'Dried citrus peel', 'Medicinal warmth'],
    brewing: {
      gaiwan: '7 g · 150 ml · 100 °C · rinse twice, then 20 s, +10 s · 15+ infusions',
      western: '5 g per 300 ml · 100 °C · 4–5 min',
      vessel: 'Yixing zisha, dedicated; pre-heat thoroughly',
    },
    variants: [
      { label: '100 g tuo', grams: 100, price: 118, stock: 6, default: true },
      { label: 'Sample 20 g', grams: 20, price: 26, stock: 22 },
    ],
  },

  /* --------------------------------------------------- FLORAL & SCENTED */
  {
    slug: 'jasmine-pearls-nine-scent',
    sku: 'CY-FL-001',
    name: 'Jasmine Pearls',
    subtitle: 'Nine-times scented · hand-rolled',
    category: 'floral-blends',
    family: 'Floral',
    seal: 'Jasmine',
    origin: 'Heng County, Guangxi (flowers) · Fuding, Fujian (tea)',
    altitude: '400 m',
    cultivar: 'Fuding Da Bai, hand-rolled into pearls',
    harvest: 'Summer 2024 tea, scented with July jasmine',
    oxidation: 'Unoxidised',
    roast: 'None',
    caffeine: 'Low-moderate',
    liquor: 'Very pale gold',
    badges: ['Nine scentings', 'Real flowers only', 'Hand-rolled'],
    rating: 4.9,
    review_count: 47,
    is_featured: 1,
    short_description: 'Scented nine separate times with fresh jasmine blossom — the real thing, and you can taste the difference instantly.',
    description:
      'Mass-market jasmine tea is sprayed with essence. Ours is made the slow way: green tea pearls are layered with freshly picked jasmine flowers at night, when the blossoms open and release their perfume, then separated and layered again. Nine times over nine nights.\n\nBecause nothing is added, the jasmine is soft and integrated rather than perfumed — it rises through the tea instead of sitting on top of it. The pearls unfurl over four or five infusions, each one slightly more honeyed than the last.',
    tasting_notes: ['Fresh jasmine', 'Lychee', 'Honey', 'Green melon', 'Soft finish'],
    brewing: {
      gaiwan: '4 g · 150 ml · 85 °C · 60 s, then +20 s · 5 infusions',
      western: '2 g per 250 ml · 85 °C · 2–3 min',
      vessel: 'Glass, so you can watch the pearls open',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 26, stock: 38, default: true },
      { label: '100 g tin', grams: 100, price: 46, stock: 21 },
      { label: '250 g pouch', grams: 250, price: 98, stock: 9 },
    ],
  },
  {
    slug: 'osmanthus-oolong',
    sku: 'CY-FL-002',
    name: 'Osmanthus Oolong',
    subtitle: 'Gui Hua · scented with golden blossom',
    category: 'floral-blends',
    family: 'Floral',
    seal: 'Osmanthus',
    origin: 'Wuyi Mountains, Fujian (tea) & Guilin, Guangxi (flowers)',
    altitude: '600 m',
    cultivar: 'Shuixian oolong base',
    harvest: 'Autumn, scented with October osmanthus',
    oxidation: '50%',
    roast: 'Light charcoal',
    caffeine: 'Low-moderate',
    liquor: 'Amber with a golden shimmer',
    badges: ['Autumn scenting', 'Real blossom'],
    rating: 4.8,
    review_count: 19,
    short_description: 'The scent of an autumn street in Guilin: apricot, warm honey and golden osmanthus laid over a light roasted oolong.',
    description:
      'Osmanthus blooms for about two weeks each October, and that is the whole window for making this tea. The tiny golden flowers are layered with a lightly roasted Shuixian oolong until the leaf has taken on their apricot-and-honey perfume.\n\nBecause the base is a real rock oolong rather than green tea, the cup has structure underneath the flower: a toasted, nutty spine and a mineral finish that keeps it from being merely sweet. Excellent iced, and extraordinary with a piece of plain cake.',
    tasting_notes: ['Golden osmanthus', 'Apricot', 'Warm honey', 'Toasted nut', 'Minerality'],
    brewing: {
      gaiwan: '5 g · 150 ml · 90 °C · 40 s, then +15 s · 6 infusions',
      western: '3 g per 250 ml · 90 °C · 2–3 min',
      vessel: 'Gaiwan; also excellent cold-brewed overnight',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 30, stock: 24, default: true },
      { label: '100 g tin', grams: 100, price: 54, stock: 13 },
    ],
  },
  {
    slug: 'rose-black-tea',
    sku: 'CY-FL-003',
    name: 'Rose Black',
    subtitle: 'Yunnan black with dried rose bud',
    category: 'floral-blends',
    family: 'Floral',
    seal: 'Rose',
    origin: 'Lincang, Yunnan (tea) · Pingyin, Shandong (roses)',
    altitude: '1,800 m',
    cultivar: 'Yunnan big-leaf black + Pingyin rose',
    harvest: 'Spring tea, rose buds picked in May',
    oxidation: 'Fully oxidised',
    roast: 'Sun-dried',
    caffeine: 'High',
    liquor: 'Deep red with a rose petal glow',
    badges: ['Whole rose buds', 'Naturally sweet'],
    rating: 4.7,
    review_count: 22,
    short_description: 'A malty Yunnan black layered with whole dried rose buds — Turkish delight, cocoa and jam.',
    description:
      'We blend a honeyed Golden Bud Dianhong with whole dried rose buds from Pingyin, the rose capital of China. Whole buds, not petals: they release their perfume slowly, so the tea changes across the pot rather than hitting you with a single wall of rose.\n\nThe base is malty and cocoa-ish, and the rose reads as Turkish delight and raspberry jam. Naturally sweet, so it needs nothing added. Beautiful with a square of dark chocolate.',
    tasting_notes: ['Turkish delight', 'Raspberry jam', 'Cocoa', 'Malt', 'Rose petal'],
    brewing: {
      gaiwan: '5 g · 150 ml · 95 °C · 30 s, then +15 s · 5 infusions',
      western: '3 g per 250 ml · 95 °C · 3 min',
      vessel: 'Any pot; also very good with a splash of milk',
    },
    variants: [
      { label: '50 g tin', grams: 50, price: 28, stock: 28, default: true },
      { label: '100 g tin', grams: 100, price: 50, stock: 15 },
    ],
  },
  {
    slug: 'chrysanthemum-tai-ju',
    sku: 'CY-FL-004',
    name: 'Chrysanthemum Tai Ju',
    subtitle: 'Whole blossoms · caffeine free',
    category: 'floral-blends',
    family: 'Floral',
    seal: 'Chrysanthemum',
    origin: 'Hangzhou, Zhejiang',
    altitude: '50 m',
    cultivar: 'Tai Ju chrysanthemum, whole flower heads',
    harvest: 'November, hand-picked at full bloom',
    oxidation: 'Not applicable',
    roast: 'Sun-dried',
    caffeine: 'None',
    liquor: 'Clear pale gold',
    badges: ['Caffeine free', 'Whole flowers', 'Evening tea'],
    rating: 4.6,
    review_count: 14,
    short_description: 'Whole chrysanthemum heads — nothing but flower. Cooling, faintly sweet, and the traditional answer to a hot afternoon.',
    description:
      'In China, chrysanthemum is drunk as a cooling herb rather than as a tea, most often with a few goji berries and a lump of rock sugar. These are whole Tai Ju flower heads from Hangzhou, picked at full bloom and sun-dried intact, so nothing but flower goes in your cup.\n\nThe taste is subtle — chamomile-adjacent but cleaner and more floral, with a natural sweetness and a slightly bitter edge at the back that Chinese medicine considers the point. Naturally caffeine free, so it is our go-to after dinner.',
    tasting_notes: ['Chamomile', 'Honey', 'Fresh hay', 'Gentle bitterness', 'Cooling'],
    brewing: {
      gaiwan: '3 flowers · 150 ml · 90 °C · 2 min · 3 infusions',
      western: '3 flowers per 250 ml · 90 °C · 3–4 min; add goji or rock sugar',
      vessel: 'Glass, so the flowers can float open',
    },
    variants: [
      { label: '40 g jar', grams: 40, price: 20, stock: 40, default: true },
      { label: '80 g jar', grams: 80, price: 34, stock: 22 },
    ],
  },

  /* ------------------------------------------------------------ TEAVVARE */
  {
    slug: 'yixing-zisha-shi-piao-pot',
    sku: 'CY-TW-001',
    name: 'Yixing Zisha Shi Piao Pot',
    subtitle: 'Unglazed purple clay · 180 ml',
    category: 'teaware',
    family: 'Teaware',
    seal: 'Teapot',
    origin: 'Dingshu, Yixing, Jiangsu',
    altitude: '—',
    cultivar: 'Zini (purple) clay, hand-thrown then hand-finished',
    harvest: 'Fired at 1,180 °C',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Unglazed zisha', 'Handmade', 'Seasons with use'],
    rating: 4.9,
    review_count: 26,
    is_featured: 1,
    short_description: 'A classic Shi Piao (“stone ladle”) in unglazed zini clay. Porous, so it remembers every tea you brew in it.',
    description:
      'Zisha clay from Yixing is fired without glaze, leaving it microscopically porous. Over months of use the pot absorbs the oils of the tea you brew in it, and eventually it seasons — the walls take on aroma and the water you pour in comes out already coloured by every session before it.\n\nDedicate it. One pot, one family of tea: oolong in this one, or pu-erh, but not both. 180 ml is the sweet spot for two to four people. After each session, rinse with hot water and leave to dry open. Never soap, never the dishwasher.',
    tasting_notes: [],
    brewing: {
      gaiwan: 'Fill two-thirds with leaf after a rinse; the clay holds heat better than porcelain',
      western: 'Not intended for Western-style brewing',
      vessel: 'Season with one tea family; rinse with hot water only, never soap',
    },
    variants: [
      { label: '180 ml · Zini', grams: 380, price: 118, stock: 8, default: true },
      { label: '240 ml · Zini', grams: 470, price: 148, stock: 5 },
      { label: '180 ml · Duanni (yellow)', grams: 380, price: 132, stock: 4 },
    ],
  },
  {
    slug: 'porcelain-gaiwan-set',
    sku: 'CY-TW-002',
    name: 'Porcelain Gaiwan Set',
    subtitle: 'Lidded cup · 150 ml · with two cups',
    category: 'teaware',
    family: 'Teaware',
    seal: 'Gaiwan',
    origin: 'Jingdezhen, Jiangxi',
    altitude: '—',
    cultivar: 'High-fired porcelain, celadon glaze',
    harvest: 'Hand-finished rim',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Jingdezhen porcelain', 'Tasting set', 'Gift boxed'],
    rating: 4.8,
    review_count: 31,
    short_description: 'The honest way to brew: a 150 ml gaiwan in celadon porcelain with two tasting cups. Neutral, so you taste only the tea.',
    description:
      'A gaiwan is a bowl with a lid and a saucer, and it is the vessel Chinese tea drinkers reach for first — it holds heat, pours cleanly, and because porcelain adds nothing to the water you taste the tea and nothing else. Seasoning a clay pot hides a tea’s faults; a gaiwan shows them.\n\nThis one is hand-finished in Jingdezhen in a soft celadon glaze, 150 ml, with a rim thick enough to hold without burning your fingers and two matching 40 ml tasting cups. Comes in a padded gift box.',
    tasting_notes: [],
    brewing: {
      gaiwan: '150 ml — the reference vessel for every tea on this site',
      western: 'Works as a small teapot if you prefer',
      vessel: 'Rinse with hot water; dishwasher safe, though hand-washing preserves the glaze',
    },
    variants: [
      { label: 'Gaiwan + 2 cups', grams: 620, price: 68, stock: 16, default: true },
      { label: 'Gaiwan only', grams: 340, price: 46, stock: 24 },
    ],
  },
  {
    slug: 'glass-tea-tumbler',
    sku: 'CY-TW-003',
    name: 'Double-Wall Glass Tumbler',
    subtitle: 'Watch the leaves open · 300 ml',
    category: 'teaware',
    family: 'Teaware',
    seal: 'Glass',
    origin: 'Qingdao, Shandong',
    altitude: '—',
    cultivar: 'Borosilicate glass with removable strainer',
    harvest: 'Hand-blown double wall',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Double walled', 'Insulated', 'Great for green tea'],
    rating: 4.5,
    review_count: 18,
    short_description: 'Double-walled borosilicate glass with a screw-in leaf strainer. Green tea was meant to be looked at.',
    description:
      'Longjing, Houkui, Silver Needle, jasmine pearls — these are teas you should be able to see. A double wall keeps the glass cool to hold while the tea inside stays hot, and the removable stainless strainer sits below the rim so the leaf keeps brewing as you drink.\n\n300 ml, borosilicate, dishwasher safe, and it does not retain flavours so you can go from jasmine in the morning to pu-erh in the afternoon without a rinse in between.',
    tasting_notes: [],
    brewing: {
      gaiwan: 'Not applicable',
      western: '2 g per 300 ml · 80 °C for greens, 95 °C for oolongs',
      vessel: 'Lift the strainer out when the tea is strong enough for you',
    },
    variants: [
      { label: '300 ml', grams: 420, price: 38, stock: 30, default: true },
      { label: '450 ml', grams: 560, price: 46, stock: 18 },
    ],
  },
  {
    slug: 'bamboo-tea-tray',
    sku: 'CY-TW-004',
    name: 'Bamboo Tea Tray',
    subtitle: 'Draining tray · 38 cm',
    category: 'teaware',
    family: 'Teaware',
    seal: 'Bamboo',
    origin: 'Anji, Zhejiang',
    altitude: '—',
    cultivar: 'Moso bamboo, carbonised',
    harvest: 'Hand-sanded and oiled',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Carbonised bamboo', 'Draining', 'Handmade'],
    rating: 4.6,
    review_count: 12,
    short_description: 'A slatted bamboo tray that catches the spills of a real gongfu session. The difference between a tidy table and a wet one.',
    description:
      'Gongfu brewing means pouring water over the pot, over the cups, and over the table. A tea tray catches all of it: slats on top, a reservoir underneath, so runoff drains away and your table stays dry.\n\nCarbonised moso bamboo, hand-sanded and finished with food-safe oil, 38 × 24 cm — big enough for a gaiwan set with room for cups. Wipe dry after use and re-oil once or twice a year and it will outlast the teapot.',
    tasting_notes: [],
    brewing: {
      gaiwan: 'Not applicable',
      western: 'Not applicable',
      vessel: 'Wipe dry after each session; re-oil annually with food-safe oil',
    },
    variants: [
      { label: '38 × 24 cm', grams: 1100, price: 54, stock: 12, default: true },
      { label: '50 × 30 cm', grams: 1800, price: 76, stock: 7 },
    ],
  },

  /* ---------------------------------------------------------- GIFT SETS */
  {
    slug: 'the-tea-voyage-gift-box',
    sku: 'CY-GS-001',
    name: 'The Tea Voyage',
    subtitle: 'Six teas · six origins',
    category: 'gift-sets',
    family: 'Gift',
    seal: 'Voyage',
    origin: 'Six regions across China',
    altitude: '—',
    cultivar: 'Six single-origin teas, 15 g each',
    harvest: 'Current season',
    oxidation: 'A full range, green to aged',
    roast: '—',
    caffeine: 'Varies',
    liquor: 'Varies',
    badges: ['Six 15 g tins', 'Tasting cards', 'Lacquered box'],
    rating: 5.0,
    review_count: 24,
    is_featured: 1,
    short_description: 'Our whole range in miniature: Longjing, Silver Needle, Tieguanyin, Da Hong Pao, Golden Bud and Menghai ripe pu-erh, in a lacquered box.',
    description:
      'The best way to find out which tea you actually love. Six 15 g tins — about four gongfu sessions each — covering the breadth of Chinese tea from an unoxidised spring green to a pile-fermented pu-erh, each with a printed card giving origin, harvest, brewing parameters and our tasting notes.\n\nPacked in a lacquered presentation box with a ribbon and a hand-written card if you ask for one at checkout. It is our most-gifted product and the one we would send to someone who has only ever drunk tea from a supermarket.',
    tasting_notes: ['Green', 'White', 'Oolong', 'Rock oolong', 'Black', 'Pu-erh'],
    brewing: {
      gaiwan: '3–5 g per tea · 120–150 ml · see the enclosed cards for temperature and timing',
      western: 'Each card also gives a Western-style ratio',
      vessel: 'A gaiwan will brew all six properly',
    },
    variants: [
      { label: '6 × 15 g box', grams: 90, price: 88, stock: 20, default: true },
      { label: '6 × 30 g box', grams: 180, price: 148, stock: 11 },
    ],
  },
  {
    slug: 'oolong-explorer-flight',
    sku: 'CY-GS-002',
    name: 'Oolong Explorer Flight',
    subtitle: 'Four oolongs · one roast spectrum',
    category: 'gift-sets',
    family: 'Gift',
    seal: 'Aroma',
    origin: 'Fujian, Guangdong and Taiwan',
    altitude: '—',
    cultivar: 'Four oolongs, 20 g each',
    harvest: 'Current season',
    oxidation: '25% to 60%',
    roast: 'From unroasted to five-round charcoal',
    caffeine: 'Moderate',
    liquor: 'Pale gold to burnished amber',
    badges: ['Four 20 g tins', 'Roast comparison', 'Lacquered box'],
    rating: 4.9,
    review_count: 15,
    is_new: 1,
    short_description: 'Tieguanyin, Milk Oolong, Da Hong Pao and Mi Lan Xiang — the same leaf, four completely different teas.',
    description:
      'Oolong is the most varied category in tea, and the fastest way to understand it is to drink four side by side. This flight runs from barely-oxidised and floral (Tieguanyin) through the naturally creamy (Milk Oolong) to a five-round charcoal roast (Da Hong Pao) and a single-bush Phoenix Dan Cong (Mi Lan Xiang).\n\nFour 20 g tins in a lacquered box, with a card explaining oxidation and roast and a suggested order to taste them in. A genuinely educational gift for someone who already drinks tea.',
    tasting_notes: ['Orchid', 'Warm milk', 'Caramelised plum', 'Ripe peach'],
    brewing: {
      gaiwan: '5 g · 120–150 ml · 90–100 °C · parameters on the enclosed card',
      western: '3 g per 250 ml · 2–3 min',
      vessel: 'One gaiwan is enough; taste in the order given, lightest first',
    },
    variants: [
      { label: '4 × 20 g box', grams: 80, price: 96, stock: 14, default: true },
      { label: '4 × 40 g box', grams: 160, price: 168, stock: 7 },
    ],
  },
  {
    slug: 'gongfu-starter-kit',
    sku: 'CY-GS-003',
    name: 'Gongfu Starter Kit',
    subtitle: 'Gaiwan, cups, tray and three teas',
    category: 'gift-sets',
    family: 'Gift',
    seal: 'Kit',
    origin: 'Jingdezhen, Anji and Fujian',
    altitude: '—',
    cultivar: 'Porcelain gaiwan set + bamboo tray + three 15 g teas',
    harvest: 'Current season',
    oxidation: 'Varies',
    roast: 'Varies',
    caffeine: 'Varies',
    liquor: 'Varies',
    badges: ['Everything included', 'Beginner friendly', 'Gift boxed'],
    rating: 4.9,
    review_count: 13,
    short_description: 'Everything needed for a first gongfu session: celadon gaiwan, two cups, bamboo tray and three teas — with a printed guide.',
    description:
      'The complete on-ramp. A 150 ml celadon gaiwan with two tasting cups, a carbonised bamboo draining tray, and three 15 g tins chosen to show how different tea can be: Tieguanyin, Golden Bud Dianhong and Menghai ripe pu-erh.\n\nIt also includes a folded A5 brewing guide covering water temperature, leaf ratio, timing and the basic pour, plus a card explaining what gongfu brewing actually is and why it is worth the trouble. Nothing else to buy.',
    tasting_notes: ['Orchid', 'Malt & cocoa', 'Dried date'],
    brewing: {
      gaiwan: 'Follow the enclosed A5 guide; 5 g per 150 ml is the general default',
      western: 'Each tea tin also lists a Western ratio',
      vessel: 'All included',
    },
    variants: [
      { label: 'Full kit', grams: 1600, price: 168, stock: 9, default: true },
      { label: 'Full kit + Tea Voyage', grams: 1700, price: 236, stock: 5 },
    ],
  },
/* ===== BEGIN jade & jewellery (generated from server/data-jade.mjs) ===== */
  {
    slug: 'hetian-jade-buddha-pendant',
    sku: 'CY-JD-001',
    name: 'White Jade Buddha Pendant',
    subtitle: 'Qing dynasty form · carved loose',
    category: 'jade',
    family: 'Jade',
    seal: 'Buddha',
    origin: 'Hetian, Xinjiang',
    altitude: '—',
    cultivar: 'Hetian white nephrite',
    harvest: 'Carved in the Qing manner, hand-finished 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Hand-carved', 'Nephrite', 'Certificate'],
    rating: 4.9,
    review_count: 18,
    is_featured: 1,
    short_description: 'A seated Buddha in the restrained Qing manner, carved from one piece of white nephrite with the soft, waxy surface collectors look for.',
    description: 'Hetian nephrite is the stone the Chinese have called jade for four thousand years. It is not the vivid green most Western buyers picture — that is jadeite, a harder and later arrival — but a dense white that carvers prize because it holds a fine edge and takes a soft polish without turning glassy.\n\nThis is cut from a single piece, with the figure following the shape of the stone rather than the stone being cut to fit a drawing. It arrives with a certificate of origin and a silk cord.',
    tasting_notes: ['Compact white nephrite', 'Waxy surface', 'Solid stone', 'Single carving'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Wear against the skin; nephrite deepens with handling'
  },
    variants: [
    {
      label: 'Pendant, 34 mm',
      grams: 18,
      price: 310,
      stock: 12,
      default: true
    },
    {
      label: 'Pendant, 45 mm',
      grams: 34,
      price: 520,
      stock: 8
    },
    {
      label: 'Pendant, 56 mm, finer stone',
      grams: 62,
      price: 880,
      stock: 4
    }
  ],
  },
  {
    slug: 'jadeite-bangle-classic-round',
    sku: 'CY-JD-002',
    name: 'Jadeite Bangle',
    subtitle: 'Classic round profile',
    category: 'jade',
    family: 'Jade',
    seal: 'Bangle',
    origin: 'Hpakant, Kachin State, Myanmar',
    altitude: '—',
    cultivar: 'Jadeite, round section',
    harvest: 'Cut and polished 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Full circle', 'Solid core', 'Certified'],
    rating: 4.8,
    review_count: 14,
    is_featured: 1,
    short_description: 'The classic round-section jadeite bangle, cut as a complete circle from a single core so the colour runs unbroken.',
    description: 'A bangle is cut from a core drilled out of a boulder, which is why the colour runs continuously around it and why the size cannot be adjusted afterwards. The round profile is the traditional one: comfortable, and the form that shows the evenness of the stone best.\n\nJadeite is graded on transparency and on treatment before colour. This is a naturally coloured stone, neither bleached nor polymer-filled, and each bangle is photographed individually because no two are alike.',
    tasting_notes: ['Round profile', 'Single core', 'Continuous colour', 'No treatment'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Measure your wrist against the inner diameter before ordering'
  },
    variants: [
    {
      label: 'Bangle, 54 mm inner',
      grams: 54,
      price: 460,
      stock: 8,
      default: true
    },
    {
      label: 'Bangle, 57 mm inner',
      grams: 62,
      price: 720,
      stock: 5
    },
    {
      label: 'Bangle, 60 mm, deeper colour',
      grams: 71,
      price: 1150,
      stock: 3
    }
  ],
  },
  {
    slug: 'jadeite-bangle-certified',
    sku: 'CY-JD-003',
    name: 'Certified Jadeite Bangle',
    subtitle: 'Laboratory report included',
    category: 'jade',
    family: 'Jade',
    seal: 'Certified',
    origin: 'Hpakant, Kachin State, Myanmar',
    altitude: '—',
    cultivar: 'Jadeite, Type A, laboratory certified',
    harvest: 'Cut and polished 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Type A untreated', 'Lab report', 'Insurance valuation'],
    rating: 4.9,
    review_count: 9,
    is_featured: 1,
    short_description: 'An untreated jadeite bangle with an independent laboratory report and an insurance valuation — the two documents that make a jade purchase safe.',
    description: 'At this level the paperwork matters as much as the stone. Most jadeite on the open market has been bleached and polymer-filled to improve its look, which is legal as long as it is disclosed and disastrous if it is not: treated stone is worth a fraction of natural stone and can discolour over years.\n\nThis bangle is Type A — natural, untreated — confirmed by an independent laboratory whose report travels with it. We also supply an insurance valuation, which is what an insurer actually asks for after a loss.',
    tasting_notes: ['Type A untreated', 'Full laboratory report', 'Insurance valuation', 'Natural colour'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Keep the report with the piece; it is half the value'
  },
    variants: [
    {
      label: 'Bangle, 55 mm, certified',
      grams: 58,
      price: 890,
      stock: 6,
      default: true
    },
    {
      label: 'Bangle, 58 mm, certified',
      grams: 68,
      price: 1420,
      stock: 4
    },
    {
      label: 'Bangle, 58 mm, deeper colour',
      grams: 70,
      price: 2350,
      stock: 2
    }
  ],
  },
  {
    slug: 'jadeite-bangle-imperial',
    sku: 'CY-JD-004',
    name: 'Imperial Green Bangle',
    subtitle: 'The collector’s grade',
    category: 'jade',
    family: 'Jade',
    seal: 'Imperial',
    origin: 'Hpakant, Kachin State, Myanmar',
    altitude: '—',
    cultivar: 'Jadeite, imperial green, certified',
    harvest: 'Cut and polished 2024, full documentation',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Imperial green', 'Museum grade', 'Laboratory certified'],
    rating: 5,
    review_count: 6,
    short_description: 'The colour that sets records at auction: saturated, slightly blue-leaning green, evenly present through the stone rather than patched into it.',
    description: 'Imperial green is the rarest colour in jadeite and the most imitated. It has to be a deep, vivid green with a faint blue undertone that reads as luminous rather than merely coloured, and it has to run through the whole stone — colour concentrated in patches is worth a fraction of even colour.\n\nFewer than ten bangles at this grade pass through our hands in a year. The report is available before you commit, and we hold it on file afterwards.',
    tasting_notes: ['Imperial green', 'Even throughout', 'Untreated', 'Full laboratory report'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Store in the supplied case; jadeite is hard but not unbreakable'
  },
    variants: [
    {
      label: 'Bangle, 54 mm, certified',
      grams: 56,
      price: 3900,
      stock: 2,
      default: true
    },
    {
      label: 'Bangle, 56 mm, certified',
      grams: 64,
      price: 6800,
      stock: 1
    },
    {
      label: 'Bangle, 58 mm, imperial grade',
      grams: 72,
      price: 9600,
      stock: 1
    }
  ],
  },
  {
    slug: 'jade-carved-pendant-tiger',
    sku: 'CY-JD-005',
    name: 'Carved Nephrite Pendant',
    subtitle: 'Crouching tiger · dark stone',
    category: 'jade',
    family: 'Jade',
    seal: 'Tiger',
    origin: 'Hetian, Xinjiang',
    altitude: '—',
    cultivar: 'Dark nephrite, hand-carved',
    harvest: 'Carved 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Hand-carved', 'Deep relief', 'Dark nephrite'],
    rating: 4.8,
    review_count: 11,
    short_description: 'A crouching tiger in deep relief on dark nephrite — the darker stone that shows incised detail better than white ever does.',
    description: 'A tiger is carved for courage and protection, and it is traditionally shown crouching rather than roaring: the coiled posture is harder to carve and reads as restrained strength. Deep relief on a dark stone is the combination that shows the carving off, because shadow does the work that colour does on a paler piece.\n\nCut from a single slab of dark nephrite with the reverse left smooth so it sits flat against the chest.',
    tasting_notes: ['Deep relief', 'Dark nephrite', 'Single slab', 'Flat reverse'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Wipe with a dry cloth; damp dulls dark nephrite'
  },
    variants: [
    {
      label: 'Pendant, 40 mm',
      grams: 24,
      price: 420,
      stock: 9,
      default: true
    },
    {
      label: 'Pendant, 52 mm',
      grams: 46,
      price: 760,
      stock: 6
    },
    {
      label: 'Pendant, 64 mm',
      grams: 78,
      price: 1340,
      stock: 3
    }
  ],
  },
  {
    slug: 'jade-dragon-pendant',
    sku: 'CY-JD-006',
    name: 'Jade Dragon Pendant',
    subtitle: 'Black nephrite · pierced carving',
    category: 'jade',
    family: 'Jade',
    seal: 'Dragon',
    origin: 'Hetian, Xinjiang',
    altitude: '—',
    cultivar: 'Black nephrite, pierced and carved',
    harvest: 'Carved 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Pierced work', 'Hand-carved', 'Black nephrite'],
    rating: 4.9,
    review_count: 8,
    is_new: 1,
    short_description: 'A pierced dragon in black nephrite — openwork carving, where the stone between the forms is removed rather than drawn.',
    description: 'Pierced work, or openwork, means cutting away the stone between the elements of the design so the dragon stands free within its own outline. It is where jade carving stops being relief and becomes sculpture, and it is unforgiving: the stone you remove cannot be put back, and thin bridges snap.\n\nBlack nephrite is the hardest colour to photograph and the most striking in the hand — it reads as near-black indoors and shows a green depth in daylight.',
    tasting_notes: ['Openwork', 'Free-standing forms', 'Black nephrite', 'No repairs'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Handle by the outer ring, not the openwork'
  },
    variants: [
    {
      label: 'Pendant, 45 mm',
      grams: 28,
      price: 560,
      stock: 7,
      default: true
    },
    {
      label: 'Pendant, 58 mm',
      grams: 52,
      price: 980,
      stock: 4
    },
    {
      label: 'Pendant, 70 mm',
      grams: 86,
      price: 1680,
      stock: 2
    }
  ],
  },
  {
    slug: 'jade-leaf-and-grape-pendant',
    sku: 'CY-JD-007',
    name: 'Jade Leaf and Grape Pendant',
    subtitle: 'Heirloom form · carved both faces',
    category: 'jade',
    family: 'Jade',
    seal: 'Leaf',
    origin: 'Hetian, Xinjiang',
    altitude: '—',
    cultivar: 'Nephrite, carved on both faces',
    harvest: 'Carved 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Carved both faces', 'Heirloom form', 'Hand-carved'],
    rating: 4.7,
    review_count: 13,
    short_description: 'A leaf and a bunch of grapes carved into one piece in the round — the old family pendant form, and a rebus for abundance.',
    description: 'The leaf-and-grape pendant is one of the oldest shapes in Chinese jade and one of the most given: the grape cluster stands for abundance and the leaf for continuity, so the whole piece reads as a wish for a large and prosperous family. Carvers like it because it is worked in the round rather than as a flat plaque.\n\nThis one is carved on both faces, with the grapes in relief down one side and the leaf veins incised on the other. It hangs from a silk cord and wears flat, and it is the sort of piece that gets handed down rather than replaced.',
    tasting_notes: ['Carved in the round', 'Both faces worked', 'Neutral everyday weight', 'Heirloom form'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Hangs flat under clothing; no protrusions to catch'
  },
    variants: [
    {
      label: 'Pendant, 42 mm',
      grams: 20,
      price: 300,
      stock: 15,
      default: true
    },
    {
      label: 'Pendant, 55 mm',
      grams: 38,
      price: 480,
      stock: 10
    },
    {
      label: 'Pendant, 68 mm',
      grams: 64,
      price: 820,
      stock: 5
    }
  ],
  },
  {
    slug: 'jade-deer-study',
    sku: 'CY-JD-008',
    name: 'Jade Deer Study',
    subtitle: 'Qing dynasty form · desk piece',
    category: 'jade',
    family: 'Jade',
    seal: 'Deer',
    origin: 'Hetian, Xinjiang',
    altitude: '—',
    cultivar: 'Nephrite, solid block carving',
    harvest: 'Carved 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Hand-carved', 'Substantial stone', 'Desk piece'],
    rating: 4.8,
    review_count: 6,
    is_new: 1,
    short_description: 'A deer at rest, the Qing emblem of a long career, carved from a solid block with the legs left whole.',
    description: 'The deer is a rebus: the word sounds like "emolument", so a carved deer means a long and prosperous official career. Qing carvers made them in sets for desks, and the form has not changed much — a seated animal, head turned, legs folded under.\n\nThis is a desk-scale study in a solid block of nephrite, with the legs carved into the mass rather than left standing free. That is both stronger and harder to carve: the shape has to read from one continuous block with nothing bearing weight.',
    tasting_notes: ['Seated pose', 'Solid block', 'Legs carved into mass', 'Desk scale'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Wipe with a soft dry cloth; never soak nephrite'
  },
    variants: [
    {
      label: 'Study, 9 cm',
      grams: 210,
      price: 890,
      stock: 5,
      default: true
    },
    {
      label: 'Study, 13 cm',
      grams: 460,
      price: 1780,
      stock: 3
    },
    {
      label: 'Study, 18 cm',
      grams: 920,
      price: 3400,
      stock: 2
    }
  ],
  },
  {
    slug: 'jade-ruyi-sceptre',
    sku: 'CY-JD-009',
    name: 'Jade Ruyi Sceptre',
    subtitle: 'Qing form · celadon nephrite',
    category: 'jade',
    family: 'Jade',
    seal: 'Ruyi',
    origin: 'Hetian, Xinjiang',
    altitude: '—',
    cultivar: 'Celadon nephrite, single shaft',
    harvest: 'Carved 2024, fitted stand included',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Display piece', 'Fitted stand', 'Qing form'],
    rating: 4.9,
    review_count: 5,
    is_featured: 1,
    short_description: 'The ruyi sceptre — "as you wish" — in celadon nephrite on a fitted stand. The classical Chinese gift for a person who needs nothing.',
    description: 'A ruyi is a sceptre, an ornament and a rebus at once: the name means "as you wish", and the form — a cloud or lingzhi head on a long shaft — has been given for good fortune since the Ming. It is what you give someone who has everything, precisely because it is for looking at rather than using.\n\nCarved from a single piece of celadon-green nephrite with the grain of the stone running along the shaft, and supplied with a stand cut to this exact piece.',
    tasting_notes: ['Single stone', 'Fitted stand', 'Celadon nephrite', 'Ming-dynasty form'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Keep out of direct sun; nephrite fades when bleached'
  },
    variants: [
    {
      label: 'Ruyi, 20 cm',
      grams: 260,
      price: 1650,
      stock: 4,
      default: true
    },
    {
      label: 'Ruyi, 28 cm',
      grams: 520,
      price: 3200,
      stock: 2
    },
    {
      label: 'Ruyi, 36 cm, premium stone',
      grams: 880,
      price: 5400,
      stock: 1
    }
  ],
  },
  {
    slug: 'jade-and-nephrite-pair',
    sku: 'CY-JD-010',
    name: 'White and Green Jade Pair',
    subtitle: 'Ming manner · flat sceptres',
    category: 'jade',
    family: 'Jade',
    seal: 'Pair',
    origin: 'Hetian, Xinjiang',
    altitude: '—',
    cultivar: 'White nephrite and green nephrite, matched',
    harvest: 'Carved 2024 as a pair',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Matched pair', 'Two stones', 'Hand-carved'],
    rating: 5,
    review_count: 4,
    is_new: 1,
    is_featured: 1,
    short_description: 'A white and a green nephrite flat sceptre, carved as a pair — the contrast between the two stones is the whole idea.',
    description: 'The Ming carvers made flat sceptres in pairs, one white and one green, and displayed them together: the two stones set each other off in a way neither does alone. It is an old idea and it still works, which is why matched pairs of anything survive less often than single pieces — one of the two gets lost.\n\nBoth plaques are cut from the same thickness of stone and finished identically, so the only difference between them is colour. The pair weighs within a few grams of each other.',
    tasting_notes: ['Matched pair', 'White and green', 'Identical finish', 'Display or gift'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Display flat, out of direct light'
  },
    variants: [
    {
      label: 'Pair, 18 cm each',
      grams: 480,
      price: 2200,
      stock: 3,
      default: true
    },
    {
      label: 'Pair, 24 cm each',
      grams: 820,
      price: 3850,
      stock: 2
    },
    {
      label: 'Pair, 30 cm each, premium stone',
      grams: 1240,
      price: 7300,
      stock: 1
    }
  ],
  },
  {
    slug: 'pearl-strand-necklace',
    sku: 'CY-JW-001',
    name: 'Pearl Strand Necklace',
    subtitle: 'Hand-matched · knotted on silk',
    category: 'jewellery',
    family: 'Jewellery',
    seal: 'Pearls',
    origin: 'Pearls from Broome, Australia · strung in Hong Kong',
    altitude: '—',
    cultivar: 'South Sea pearls, 11–13 mm, AAA lustre',
    harvest: 'Harvested 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['AAA lustre', 'Hand-matched', 'Silk knotted'],
    rating: 5,
    review_count: 12,
    is_featured: 1,
    short_description: 'A strand of South Sea pearls matched by hand across forty-odd pearls, knotted on silk between every one.',
    description: 'South Sea pearls come from the largest pearl oyster there is, which is why they are the biggest and carry the thickest nacre. Matching a strand is done entirely by eye: forty-odd pearls laid on a felt tray, sorted on colour, lustre and blemish together until no single pearl draws the eye.\n\nKnotted between each pearl, which is both the tradition and the practical answer — if the silk ever parts, you lose one pearl rather than all of them. AAA lustre, meaning a reflection sharp enough to read in.',
    tasting_notes: ['AAA lustre', 'Hand-matched', 'Thick nacre', 'Silk knotted'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Wear often; pearls keep their lustre by being worn'
  },
    variants: [
    {
      label: 'Strand, 9–10 mm',
      grams: 54,
      price: 480,
      stock: 6,
      default: true
    },
    {
      label: 'Strand, 11–12 mm',
      grams: 82,
      price: 980,
      stock: 4
    },
    {
      label: 'Strand, 12–13 mm, AAA',
      grams: 108,
      price: 2400,
      stock: 2
    }
  ],
  },
  {
    slug: 'jadeite-diamond-pendant',
    sku: 'CY-JW-002',
    name: 'Jadeite and Diamond Ring',
    subtitle: '18k white gold · certified stone',
    category: 'jewellery',
    family: 'Jewellery',
    seal: 'Ring',
    origin: 'Stone from Myanmar · set in Guangzhou',
    altitude: '—',
    cultivar: '18k white gold, Type A jadeite, diamond surround',
    harvest: 'Set 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['18k white gold', 'Certified jadeite', 'Brilliant cut'],
    rating: 4.9,
    review_count: 10,
    is_featured: 1,
    short_description: 'A cabochon jadeite in a diamond surround — the setting that made jade wearable with Western dress, and the reason it reads as a jewel rather than a curio.',
    description: 'Putting jade in a bright metal surround with diamonds is a Western idea and it works: one good cabochon, nothing else in the composition, and the stone carries the whole piece. The diamonds are not decoration so much as a light source — they lift the green.\n\nThis is a certified Type A jadeite cabochon in 18k white gold with a brilliant-cut diamond surround. A ring rather than a pendant, because a cabochon this size sits better on the hand than on a chain.',
    tasting_notes: ['Type A jadeite', '18k white gold', 'Diamond surround', 'Certified'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Ultrasonic cleaning is safe for the metal, not for the stone'
  },
    variants: [
    {
      label: 'Ring, 10 mm stone',
      grams: 6,
      price: 340,
      stock: 8,
      default: true
    },
    {
      label: 'Ring, 14 mm stone',
      grams: 9,
      price: 620,
      stock: 5
    },
    {
      label: 'Ring, 18 mm, imperial colour',
      grams: 13,
      price: 1150,
      stock: 2
    }
  ],
  },
  {
    slug: 'jade-gold-necklace-beads',
    sku: 'CY-JW-003',
    name: 'Jade Bead Necklace',
    subtitle: '108 beads · 18k clasp',
    category: 'jewellery',
    family: 'Jewellery',
    seal: 'Strand',
    origin: 'Stone from Qinghai · strung in Beijing',
    altitude: '—',
    cultivar: '108 nephrite beads, 18k gold clasp',
    harvest: 'Strung 2024 on silk',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['108 beads', 'Silk knotted', '18k clasp'],
    rating: 4.8,
    review_count: 16,
    is_featured: 1,
    short_description: 'One hundred and eight nephrite beads, knotted on silk between every one. Worn long, doubled, or wrapped as a bracelet.',
    description: 'A hundred and eight is the count of a mala, and a jade strand of that length is the most versatile piece of Chinese jewellery there is: long over a coat, doubled, or wound three times around the wrist. Knotted at every bead, which is traditional and also the reason a broken strand costs you one bead rather than the whole necklace.\n\nBeads for a strand like this are sorted by hand from several times as many. What does not match becomes a bracelet or is sold loose, which is what makes a well-matched strand expensive.',
    tasting_notes: ['108 matched beads', 'Hand-knotted silk', '18k clasp', 'Wear three ways'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Restringing recommended every three to five years'
  },
    variants: [
    {
      label: 'Strand, 6 mm beads',
      grams: 42,
      price: 460,
      stock: 7,
      default: true
    },
    {
      label: 'Strand, 8 mm beads',
      grams: 88,
      price: 880,
      stock: 4
    },
    {
      label: 'Strand, 10 mm, premium match',
      grams: 152,
      price: 1780,
      stock: 2
    }
  ],
  },
  {
    slug: 'gold-filigree-cuff',
    sku: 'CY-JW-004',
    name: 'Gold Filigree Cuff',
    subtitle: 'Hand-woven · jinsi craft',
    category: 'jewellery',
    family: 'Jewellery',
    seal: 'Filigree',
    origin: 'Dali, Yunnan',
    altitude: '—',
    cultivar: 'Sterling silver with 24k gold plating',
    harvest: 'Hand-woven 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Hand-woven', 'Heritage craft', 'Adjustable'],
    rating: 4.7,
    review_count: 19,
    short_description: 'Silver drawn to a third of a millimetre and woven by hand into a cuff, then gilded. A Dali craft unchanged in three hundred years.',
    description: 'Jinsi — "gold thread" — is a Yunnan craft in which silver is drawn into wire finer than a human hair, twisted, then woven into openwork that weighs almost nothing. It is unforgiving work: the wire work-hardens as it bends and snaps if you go back over a section too often.\n\nThis cuff is woven from about forty metres of wire and then gilded in 24k gold, which gives the warmth of gold at a fraction of the weight. It is firm but adjustable, so it can be eased to fit rather than coming in fixed sizes.',
    tasting_notes: ['Hand-woven', '40 m of wire', '24k gilding', 'Adjustable fit'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Reshape gently and rarely; work-hardened wire fatigues'
  },
    variants: [
    {
      label: 'Cuff, 16 mm wide',
      grams: 18,
      price: 320,
      stock: 12,
      default: true
    },
    {
      label: 'Cuff, 24 mm wide',
      grams: 32,
      price: 560,
      stock: 8
    },
    {
      label: 'Cuff, 24 mm, heavier gauge',
      grams: 48,
      price: 890,
      stock: 5
    }
  ],
  },
  {
    slug: 'gold-and-jade-ring',
    sku: 'CY-JW-005',
    name: 'Gold and Jade Ring',
    subtitle: 'Yellow gold · cabochon',
    category: 'jewellery',
    family: 'Jewellery',
    seal: 'Ring',
    origin: 'Stone from Myanmar · set in Shenzhen',
    altitude: '—',
    cultivar: '18k yellow gold, nephrite cabochon',
    harvest: 'Set 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['18k gold', 'Cabochon set', 'Sizes 5–9'],
    rating: 4.8,
    review_count: 13,
    short_description: 'A deep green cabochon raised on a plain yellow gold band — the traditional setting, and the one that shows a stone off best.',
    description: 'The Chinese setting for a ring stone is a cabochon raised clear of the band with no claws visible and nothing between the stone and the light. It is a simpler-looking solution than a diamond surround and harder to execute: the metal has to hold the stone invisibly, and the band has to be heavy enough not to twist.\n\n18k yellow gold, 4 mm at the top and tapered to 2.5 mm at the base of the finger. Made in half sizes from 5 to 9.',
    tasting_notes: ['Raised cabochon', '18k yellow gold', 'No visible claws', 'Half sizes'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Remove before swimming; chlorine dulls the polish'
  },
    variants: [
    {
      label: 'Ring, 8 × 6 mm stone',
      grams: 5,
      price: 520,
      stock: 10,
      default: true
    },
    {
      label: 'Ring, 10 × 8 mm stone',
      grams: 7,
      price: 940,
      stock: 6
    },
    {
      label: 'Ring, 12 × 10 mm, deeper green',
      grams: 9,
      price: 1720,
      stock: 3
    }
  ],
  },
  {
    slug: 'jadeite-and-gold-earrings',
    sku: 'CY-JW-006',
    name: 'Jadeite and Gold Earrings',
    subtitle: 'Matched pair · white gold',
    category: 'jewellery',
    family: 'Jewellery',
    seal: 'Earring',
    origin: 'Stone from Myanmar · set in Guangzhou',
    altitude: '—',
    cultivar: '18k white gold, matched jadeite pair',
    harvest: 'Set 2024',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Matched pair', '18k white gold', 'Certified'],
    rating: 4.9,
    review_count: 11,
    is_new: 1,
    short_description: 'A matched pair of jadeite drops in white gold — the pairing is the hard part, not the setting.',
    description: 'Earrings are the hardest piece to buy well because the two stones have to match: colour, translucency and size, and they have to come from the same rough. A mismatched pair is obvious across a room in a way a single stone never is.\n\nThese are cut from one piece of jadeite and set in 18k white gold, with posts for pierced ears and butterfly backs. The white metal is deliberate — a cool setting keeps pale green from going sallow.',
    tasting_notes: ['Matched pair', 'Single rough', '18k white gold', 'Certified stones'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Store flat; the drops are thin and chip if knocked together'
  },
    variants: [
    {
      label: 'Earrings, 8 mm drops',
      grams: 3,
      price: 380,
      stock: 8,
      default: true
    },
    {
      label: 'Earrings, 12 mm drops',
      grams: 5,
      price: 740,
      stock: 5
    },
    {
      label: 'Earrings, 14 mm, certified',
      grams: 7,
      price: 1980,
      stock: 2
    }
  ],
  },
  {
    slug: 'imperial-jadeite-earrings',
    sku: 'CY-JW-007',
    name: 'Imperial Jadeite Earrings',
    subtitle: '18k white gold · diamond accents',
    category: 'jewellery',
    family: 'Jewellery',
    seal: 'Imperial',
    origin: 'Stone from Myanmar · set in Guangzhou',
    altitude: '—',
    cultivar: '18k white gold, imperial green jadeite, diamonds',
    harvest: 'Set 2024, laboratory certified',
    oxidation: '—',
    roast: '—',
    caffeine: '—',
    liquor: '—',
    badges: ['Imperial colour', 'Certified', 'Diamond set'],
    rating: 5,
    review_count: 5,
    is_new: 1,
    is_featured: 1,
    short_description: 'Imperial green jadeite drops in white gold with a diamond accent each — the top of the range, in the one form that shows colour best.',
    description: 'A drop earring hangs free, which means light passes through the stone from behind as well as in front. That is why the best jadeite in a collection usually ends up on the ear: the same stone reads deeper and brighter there than it does set flat against the skin.\n\nImperial green, untreated, certified, in 18k white gold with a small diamond at each post to lift the green. Fewer than five pairs a year at this grade.',
    tasting_notes: ['Imperial green', 'Light through the stone', 'Certified untreated', 'Diamond accents'],
    brewing: {
    gaiwan: '—',
    western: '—',
    vessel: 'Store in the supplied case; the drops are irreplaceable'
  },
    variants: [
    {
      label: 'Earrings, 10 mm drops',
      grams: 4,
      price: 1280,
      stock: 3,
      default: true
    },
    {
      label: 'Earrings, 14 mm drops',
      grams: 7,
      price: 2950,
      stock: 2
    },
    {
      label: 'Earrings, 14 mm, imperial grade',
      grams: 7,
      price: 4900,
      stock: 1
    }
  ],
  },
/* ===== END jade & jewellery ===== */
];

/**
 * The full catalogue: the hand-written core, then everything derived from it.
 *
 * Ordering matters. Tea lots are built from the base teas, and the jade and
 * jewellery pieces are built last so their slugs and SKUs are checked against
 * everything that already exists — the first attempt at this produced two
 * different pieces both claiming the slug "gold-filigree-cuff".
 *
 * A problem here is thrown rather than logged: a catalogue with a duplicate slug
 * or a lot pointing at a tea that no longer exists is a broken shop, and it
 * should fail at boot rather than quietly seed something wrong.
 */
const _tea = buildTeaLots(BASE_PRODUCTS);
const _pieces = buildPieces([...BASE_PRODUCTS, ..._tea.products]);

const _catalogueProblems = [..._tea.problems, ..._pieces.problems];
if (_catalogueProblems.length) {
  throw new Error(
    `The generated catalogue is inconsistent — refusing to load:\n${_catalogueProblems.map((p) => `  - ${p}`).join('\n')}`,
  );
}

export const PRODUCTS = [...BASE_PRODUCTS, ..._tea.products, ..._pieces.products];

/** Short editorial copy used on the homepage and guide pages. */
export const EDITORIAL = {
  heroTitle: 'Tea, sourced at the mountain',
  heroSubtitle: 'Single-origin Chinese tea',
  intro:
    'We buy in small lots directly from growers and cooperatives in Fujian, Yunnan, Anhui and Guangdong — the same teas that are drunk in China, not the export blend. Every lot is tasted before it is listed, dated by harvest, and brewed in a gaiwan before we write a single note about it.',

  /* Announcement ticker that scrolls across the top of every page. */
  ticker: [
    'Free shipping over $79',
    'Pre-Qingming Longjing is in — 24 tins only',
    'Harvest-dated lots, re-ordered every season',
    '3-D Secure 2 · Visa · Mastercard · Amex · UnionPay',
    'Shipped from Canada within one business day',
  ],

  /* Four promises under the hero. */
  trust: [
    { icon: 'leaf', title: 'Direct from the grower', body: 'No middleman and no export blend. We know the mountain, the cultivar and the pick date.' },
    { icon: 'calendar', title: 'Dated by harvest', body: 'Every listing carries its season and processing method — a 2024 Dan Cong is not a 2022 one.' },
    { icon: 'gaiwan', title: 'Brewed before listed', body: 'Each tea is scored gongfu and Western style before it earns a place on this site.' },
    { icon: 'shield', title: 'Secure card payment', body: 'OTT Pay with 3-D Secure 2. Your card number never reaches our servers.' },
  ],

  /* The featured spotlight on the homepage. */
  spotlight: {
    productSlug: 'wuyi-shuixian',
    eyebrow: 'This month’s lot',
    heading: 'Wuyi Shuixian, three times over charcoal',
    body: 'Grown in the cliff soil of the Wuyi Mountains and roasted three separate times over glowing charcoal with a rest between each pass. The result is the mineral depth the Chinese call yanyun — “rock rhyme” — a cooling sensation that sits in the throat long after you swallow.',
    points: [
      '55% oxidation, traditional charcoal roast',
      'Cliff-side terrace at 400 m, Fujian',
      'Brews eight or more infusions from 6 g',
      'Better in its second year than its first',
    ],
  },

  /* Gift-set banner. */
  gift: {
    eyebrow: 'Gift sets',
    heading: 'A flight of six teas, in a lacquered box',
    body: 'The Tea Voyage covers the whole range in six 15 g tins — a spring green, a white, a jade oolong, a charcoal-roasted rock oolong, a honeyed Yunnan black and an aged ripe pu-erh — each with a printed card giving origin, harvest and brewing parameters. Our most-gifted product, and the fastest way to find out which tea you actually love.',
    productSlug: 'the-tea-voyage-gift-box',
    bullets: ['Six 15 g tins, about four gongfu sessions each', 'Printed tasting and brewing cards', 'Hand-written message on request'],
  },

  /* Brewing fundamentals, shown as numbered steps. */
  brewing: {
    eyebrow: 'How to brew',
    heading: 'Four things that decide the cup',
    intro:
      'Most disappointing tea is not bad tea — it is good tea brewed with water that is too hot, for too long, in a vessel that hides what it tastes like.',
    steps: [
      { title: 'Weigh the leaf', body: 'A gaiwan takes 5 g to 150 ml — roughly two heaped teaspoons. Weighing once teaches your eye for good.' },
      { title: 'Cool the water', body: '75–85 °C for green and white, 90–100 °C for oolong, a full rolling boil for rock oolong and pu-erh.' },
      { title: 'Pour fast, empty fully', body: 'A slow pour extracts unevenly and leaves the leaf stewing. Tip the vessel right over.' },
      { title: 'Add seconds each round', body: 'Start at 20–45 seconds and add 10–15 s per infusion. Good tea gives eight to fifteen.' },
    ],
  },

  /* Customer testimonials. Illustrative copy for this demo build. */
  testimonials: [
    {
      quote: 'The Da Hong Pao arrived two days after I ordered it and tasted like the tea I drank in Wuyishan. I have stopped buying tea anywhere else.',
      name: 'Marcus L.',
      location: 'Vancouver, CA',
      product: 'Da Hong Pao',
    },
    {
      quote: 'I asked which green tea to start with and got a real answer instead of a sales pitch. The Biluochun they suggested is now a permanent reorder.',
      name: 'Priya R.',
      location: 'Toronto, CA',
      product: 'Biluochun Spring Snail',
    },
    {
      quote: 'Bought the Tea Voyage as a gift and ended up keeping it. The brewing cards are genuinely useful — not the usual marketing filler.',
      name: 'Daniel K.',
      location: 'London, UK',
      product: 'The Tea Voyage',
    },
  ],

  /* Frequently asked questions. */
  faq: [
    {
      q: 'How fresh is the tea, really?',
      a: 'Green, white and lightly oxidised oolong teas are re-ordered every season and sold out rather than warehoused — the harvest date is on every listing. Dark oolong, black, white and pu-erh improve with age and are deliberately held.',
    },
    {
      q: 'I have never brewed loose leaf. Where do I start?',
      a: 'A gaiwan and one of the softer teas: our Biluochun, Golden Bud Dianhong or Jasmine Pearls forgive almost anything. Every product page gives both gongfu and Western parameters, and the Gongfu Starter Kit includes a printed guide.',
    },
    {
      q: 'How much is shipping, and where do you ship from?',
      a: 'Parcels leave our tea room in Canada within one business day. Shipping is complimentary over $79, otherwise a flat $9.50; express is $19. International delivery takes 7–14 business days.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'Visa, Mastercard, American Express, Discover, JCB, Diners Club and China UnionPay credit and debit cards, processed by OTT Pay with 3-D Secure 2 authentication.',
    },
    {
      q: 'Is my card safe?',
      a: 'Your card details are transmitted directly to OTT Pay over an encrypted connection and are never stored on our servers. We keep only the card brand and the last four digits so you can recognise the charge on your statement.',
    },
    {
      q: 'What if I do not like the tea?',
      a: 'Tell us and we will replace it or refund it. You do not need to send a half-used tin back across a border. Unopened tins are returnable for 30 days for a full refund.',
    },
    {
      q: 'Do you sell wholesale?',
      a: 'Yes, from 200 g per tea. Write to hello@chayuan.test with what you are looking for and we will send a price list and samples.',
    },
  ],
  pillars: [
    {
      title: 'Direct from the grower',
      body: 'No middleman, no export blend. We buy the lot, we know the mountain, and we can tell you the cultivar and the pick date.',
    },
    {
      title: 'Dated by harvest',
      body: 'Every listing carries its harvest season and processing method, because a 2024 spring Dan Cong and a 2022 one are different teas with the same name.',
    },
    {
      title: 'Small, fresh lots',
      body: 'Green and floral teas are re-ordered every season and sold out rather than warehoused. Freshness is the whole game for unoxidised tea.',
    },
    {
      title: 'Brewed before listed',
      body: 'Each tea is brewed gongfu and Western-style and scored on both before it earns a place on this site. If it is not good in a gaiwan, we do not sell it.',
    },
  ],
  guides: [
    {
      slug: 'how-to-brew-gongfu',
      title: 'How to brew gongfu style',
      family: 'Oolong',
      summary:
        'More leaf, less water, shorter steeps, many infusions. The Chinese method that gets the most out of a tea — and is far more forgiving than it looks.',
      body: [
        'Gongfu brewing uses a high ratio of leaf to water — typically 5 g to 120–150 ml — and then compensates with very short infusion times, starting around 10–30 seconds. The point is not strength, it is resolution: each infusion shows a different facet of the same tea.',
        'Warm the vessel first. Rinse the leaf with a fast pour of hot water and discard it — this wakes the tea and washes off dust. Then pour, and pour fast: an uneven pour means uneven extraction. Empty the vessel completely between infusions, or the leaf keeps steeping in the residue and turns bitter.',
        'Add 5–15 seconds to each successive infusion. Good oolong and pu-erh will give eight to fifteen infusions; the last ones are often the sweetest. If a tea turns harsh, your water is too hot, your pour too slow, or your leaf too fine.',
      ],
    },
    {
      slug: 'water-and-temperature',
      title: 'Water and temperature',
      family: 'Green',
      summary: 'The single biggest reason people think they dislike green tea is water that is 20 degrees too hot.',
      body: [
        'Green and white teas are the most delicate things in tea and the easiest to ruin. Water at 75–85 °C extracts sweetness and aroma; water at 100 °C extracts tannin and turns the cup bitter and spinach-like. Let a freshly boiled kettle sit for two or three minutes before you pour it over a Longjing.',
        'Oolong wants 90–100 °C, and rock oolong and pu-erh want a full rolling boil — they are built for it. Black tea sits in the middle at 90–95 °C.',
        'Water quality matters as much as temperature. Soft, low-mineral water makes noticeably better tea; heavily chlorinated tap water will flatten any aroma. If your tap water tastes of anything at all, filter it.',
      ],
    },
    {
      slug: 'storing-tea',
      title: 'Storing tea properly',
      family: 'Pu-erh',
      summary: 'Tea is a dried leaf that wants to reabsorb the world around it. Four rules keep it tasting like itself.',
      body: [
        'Keep it dark, keep it airtight, keep it dry, and keep it away from anything with a smell. Tea absorbs aroma indiscriminately — a tin next to coffee, soap or spices will taste of them within weeks.',
        'Green and lightly oxidised oolong teas are the most perishable: drink them within six to twelve months of harvest, and keep them sealed and cool. Do not refrigerate unless the tin is truly airtight, or condensation will ruin the leaf.',
        'Dark oolong, black tea and white tea improve with a year or two of dry storage. Pu-erh is the exception to nearly every rule — it is alive, and it needs a little air. Keep cakes wrapped in paper in a cupboard away from light and odours, and let them breathe.',
      ],
    },
    {
      slug: 'tea-and-health',
      title: 'What tea actually does',
      family: 'White',
      summary: 'An honest summary: tea is a pleasant, low-calorie drink with mild effects. Most of the extraordinary claims are marketing.',
      body: [
        'Tea contains caffeine, L-theanine and polyphenols. The combination of caffeine and L-theanine produces a calmer, more sustained alertness than coffee for many people, which is the most reliable effect and the reason China has drunk it for two thousand years.',
        'Green and white teas contain more catechins, and pu-erh contains compounds produced by fermentation that are being studied for metabolic effects. The research is genuinely interesting and genuinely incomplete. Anyone promising you a specific medical outcome from tea is selling something.',
        'The practical advice: tea is hydrating, contains negligible calories without sugar, and is a far better habit than most alternatives. Drink what you enjoy, in the amount that feels good, and be sceptical of anyone who tells you it will cure something.',
      ],
    },
  ],
};
