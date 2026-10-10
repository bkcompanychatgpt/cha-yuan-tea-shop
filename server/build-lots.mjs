/**
 * Turn the tea lot rows into catalogue products.
 *
 * A generated lot inherits everything that is true of the base tea — origin,
 * cultivar, oxidation, chop word, photograph — and overrides only what the lot
 * genuinely changes: name, subtitle, harvest window, price and the copy that
 * explains the grade. That way a "Yuqian" Longjing is the same Zhejiang tea with
 * the same photograph and a truthful description of a later picking window,
 * rather than a new invention wearing a familiar name.
 */
import { LOT_STYLES, TEA_LOT_ROWS } from './data-lots.mjs';

/** Weight ladders by department, so lots are not all sold in the same sizes. */
const TEA_SIZES = [
  { label: '25 g tin', grams: 25, share: 1 },
  { label: '50 g tin', grams: 50, share: 1.86 },
  { label: '100 g tin', grams: 100, share: 3.5 },
];
const BIG_TEA_SIZES = [
  { label: '50 g tin', grams: 50, share: 1 },
  { label: '100 g tin', grams: 100, share: 1.88 },
  { label: '250 g pouch', grams: 250, share: 4.4 },
];
const CAKE_SIZES = [
  { label: '100 g mini cake', grams: 100, share: 1 },
  { label: '357 g cake', grams: 357, share: 3.3 },
  { label: '357 g cake, tong of 7', grams: 2499, share: 21 },
];
const CAKE_ONLY = [
  { label: '357 g cake', grams: 357, share: 1 },
  { label: '357 g cake, tong of 7', grams: 2499, share: 6.6 },
];
const FLOWER_SIZES = [
  { label: '40 g pouch', grams: 40, share: 1 },
  { label: '100 g pouch', grams: 100, share: 2.3 },
];

/** Which ladder a lot is sold in. */
function sizesFor(base, style) {
  if (base.category === 'pu-erh') return style.label === 'Library' ? CAKE_ONLY : CAKE_SIZES;
  if (base.category === 'floral-blends') return base.name.match(/Chrysanthemum|Tai Ju/) ? FLOWER_SIZES : TEA_SIZES;
  if (base.category === 'white-tea') return BIG_TEA_SIZES;
  return TEA_SIZES;
}

/** Round a price to a figure a shop would actually print. */
function tidyPrice(cents) {
  const dollars = cents / 100;
  if (dollars >= 400) return Math.round(dollars / 10) * 10;
  if (dollars >= 120) return Math.round(dollars / 5) * 5;
  if (dollars >= 40) return Math.round(dollars);
  return Math.round(dollars * 2) / 2;
}

/**
 * Badges that describe the base tea's picking grade or age.
 *
 * They must not be inherited: a Yuqian lot carrying the base tea's
 * "Pre-Qingming" badge would contradict its own name on the product card, which
 * is worse than having no badge at all.
 */
const GRADE_BADGE = /qingming|yuqian|guyu|first flush|spring pick|aged|vintage|library|autumn|late spring/i;

function badgesFor(base, style) {
  const inherited = (base.badges || []).filter((b) => !GRADE_BADGE.test(b));
  return [style.badge, ...inherited].slice(0, 3);
}

/**
 * Slug from the full product name, so two lots of one tea cannot collide.
 *
 * Exported because the photo pools have to key their assignments by the same
 * slug the catalogue will use. Recomputing it separately is how the first
 * attempt at this silently assigned seventy-seven lots to the single key
 * `undefined`.
 */
export function lotSlug(row) {
  return String(row.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** A vintage year, when the lot row names one. */
function vintageLine(row, style) {
  if (!row.vintage) return style.harvest;
  const age = new Date().getUTCFullYear() - row.vintage;
  return `${row.vintage} pick, stored dry since — ${age} years in the leaf`;
}

/**
 * Build every tea lot. Returns products in the same shape as catalog-data.mjs.
 *
 * @param {Array} products the existing catalogue, used to resolve `base`
 * @returns {{products: Array, problems: string[]}}
 */
export function buildTeaLots(products) {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const problems = [];
  const out = [];
  const seenSlugs = new Set(products.map((p) => p.slug));
  const seenSkus = new Set(products.map((p) => p.sku));
  const counters = {};

  for (const row of TEA_LOT_ROWS) {
    const base = bySlug.get(row.base);
    if (!base) {
      problems.push(`lot "${row.name}" references unknown base tea "${row.base}"`);
      continue;
    }
    const style = LOT_STYLES[row.lot];
    if (!style) {
      problems.push(`lot "${row.name}" references unknown style "${row.lot}"`);
      continue;
    }

    const slug = lotSlug(row);
    if (seenSlugs.has(slug)) {
      problems.push(`lot "${row.name}" would reuse slug "${slug}"`);
      continue;
    }
    seenSlugs.add(slug);

    // SKU: keep the base tea's family prefix and number lots within it.
    const prefix = String(base.sku).replace(/-\d+$/, '');
    counters[prefix] = (counters[prefix] || 0) + 1;
    const sku = `${prefix}-L${String(counters[prefix]).padStart(2, '0')}`;
    if (seenSkus.has(sku)) {
      problems.push(`lot "${row.name}" would reuse SKU "${sku}"`);
      continue;
    }
    seenSkus.add(sku);

    const sizes = sizesFor(base, style);
    const basePrice = base.variants?.[0]?.price ?? 40;
    const shelfPrice = tidyPrice(basePrice * style.mult * 100);
    const variants = sizes.map((size, i) => ({
      label: size.label,
      grams: size.grams,
      price: tidyPrice(shelfPrice * size.share * 100),
      stock: [18, 11, 5][i] ?? 6,
      ...(i === 0 ? { default: true } : {}),
    }));

    const seal = row.seal || style.seal || base.seal;
    const subtitle = row.subtitle || style.subtitle;

    // Not every base tea records an altitude (pu-erh and flowers do not), so the
    // provenance sentence is assembled from the parts that actually exist rather
    // than printing a dash into the middle of it.
    const provenance = [
      `${base.name} itself comes from ${base.origin}`,
      base.cultivar && base.cultivar !== '—' ? `grown as ${String(base.cultivar).toLowerCase()}` : '',
      base.altitude && base.altitude !== '—' ? `at ${base.altitude}` : '',
    ].filter(Boolean).join(', ');

    out.push({
      slug,
      sku,
      name: row.name,
      subtitle,
      category: base.category,
      family: base.family,
      seal,
      origin: base.origin,
      altitude: base.altitude,
      cultivar: base.cultivar,
      harvest: vintageLine(row, style),
      oxidation: base.oxidation,
      roast: style.label === 'Charcoal-baked' || row.lot === 'charcoal' ? 'Baked over hardwood charcoal' : base.roast,
      caffeine: base.caffeine,
      liquor: base.liquor,
      badges: badgesFor(base, style),
      // Which base tea's photograph this lot should inherit. A photograph of
      // Longjing is a photograph of Longjing whichever picking grade is in the
      // tin, so the seed reuses the base tea's photograph rather than drawing an
      // illustration for a tea it has pictures of. The product page says plainly
      // that the lots of one tea share that tea's photography.
      photoBase: row.base,
      rating: Math.round((4.4 + ((counters[prefix] % 5) * 0.1)) * 10) / 10,
      review_count: 4 + ((counters[prefix] * 7) % 26),
      is_featured: 0,
      short_description: style.hook,
      description: `${style.copy}\n\n${provenance}. This lot is that same tea, handled and graded as described above — the leaf, the mountain and the maker do not change, only the picking window and the price.`,
      tasting_notes: style.notes,
      brewing: base.brewing,
      variants,
    });
  }

  return { products: out, problems };
}
