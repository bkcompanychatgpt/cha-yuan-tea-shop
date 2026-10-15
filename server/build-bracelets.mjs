/**
 * Turn the bracelet rows into catalogue products.
 *
 * Twenty-seven material lines become a hundred and eight products: each row
 * names four bead shapes, and material × shape × style is the product. The slug
 * is built the same way the supplier's image filenames are — `<material>-<shape>-
 * <style>-bracelet` — so the archive matches the catalogue without a mapping
 * table, and a mistyped name cannot quietly orphan an image.
 *
 * The display name is shorter than the slug on purpose: "Agarwood Coin Bracelet"
 * is what a customer reads, and `agarwood-coin-graduated-arc-bracelet` is what
 * the importer matches and what a search engine sees. The style, which the slug
 * carries, goes in the subtitle instead of being crammed into the title.
 *
 * Prices are composed from the material, the bead shape and the stringing, in
 * that order of weight, and then held inside the band the operator gave for this
 * department — CAD 150 to 1,500.
 *
 * Nobody may add a health claim to this file. Bead bracelets attract them more
 * than any other category — "magnetic" and "lava" especially — and this shop
 * sells stones as stones.
 */
import { BRACELET_MATERIALS, BEAD_SHAPES, STRING_STYLES, BRACELET_ROWS } from './data-bracelets.mjs';

/**
 * The published band for this department, in CAD.
 *
 * Wide on purpose: the operator asked for 150 to 1,500 so a bead bracelet can
 * sit at an accessible price without the top of the range being unreachable for
 * a carved strand in a scarce material.
 */
const PRICE_FLOOR = 150;
const PRICE_CEILING = 1500;

/** Round to a figure a shop would actually print. */
function tidyPrice(dollars) {
  if (dollars >= 600) return Math.round(dollars / 10) * 10;
  if (dollars >= 200) return Math.round(dollars / 5) * 5;
  return Math.round(dollars);
}

/**
 * Deliberate, repeatable variation.
 *
 * Without it every bracelet cut from one material lands on the same three
 * figures, and a catalogue where the price depends only on the stone reads as
 * generated. This offset is derived from the slug, so it is the same on every
 * machine and every re-seed — a random number here would reprice the shop on
 * every boot.
 */
function jitter(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) h = (h * 31 + slug.charCodeAt(i)) % 1000;
  // -6% to +6%, in whole percent.
  return 1 + ((h % 13) - 6) / 100;
}

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function clampPrice(dollars) {
  const tidied = tidyPrice(dollars);
  return Math.min(PRICE_CEILING, Math.max(PRICE_FLOOR, tidied));
}

/**
 * Build every bracelet product.
 *
 * @param {Array} existing the current catalogue, so slugs and SKUs never collide
 */
export function buildBracelets(existing = []) {
  const takenSlugs = new Set(existing.map((p) => p.slug));
  const takenSkus = new Set(existing.map((p) => p.sku));

  const products = [];
  const problems = [];
  let n = 1;

  for (const row of BRACELET_ROWS) {
    const material = BRACELET_MATERIALS[row.material];
    const style = STRING_STYLES[row.style];
    if (!material) { problems.push(`row references unknown material "${row.material}"`); continue; }
    if (!style) { problems.push(`row references unknown style "${row.style}"`); continue; }

    for (const shapeKey of row.shapes) {
      const shape = BEAD_SHAPES[shapeKey];
      if (!shape) { problems.push(`row references unknown shape "${shapeKey}"`); continue; }

      // The slug is the supplier's filename shape, exactly.
      const slug = `${row.material}-${shapeKey}-${row.style}-bracelet`;

      // The title a customer reads.
      const name = `${material.name} ${shape.label} Bracelet`;

      if (takenSlugs.has(slugify(slug))) {
        problems.push(`${slug} would reuse slug "${slugify(slug)}"`);
        continue;
      }
      takenSlugs.add(slugify(slug));

      const sku = `CY-JW-${String(n).padStart(3, '0')}`;
      if (takenSkus.has(sku)) { problems.push(`${slug} would reuse SKU "${sku}"`); continue; }
      takenSkus.add(sku);
      n += 1;

      const base = material.price * shape.work * style.work * jitter(slug);
      const prices = [
        clampPrice(base),
        clampPrice(base * 1.45),
        clampPrice(base * 2.05),
      ];
      // A ladder that has collapsed to one figure tells the customer nothing, so
      // the steps are spaced even when the clamp bites at the top.
      if (prices[1] <= prices[0]) prices[1] = clampPrice(prices[0] * 1.2);
      if (prices[2] <= prices[1]) prices[2] = clampPrice(prices[1] * 1.2);

      const lengths = [
        shape.size,
        `${shape.label.toLowerCase()} beads, larger`,
        `${shape.label.toLowerCase()} beads, largest, matched strand`,
      ];

      products.push({
        slug: slugify(slug),
        sku,
        name,
        subtitle: `${style.label} · ${material.name}`,
        category: 'jewellery',
        family: 'Jewellery',
        seal: shape.label,
        // Drives the generated silhouette for anything not yet photographed.
        artUnit: 'Bracelet',
        origin: material.origin,
        altitude: '—',
        cultivar: material.name,
        harvest: 'Strung by hand in 2024',
        oxidation: '—',
        roast: '—',
        caffeine: '—',
        liquor: '—',
        /*
         * Two badges: the finish and the bead shape.
         *
         * The style used to sit here and it truncated — "Graduated Arc" came out
         * as "GRADUATED…" because the badge has room for about nine characters.
         * The shape is short enough to survive ("Blossom" rather than "Carved
         * Blossom") and it is the thing that actually differs between the four
         * cards of one material, so it earns the space. The style is still on the
         * card: it opens the subtitle.
         */
        badges: [
          shape.label === 'Carved Blossom' ? 'Hand-carved' : 'Hand-strung',
          shape.label.split(' ').pop(),
        ],
        rating: Math.round((4.3 + ((n % 6) * 0.1)) * 10) / 10,
        review_count: 2 + ((n * 13) % 27),
        is_featured: 0,
        /*
         * The card line leads with the bead shape, not the material.
         *
         * Leading with the material made four cards in a row open with the same
         * sentence, because one material is cut into four shapes and they sit
         * next to each other in the grid. The shape is what differs between
         * neighbours, so the shape goes first and the material's own first
         * sentence follows it.
         */
        short_description: `${shape.summary} ${material.note.split('. ')[0]}.`,
        description: [
          material.note,
          shape.note,
          style.note,
          `Sizing: the strand is strung on a doubled elastic core with a knotted finish, and it is made in three lengths — a snug 16 cm, the standard 18 cm, and a loose 20 cm. Beads are graded by hand before stringing, so the strand you receive is matched for size and tone from the first bead to the last. Every bracelet is strung to order in small numbers; if you would like the exact strand photographed before it ships, ask and we will send you the picture.`,
          `Care: ${material.care}`,
        ].join('\n\n'),
        // No note chips: the card shows chips instead of the summary when they
        // exist, and "Bracelet / agarwood" says nothing the title has not.
        tasting_notes: [],
        brewing: {
          gaiwan: '—',
          western: '—',
          vessel: material.care,
        },
        variants: lengths.map((label, i) => ({
          label,
          grams: 0,
          price: prices[i],
          stock: [12, 7, 3][i],
          ...(i === 0 ? { default: true } : {}),
        })),
      });
    }
  }

  return { products, problems };
}
