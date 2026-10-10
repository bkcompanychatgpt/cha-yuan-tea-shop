/**
 * Do variant SKUs actually distinguish variants?
 *
 * A SKU that repeats across variants of the same product is a fulfilment
 * defect: the warehouse cannot tell a 9-10mm strand from a 12-13mm one, and an
 * order line becomes ambiguous. This prints the composed SKU for each variant
 * and reports collisions, both within a product and across the whole catalogue.
 *
 *   node server/scripts/check-skus.mjs
 */
import { getDb } from '../db.mjs';
import { variantSku, findSkuProblems, MAX_SKU_LENGTH } from '../sku.mjs';

const db = getDb();

const rows = db.prepare(
  `SELECT p.id AS product_id, p.sku AS product_sku, p.name AS product_name,
          c.kind AS category_kind,
          v.id AS variant_id, v.label AS variant_label, v.is_default
     FROM variants v
     JOIN products p ON p.id = v.product_id
     JOIN categories c ON c.id = p.category_id
    ORDER BY p.id, v.sort_order, v.id`,
).all();

/** The composed SKU is what a fulfilment system would actually see. */
const compose = (row) => variantSku(row.product_sku, row.variant_label);

const byProduct = new Map();
for (const row of rows) {
  if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, []);
  byProduct.get(row.product_id).push(row);
}

let tooLong = 0;
let intraProduct = 0;
const globalSkus = new Map();

console.log(`Variant SKU audit — ${rows.length} variants across ${byProduct.size} products\n`);

for (const [productId, variants] of byProduct) {
  const skus = variants.map(compose);
  const seen = new Map();
  for (const sku of skus) seen.set(sku, (seen.get(sku) || 0) + 1);
  const dupes = [...seen.entries()].filter(([, n]) => n > 1);
  for (const sku of skus) globalSkus.set(sku, (globalSkus.get(sku) || 0) + 1);

  const longOnes = variants.filter((v) => compose(v).length > MAX_SKU_LENGTH);
  tooLong += longOnes.length;

  if (dupes.length) {
    intraProduct += dupes.length;
    console.log(`  \x1b[31mFAIL\x1b[0m  product #${productId} ${variants[0].product_name} (${variants[0].category_kind})`);
    console.log(`        ${variants.length} variants, ${dupes.length} colliding SKU(s):`);
    for (const [sku, n] of dupes) {
      console.log(`        "${sku}" used by ${n} variants:`);
      for (const v of variants.filter((x) => compose(x) === sku)) {
        console.log(`          - variant #${v.variant_id}  label=${JSON.stringify(v.variant_label)}`);
      }
    }
  }
}

const globalDupes = [...globalSkus.entries()].filter(([, n]) => n > 1);

console.log('\n  summary');
console.log(`    products with colliding variant SKUs   ${intraProduct === 0 ? '0' : intraProduct}`);
console.log(`    SKUs shared across different products  ${globalDupes.length}`);
console.log(`    SKUs longer than ${MAX_SKU_LENGTH} characters        ${tooLong}`);

// The default variant of each product must itself be unique.
const defaults = rows.filter((r) => Number(r.is_default) === 1);
console.log(`    products marked default                ${defaults.length} / ${byProduct.size}`);

if (intraProduct || globalDupes.length || tooLong || defaults.length !== byProduct.size) {
  process.exitCode = 1;
  console.log('\n  A repeat here means two different things you sell share one code.');
}
