/**
 * Preview the generated tea lots without touching catalog-data.mjs, so the
 * output can be read and judged before it is spliced into the catalogue.
 *
 *   node server/scripts/preview-lots.mjs
 */
import { PRODUCTS, CATEGORIES } from '../catalog-data.mjs';
import { buildTeaLots } from '../build-lots.mjs';

const kindOf = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.kind]));
const existingTea = PRODUCTS.filter((p) => kindOf[p.category] === 'tea');

const { products, problems } = buildTeaLots(PRODUCTS);

console.log(`Generated ${products.length} tea lots from ${existingTea.length} base teas\n`);

if (problems.length) {
  console.log('PROBLEMS');
  for (const p of problems) console.log(`  - ${p}`);
  console.log('');
}

const byCategory = {};
for (const p of [...existingTea, ...products]) {
  byCategory[p.category] = (byCategory[p.category] || 0) + 1;
}
const targets = {
  'green-tea': 14, 'white-tea': 12, 'oolong-tea': 12, 'dan-cong': 10,
  'rock-oolong': 12, 'black-tea': 13, 'pu-erh': 13, 'floral-blends': 14,
};

console.log('  category'.padEnd(20) + 'existing  new  total  target');
let grand = 0;
for (const slug of Object.keys(targets)) {
  const total = byCategory[slug] || 0;
  grand += total;
  const mark = total >= targets[slug] ? '  ok' : '  SHORT';
  console.log(
    `  ${slug.padEnd(18)} ${String((byCategory[slug] || 0) - (products.filter((p) => p.category === slug).length)).padStart(8)} ` +
    `${String(products.filter((p) => p.category === slug).length).padStart(4)} ${String(total).padStart(6)} ${String(targets[slug]).padStart(7)}${mark}`,
  );
}
console.log(`  ${''.padEnd(18)} ${''.padStart(8)} ${''.padStart(4)} ${String(grand).padStart(6)}      100`);

console.log('\nSample lots\n');
for (const p of products.slice(0, 4)) {
  console.log(`  ${p.sku}  ${p.name}`);
  console.log(`    slug      ${p.slug}`);
  console.log(`    subtitle  ${p.subtitle}`);
  console.log(`    harvest   ${p.harvest}`);
  console.log(`    seal      ${p.seal}    badges ${p.badges.join(' / ')}`);
  console.log(`    prices    ${p.variants.map((v) => `${v.label} CAD ${v.price}`).join('  |  ')}`);
  console.log(`    hook      ${p.short_description}`);
  console.log('');
}

// Every generated lot must carry a slug and SKU nobody else has.
const allSlugs = new Set();
const allSkus = new Set();
let dupes = 0;
for (const p of [...PRODUCTS, ...products]) {
  if (allSlugs.has(p.slug)) { console.log(`  DUPLICATE SLUG ${p.slug}`); dupes += 1; }
  if (allSkus.has(p.sku)) { console.log(`  DUPLICATE SKU  ${p.sku}`); dupes += 1; }
  allSlugs.add(p.slug);
  allSkus.add(p.sku);
}
console.log(dupes ? `\n  ${dupes} duplicate(s)` : '\n  no duplicate slugs or SKUs');
if (problems.length || dupes) process.exitCode = 1;
