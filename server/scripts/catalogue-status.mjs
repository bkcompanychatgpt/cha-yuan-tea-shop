/**
 * How many products does each category hold, and how are their images sourced?
 *
 * The catalogue targets differ by department: tea grows to 100 as real sub-lots,
 * while jade and jewellery stand at 50 each with house illustrations where no
 * photograph exists. This reports the gap so the work is measured rather than
 * guessed.
 *
 *   node server/scripts/catalogue-status.mjs
 */
import { getDb } from '../db.mjs';

const TARGETS = {
  'green-tea': 100, 'white-tea': 0, 'oolong-tea': 0, 'phoenix-dancong': 0,
  'wuyi-rock': 0, 'black-tea': 0, 'puerh': 0, 'floral-scented': 0,
  jade: 50, jewellery: 50,
};

const db = getDb();

const rows = db.prepare(
  `SELECT c.slug AS category_slug, c.name AS category_name, c.kind,
          COUNT(p.id) AS products,
          SUM(CASE WHEN p.hero_image LIKE '/img/photos/%' THEN 1 ELSE 0 END) AS photographed,
          SUM(CASE WHEN p.hero_image NOT LIKE '/img/photos/%' THEN 1 ELSE 0 END) AS illustrated
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
    GROUP BY c.id
    ORDER BY c.sort_order, c.id`,
).all();

console.log('Catalogue by category\n');
console.log(`  ${'category'.padEnd(20)} ${'kind'.padEnd(11)} ${'n'.padStart(4)} ${'photo'.padStart(6)} ${'illus'.padStart(6)}  target`);

let teaTotal = 0;
let jadeTotal = 0;
let jewelleryTotal = 0;
let totalProducts = 0;
let totalPhoto = 0;

for (const r of rows) {
  const target = TARGETS[r.category_slug];
  console.log(
    `  ${r.category_slug.padEnd(20)} ${String(r.kind).padEnd(11)} ${String(r.products).padStart(4)} ` +
    `${String(r.photographed).padStart(6)} ${String(r.illustrated).padStart(6)}  ${target ? String(target).padStart(5) : '    —'}`,
  );
  totalProducts += r.products;
  totalPhoto += r.photographed;
  if (r.kind === 'tea' || r.kind === 'teaware' || r.kind === 'gift') teaTotal += r.products;
  if (r.kind === 'jade') jadeTotal += r.products;
  if (r.kind === 'jewellery') jewelleryTotal += r.products;
}

console.log(`\n  tea-family products   ${teaTotal}  (target 100)`);
console.log(`  jade products        ${jadeTotal}  (target 50)`);
console.log(`  jewellery products   ${jewelleryTotal}  (target 50)`);
console.log(`  all products         ${totalProducts}`);
console.log(`  with a real photo    ${totalPhoto}`);
console.log(`  illustrated          ${totalProducts - totalPhoto}`);
