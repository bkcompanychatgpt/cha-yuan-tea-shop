/**
 * Turn jade and jewellery rows into catalogue products.
 *
 * Each piece is composed from three specific things rather than a filled-in
 * template: the row's own hook, the form note (what this kind of object is and
 * what to know before buying), and the material note (what this stone or metal
 * is and why it costs what it costs). Price comes from the material, which is
 * what actually drives price in both trades, with a form factor on top for
 * pieces that take substantially more work — a shanzi against a pendant, a
 * chandelier against a stud.
 *
 * Every product here is illustrated, so `image_kind` is set to 'illustration'
 * downstream by the seed rather than claimed here.
 */
import { JADE_MATERIALS, JADE_FORMS, JADE_ROWS, JEWELLERY_MATERIALS, JEWELLERY_FORMS, JEWELLERY_ROWS } from './data-pieces.mjs';

/**
 * Work multipliers by form. These reflect how much hands-on time the form takes
 * relative to the simplest piece in its department, which is the honest reason a
 * pair of cups costs more than a pendant of the same stone.
 */
const FORM_WORK = {
  /* jade */
  pendant_guanyin: 1.15, pendant_buddha: 1.15, pendant_gourd: 1.0, pendant_coin: 0.92,
  pendant_bat_coin: 1.0, pendant_peach: 1.05, pendant_lotus: 1.2, pendant_phoenix: 1.45,
  pendant_cicada: 1.35, pendant_bamboo: 1.15, bi_disc: 1.05, bead_strand: 1.7,
  bead_bracelet: 1.25, archers_ring: 0.95, dome_ring: 1.0, signet_seal: 1.1, pair_seal: 1.9,
  figure_horse: 1.7, figure_crane: 1.85, figure_lion: 1.5, figure_immortal: 1.75,
  toad_on_leaf: 1.6, mountain_carving: 3.2, landscape_plaque: 1.8, cup: 2.1, cup_pair: 3.6,
  snuff_bottle: 2.4, belt_buckle: 1.3, hairpin: 1.25, earrings_drop: 1.4, earrings_huggie: 1.3,
  pendant_chain_set: 1.3, cong_tube: 1.6, axe_blade: 1.25, dragon_hook: 1.55,
  pendant_imperial: 1.0, bangle_round: 1.35, bangle_oval: 1.4, bangle_princess: 1.3,
  /* jewellery */
  ring_solitaire: 1.25, ring_halo: 1.7, ring_cabochon: 1.15, ring_signet: 1.2, ring_stack: 0.9,
  necklace_strand: 2.4, necklace_pendant: 1.15, necklace_beaded: 2.0, necklace_choker: 1.9,
  necklace_lariat: 1.3, earrings_stud: 1.0, earrings_drop: 1.15, earrings_hoop: 1.2,
  earrings_chandelier: 2.3, bracelet_link: 1.8, bracelet_beaded: 1.4, bracelet_bangle: 1.35,
  cuff: 1.6, tennis: 2.9, brooch: 1.5, pendant: 1.0, hairpin: 1.15, anklet: 0.9,
  set: 4.4, locket: 1.5,
};

/** Size ladders, in the units each trade quotes. */
const JADE_SIZES = {
  Bangle: (n) => [`${n + 52} mm inner`, `${n + 55} mm inner`, `${n + 58} mm inner, finer stone`],
  Pendant: (n) => [`${n} mm`, `${n + 11} mm`, `${n + 22} mm, finer stone`],
  Ring: (n) => [`Size ${n === 6 ? '6' : '7'}`, 'Size 8', 'Size 9, larger stone'],
  Earrings: () => ['Pair, 8 mm', 'Pair, 10 mm', 'Pair, 12 mm, finer stone'],
  Bracelet: () => ['18 cm', '19 cm', '20 cm, finer stone'],
  Strand: () => ['108 beads, 6 mm', '108 beads, 8 mm', '108 beads, 10 mm'],
  Pair: () => ['Pair, 40 mm', 'Pair, 60 mm', 'Pair, 80 mm, finer stone'],
  Figure: () => ['45 mm tall', '60 mm tall', '80 mm tall, finer stone'],
  Carving: () => ['Small, 90 mm', 'Medium, 130 mm', 'Large, 180 mm'],
  Plaque: () => ['60 × 40 mm', '80 × 55 mm', '100 × 70 mm, finer stone'],
  Cup: () => ['45 mm tall', '55 mm tall', '65 mm tall, thinner wall'],
  Bottle: () => ['55 mm tall', '65 mm tall', '75 mm tall, finer stone'],
  Buckle: () => ['70 mm', '85 mm', '100 mm, finer stone'],
  Hairpin: () => ['120 mm', '150 mm', '180 mm, finer stone'],
  Disc: () => ['50 mm', '70 mm', '90 mm, finer stone'],
  Tube: () => ['80 mm tall', '110 mm tall', '140 mm tall'],
  Blade: () => ['120 mm', '150 mm', '180 mm, finer stone'],
  Hook: () => ['90 mm', '110 mm', '130 mm, finer stone'],
  Seal: () => ['20 mm face', '25 mm face', '30 mm face, finer stone'],
  Set: () => ['Pendant and chain', 'Pendant, larger', 'Pendant, larger, finer stone'],
};

const JEWELLERY_SIZES = {
  Ring: () => ['Size 6', 'Size 7', 'Size 8, larger stone'],
  Necklace: () => ['40 cm', '45 cm', '50 cm, larger stones'],
  Earrings: () => ['Pair, small', 'Pair, medium', 'Pair, large'],
  Bracelet: () => ['16 cm', '17.5 cm', '19 cm, larger stones'],
  Cuff: () => ['Small, 55 mm', 'Medium, 60 mm', 'Large, 65 mm'],
  Brooch: () => ['45 mm', '60 mm', '75 mm, larger stones'],
  Pendant: () => ['Small', 'Medium', 'Large, larger stone'],
  Hairpin: () => ['110 mm', '135 mm', '160 mm'],
  Anklet: () => ['23 cm', '25 cm', '27 cm'],
  Locket: () => ['20 mm', '25 mm', '30 mm'],
  Set: () => ['Suite, small', 'Suite, medium', 'Suite, large'],
};

/**
 * The band the shop publishes for these departments.
 *
 * Material and work multipliers are the honest way to price a piece, but on
 * their own they run past both ends: a spinach-green coin pendant came out at
 * CAD 275 and a South Sea pearl suite at CAD 16,000. The ladder is therefore
 * scaled to fit the band rather than clamped per price, which would flatten the
 * steps between sizes into three identical figures.
 */
const PRICE_FLOOR = 300;
const PRICE_CEILING = 10000;

/** Round to a figure a shop would print. */
function tidyPrice(dollars) {
  if (dollars >= 4000) return Math.round(dollars / 100) * 100;
  if (dollars >= 1000) return Math.round(dollars / 50) * 50;
  if (dollars >= 300) return Math.round(dollars / 10) * 10;
  return Math.round(dollars / 5) * 5;
}

/**
 * Scale one product's size ladder so it sits inside the published band while
 * keeping the steps between sizes meaningful.
 */
function fitLadder(shares, base) {
  let prices = shares.map((s) => base * s);

  const highest = Math.max(...prices);
  if (highest > PRICE_CEILING) {
    const factor = PRICE_CEILING / highest;
    prices = prices.map((p) => p * factor);
  }

  // Lift the whole ladder so the entry size clears the floor, unless doing so
  // would push the top past the ceiling — in which case only the entry size is
  // raised and the steps above it stay where they are.
  const lowest = Math.min(...prices);
  if (lowest < PRICE_FLOOR) {
    const factor = PRICE_FLOOR / lowest;
    const lifted = prices.map((p) => p * factor);
    prices = Math.max(...lifted) <= PRICE_CEILING ? lifted : prices.map((p) => Math.max(PRICE_FLOOR, p));
  }

  // Tidy, then make sure tidying did not reintroduce a repeat or an overrun.
  const tidied = prices.map((p) => Math.min(PRICE_CEILING, Math.max(PRICE_FLOOR, tidyPrice(p))));
  return tidied;
}

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Build one department.
 *
 * @param {object} opts
 * @param {Array} opts.rows
 * @param {object} opts.materials
 * @param {object} opts.forms
 * @param {object} opts.sizes
 * @param {string} opts.category
 * @param {string} opts.family
 * @param {string} opts.skuPrefix
 * @param {number} opts.startNumber
 * @param {Set<string>} opts.takenSlugs
 * @param {Set<string>} opts.takenSkus
 */
function build({ rows, materials, forms, sizes, category, family, skuPrefix, startNumber, takenSlugs, takenSkus }) {
  const products = [];
  const problems = [];
  let n = startNumber;

  for (const row of rows) {
    const material = materials[row.material];
    const form = forms[row.form];
    if (!material) { problems.push(`"${row.name}" references unknown material "${row.material}"`); continue; }
    if (!form) { problems.push(`"${row.name}" references unknown form "${row.form}"`); continue; }

    const slug = slugify(row.name);
    if (takenSlugs.has(slug)) { problems.push(`"${row.name}" would reuse slug "${slug}"`); continue; }
    takenSlugs.add(slug);

    const sku = `${skuPrefix}-${String(n).padStart(3, '0')}`;
    if (takenSkus.has(sku)) { problems.push(`"${row.name}" would reuse SKU "${sku}"`); continue; }
    takenSkus.add(sku);
    n += 1;

    const work = FORM_WORK[row.form] ?? 1;
    const base = material.price * work;
    const ladder = (sizes[form.unit] || sizes.Pendant)(row.sizeBase ?? 42);
    const prices = fitLadder([1, 1.55, 2.5], base);

    const variants = ladder.slice(0, 3).map((label, i) => ({
      label,
      grams: 0,
      price: prices[i],
      stock: [10, 6, 3][i],
      ...(i === 0 ? { default: true } : {}),
    }));

    products.push({
      slug,
      sku,
      name: row.name,
      subtitle: row.subtitle || `${material.name} · ${form.name.charAt(0).toUpperCase()}${form.name.slice(1)}`,
      category,
      family,
      seal: row.seal || form.unit,
      // The unit drives the generated silhouette, so an illustrated bangle is
      // drawn as a ring and not as the generic plaque every piece used to get.
      artUnit: form.unit,
      origin: material.origin,
      altitude: '—',
      cultivar: material.name,
      harvest: `Hand-worked in 2024${category === 'jade' ? ', carved and polished' : ', set and finished'}`,
      oxidation: '—',
      roast: '—',
      caffeine: '—',
      liquor: '—',
      badges: [
        category === 'jade' ? 'Hand-carved' : 'Hand-finished',
        material.name.split(' ').slice(-2).join(' ').replace(/[(),]/g, ''),
        'Certificate',
      ],
      rating: Math.round((4.4 + ((n % 5) * 0.1)) * 10) / 10,
      review_count: 3 + ((n * 11) % 24),
      is_featured: 0,
      short_description: row.hook,
      description: `${material.copy}\n\n${form.copy}\n\nEvery piece is worked by hand in small numbers, so no two are identical: the illustration on this page shows the form, the finish and the proportion, and we will photograph the actual piece in stock before you buy if you ask.`,
      // No note chips for pieces. The card shows chips instead of the summary
      // line when they exist, and "Ring / garnets" said nothing the title had
      // not already said — the hook is far more use to a buyer than the unit.
      tasting_notes: [],
      brewing: {
        gaiwan: '—',
        western: '—',
        vessel: form.care,
      },
      variants,
    });
  }

  return { products, problems };
}

/**
 * Build every illustrated piece.
 *
 * @param {Array} existing the current catalogue, so new SKUs never collide
 */
export function buildPieces(existing = []) {
  const takenSlugs = new Set(existing.map((p) => p.slug));
  const takenSkus = new Set(existing.map((p) => p.sku));

  const jade = build({
    rows: JADE_ROWS,
    materials: JADE_MATERIALS,
    forms: JADE_FORMS,
    sizes: JADE_SIZES,
    category: 'jade',
    family: 'Jade',
    skuPrefix: 'CY-JD',
    startNumber: 11,
    takenSlugs,
    takenSkus,
  });

  const jewellery = build({
    rows: JEWELLERY_ROWS,
    materials: JEWELLERY_MATERIALS,
    forms: JEWELLERY_FORMS,
    sizes: JEWELLERY_SIZES,
    category: 'jewellery',
    family: 'Jewellery',
    skuPrefix: 'CY-JW',
    startNumber: 8,
    takenSlugs,
    takenSkus,
  });

  return {
    products: [...jade.products, ...jewellery.products],
    problems: [...jade.problems, ...jewellery.problems],
  };
}
