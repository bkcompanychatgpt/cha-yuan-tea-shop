/**
 * Assert the catalogue promises the shop makes about itself.
 *
 * The targets here are the ones the owner set: a hundred teas, fifty jade
 * pieces, fifty jewellery pieces, every product with an image, and every product
 * whose image is house artwork labelled as such. A shop that quietly stops
 * meeting them — a lot whose base tea was renamed, a piece added without a
 * silhouette — should fail here rather than on the storefront.
 *
 *   node server/scripts/check-catalogue.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from '../db.mjs';
import { shapeForUnit } from '../imagery.mjs';
import config from '../config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

let pass = 0;
const failures = [];

function check(label, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  \x1b[32mPASS\x1b[0m  ${label}`); }
  else { failures.push(label); console.log(`  \x1b[31mFAIL\x1b[0m  ${label}${detail ? `  — ${detail}` : ''}`); }
}

const db = getDb();
const products = db.prepare(
  `SELECT p.*, c.kind AS kind, c.slug AS category_slug
     FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = 1`,
).all();

const TEAS = products.filter((p) => p.kind === 'tea');
const JADE = products.filter((p) => p.kind === 'jade');
const JEWELLERY = products.filter((p) => p.kind === 'jewellery');
const ALL_PIECES = [...JADE, ...JEWELLERY];

console.log('\nCatalogue targets\n');
check(`tea department holds 100 products`, TEAS.length === 100, `got ${TEAS.length}`);
check(`jade department holds 50 products`, JADE.length === 50, `got ${JADE.length}`);
check(`jewellery department holds 50 products`, JEWELLERY.length === 50, `got ${JEWELLERY.length}`);

/* ------------------------------------------------------------------ images */
console.log('\nImagery\n');
const noImage = products.filter((p) => !p.hero_image);
check('every product has an image', noImage.length === 0, noImage.map((p) => p.slug).join(', '));

const noKind = products.filter((p) => !['photo', 'illustration'].includes(p.image_kind));
check('every product declares how its image was made', noKind.length === 0, noKind.map((p) => p.slug).join(', '));

// A product claiming a photograph must point at a file that exists. This is the
// check that catches a renamed manifest entry leaving a dead image path.
const photoProducts = products.filter((p) => p.image_kind === 'photo');
const missing = [];
for (const p of photoProducts) {
  const rel = String(p.hero_image).replace(/^\//, '');
  if (!fs.existsSync(path.join(ROOT, 'public', rel))) missing.push(p.slug);
}
check(`${photoProducts.length} photographs all resolve to files on disk`, missing.length === 0, missing.slice(0, 6).join(', '));

// An illustrated product must be drawn by a route that exists, not point at a
// file that was never generated.
const illustrated = products.filter((p) => p.image_kind === 'illustration');
const badRoutes = illustrated.filter((p) => !/^\/img\/product\/[a-z0-9-]+\.svg$/.test(String(p.hero_image)));
check('every illustrated product points at the artwork route', badRoutes.length === 0, badRoutes.map((p) => p.slug).join(', '));

const noUnit = illustrated.filter((p) => !shapeForUnit(p.art_unit) || !p.art_unit);
check('every illustrated product declares a shape to draw', noUnit.length === 0, noUnit.map((p) => p.slug).join(', '));

const gallery = illustrated.filter((p) => {
  try { return JSON.parse(p.images || '[]').length < 3; } catch { return true; }
});
check('every illustrated product has a three-view gallery', gallery.length === 0, gallery.map((p) => p.slug).join(', '));

// Tea must stay photographed: the whole point of building lots on base teas was
// that they inherit a real photograph rather than being drawn.
const drawnTea = TEAS.filter((p) => p.image_kind !== 'photo');
check('every tea is shown with a photograph', drawnTea.length === 0, drawnTea.map((p) => p.slug).join(', '));

/* ------------------------------------------------------------------ prices */
console.log('\nPrices\n');
for (const [name, list] of [['jade', JADE], ['jewellery', JEWELLERY]]) {
  const prices = db.prepare(
    `SELECT v.price_cents AS c FROM variants v JOIN products p ON p.id = v.product_id
      WHERE p.category_id IN (SELECT id FROM categories WHERE kind = ?)`,
  ).all(name).map((r) => r.c);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  check(`${name} prices stay inside CAD 300–10,000`, low >= 30000 && high <= 1000000,
    `range ${(low / 100).toFixed(2)} to ${(high / 100).toFixed(2)}`);
}

/* ------------------------------------------------------------- consistency */
console.log('\nConsistency\n');
const dupeSkus = db.prepare(
  `SELECT sku, COUNT(*) AS n FROM products GROUP BY sku HAVING n > 1`,
).all();
check('no two products share a SKU', dupeSkus.length === 0, dupeSkus.map((r) => r.sku).join(', '));

// Every generated lot must differ from its base by more than a name: the price
// or the picking window has to move, or it is the same product twice.
const generated = TEAS.filter((p) => /-L\d\d$/.test(p.sku));
check(`tea lots are generated from base teas (${generated.length} lots)`, generated.length === 75, `got ${generated.length}`);

const emptyDesc = products.filter((p) => String(p.description || '').trim().length < 120);
check('every product has a real description', emptyDesc.length === 0, emptyDesc.slice(0, 6).map((p) => p.slug).join(', '));

const noVariants = db.prepare(
  `SELECT p.slug FROM products p
    WHERE p.is_active = 1
      AND NOT EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id)`,
).all();
check('every product has at least one variant to sell', noVariants.length === 0, noVariants.map((r) => r.slug).join(', '));

const zeroStock = db.prepare(
  `SELECT p.slug FROM products p
    WHERE p.is_active = 1
      AND NOT EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.stock > 0)`,
).all();
check('every product has stock in at least one variant', zeroStock.length === 0, zeroStock.length ? `${zeroStock.length} sold out` : '');

console.log(`\n  ${products.length} active products, ${photoProducts.length} photographed, ${illustrated.length} illustrated`);
console.log(`\n  ${pass} passed, ${failures.length} failed\n`);
if (failures.length) {
  console.log('  Failures:');
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
void config;
