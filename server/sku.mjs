/**
 * SKU composition, in one place.
 *
 * A SKU has to identify one sellable thing. Two variants of the same product
 * that share a SKU are indistinguishable to a warehouse, to a supplier and to a
 * support conversation, so this module owns the one rule the catalogue, the
 * order pipeline and the audits all use.
 *
 * The earlier rule truncated the variant suffix at six characters, which
 * collided as soon as two labels shared a prefix: the three pearl strand
 * variants "Strand, 9-10 mm", "Strand, 11-12 mm" and "Strand, 12-13 mm, AAA"
 * all reduced to STRAND and therefore to one identical SKU. Nothing caught it
 * because nothing compared the results.
 *
 * The rule now keeps the whole slugified label, capped only by total SKU length,
 * and server/seed.mjs refuses to build a catalogue containing a duplicate.
 */

/** Uppercase alphanumerics only: no spaces, dashes or punctuation. */
export function slugifyLabel(label) {
  return String(label || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

/**
 * Most fulfilment systems, including the carriers and 3PLs a shop like this
 * grows into, hold SKUs comfortably at 40 characters. Staying inside that avoids
 * a truncation surprise at the warehouse end.
 */
export const MAX_SKU_LENGTH = 40;

/**
 * Compose the SKU for one product variant.
 *
 * The product SKU is never truncated — it is the stable, human-quoted part. Only
 * the variant suffix is shortened, and only when the pair would exceed the cap.
 */
export function variantSku(productSku, variantLabel) {
  const base = String(productSku || '').trim();
  const suffix = slugifyLabel(variantLabel);
  if (!suffix) return base;
  const room = MAX_SKU_LENGTH - base.length - 1;
  if (room <= 0) return base;
  return `${base}-${suffix.slice(0, room)}`;
}

/**
 * Find duplicate SKUs among `{ sku, label, productSku }` rows.
 *
 * Returns `{ duplicates: Map<sku, rows[]>, empty: rows[] }` so a caller can
 * report every problem rather than only the first.
 */
export function findSkuProblems(rows) {
  const bySku = new Map();
  const empty = [];
  for (const row of rows) {
    const sku = String(row.sku || '').trim();
    if (!sku) {
      empty.push(row);
      continue;
    }
    if (!bySku.has(sku)) bySku.set(sku, []);
    bySku.get(sku).push(row);
  }
  const duplicates = new Map([...bySku.entries()].filter(([, list]) => list.length > 1));
  return { duplicates, empty };
}
