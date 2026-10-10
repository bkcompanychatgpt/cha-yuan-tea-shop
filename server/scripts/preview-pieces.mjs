/**
 * Preview the generated jade and jewellery pieces without touching the
 * catalogue, so the copy and the price spread can be judged first.
 *
 *   node server/scripts/preview-pieces.mjs
 */
import { BASE_PRODUCTS, CATEGORIES } from '../catalog-data.mjs';
import { buildTeaLots } from '../build-lots.mjs';
import { buildPieces } from '../build-pieces.mjs';

const kindOf = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.kind]));
const existingTea = BASE_PRODUCTS.filter((p) => kindOf[p.category] === 'tea');
const existingJade = BASE_PRODUCTS.filter((p) => p.category === 'jade');
const existingJewellery = BASE_PRODUCTS.filter((p) => p.category === 'jewellery');

const lots = buildTeaLots(BASE_PRODUCTS);
const pieces = buildPieces([...BASE_PRODUCTS, ...lots.products]);

const problems = [...lots.problems, ...pieces.problems];
if (problems.length) {
  console.log('PROBLEMS');
  for (const p of problems) console.log(`  - ${p}`);
  console.log('');
}

const jade = pieces.products.filter((p) => p.category === 'jade');
const jewellery = pieces.products.filter((p) => p.category === 'jewellery');

const rows = [
  ['tea', existingTea.length, lots.products.length, 100],
  ['jade', existingJade.length, jade.length, 50],
  ['jewellery', existingJewellery.length, jewellery.length, 50],
];

console.log('  department   existing   new   total   target');
for (const [name, was, added, target] of rows) {
  const total = was + added;
  console.log(
    `  ${name.padEnd(12)} ${String(was).padStart(8)} ${String(added).padStart(5)} ${String(total).padStart(7)} ` +
    `${String(target).padStart(8)}${total >= target ? '   ok' : '   SHORT'}`,
  );
}

/* --------------------------------------------------------------- price band */
for (const [name, list] of [['jade', [...existingJade, ...jade]], ['jewellery', [...existingJewellery, ...jewellery]]]) {
  const prices = list.flatMap((p) => p.variants.map((v) => v.price));
  prices.sort((a, b) => a - b);
  const low = prices[0];
  const high = prices[prices.length - 1];
  const over = prices.filter((p) => p > 10000).length;
  console.log(`\n  ${name}: ${prices.length} prices, CAD ${low} to ${high}${over ? `  ${over} ABOVE 10000` : ''}`);
  if (low < 300) console.log(`    WARNING: ${prices.filter((p) => p < 300).length} price(s) below the CAD 300 floor`);
}

/* ------------------------------------------------------------- sample rows */
console.log('\nJade samples\n');
for (const p of jade.slice(0, 3)) {
  console.log(`  ${p.sku}  ${p.name}`);
  console.log(`    ${p.subtitle}`);
  console.log(`    prices  ${p.variants.map((v) => `${v.label} CAD ${v.price}`).join('  |  ')}`);
  console.log(`    hook    ${p.short_description}`);
  console.log(`    care    ${p.brewing.vessel}`);
  console.log('');
}

console.log('Jewellery samples\n');
for (const p of jewellery.slice(0, 3)) {
  console.log(`  ${p.sku}  ${p.name}`);
  console.log(`    ${p.subtitle}`);
  console.log(`    prices  ${p.variants.map((v) => `${v.label} CAD ${v.price}`).join('  |  ')}`);
  console.log(`    hook    ${p.short_description}`);
  console.log('');
}

/* ------------------------------------------------------------- uniqueness */
const seen = { slug: new Set(), sku: new Set() };
let dupes = 0;
for (const p of [...BASE_PRODUCTS, ...lots.products, ...pieces.products]) {
  if (seen.slug.has(p.slug)) { console.log(`  DUPLICATE SLUG ${p.slug}`); dupes += 1; }
  if (seen.sku.has(p.sku)) { console.log(`  DUPLICATE SKU  ${p.sku}`); dupes += 1; }
  seen.slug.add(p.slug);
  seen.sku.add(p.sku);
}
console.log(dupes ? `\n  ${dupes} duplicate(s)` : '\n  no duplicate slugs or SKUs');
if (problems.length || dupes) process.exitCode = 1;
