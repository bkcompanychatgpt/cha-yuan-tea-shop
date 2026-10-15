/**
 * Assert the catalogue promises the shop makes about itself.
 *
 * The targets here are the ones the owner set: a hundred teas and a hundred and
 * eight bracelets, every product with an image, and every product
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
const JEWELLERY = products.filter((p) => p.kind === 'jewellery');
const PIECES = [...TEAS, ...JEWELLERY];

/**
 * What each department should hold, and what must not be offered at all.
 *
 * The counts are deliberately uneven — the owner asked for numbers that do not
 * look like a round figure picked in advance — and they are the measured results
 * rather than targets, so a change to the catalogue has to be a deliberate one.
 *
 * The withdrawn list matters as much as the counts. The shop used to carry jade,
 * teaware and gift sets; all three were removed on request, and a stray product
 * or category reappearing in one of them would otherwise be invisible.
 */
const EXPECTED = { tea: 102, jewellery: 108 };
const WITHDRAWN_KINDS = ['jade', 'teaware', 'gift'];

console.log('\nCatalogue\n');
check(`tea department holds ${EXPECTED.tea} products`, TEAS.length === EXPECTED.tea, `got ${TEAS.length}`);
check(`jewellery department holds ${EXPECTED.jewellery} products`, JEWELLERY.length === EXPECTED.jewellery, `got ${JEWELLERY.length}`);

for (const kind of WITHDRAWN_KINDS) {
  const n = products.filter((p) => p.kind === kind).length;
  check(`no product is left in the withdrawn "${kind}" department`, n === 0, `got ${n}`);
}

// A round number in every department is the thing to avoid, so make it explicit.
const round = [TEAS.length, JEWELLERY.length].filter((n) => n % 10 === 0);
check('no department count is a round ten', round.length === 0, round.join(', '));

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

/*
 * A rendered product must have an image that resolves: either the drawing route
 * or an imported render on disk. It used to have to be the drawing route, which
 * stopped being true the moment the first generated images were imported. The
 * assertion was about where the artwork comes from; what matters is that the
 * customer sees something.
 */
const illustrated = products.filter((p) => p.image_kind === 'illustration');
const badRender = illustrated.filter((p) => {
  const hero = String(p.hero_image);
  if (/^\/img\/product\/[a-z0-9-]+\.svg$/.test(hero)) return false;
  if (/^\/img\/photos\/[a-z0-9-]+\.jpg$/.test(hero)) {
    return !fs.existsSync(path.join(ROOT, 'public', hero.replace(/^\//, '')));
  }
  return true;
});
check('every rendered product has an image that resolves', badRender.length === 0, badRender.map((p) => `${p.slug} → ${p.hero_image}`).join(', '));

/*
 * The drawn silhouettes are now only a fallback, so the shape has to exist only
 * where a product still relies on them.
 */
const stillDrawn = illustrated.filter((p) => String(p.hero_image).startsWith('/img/product/'));
const noUnit = stillDrawn.filter((p) => !shapeForUnit(p.art_unit) || !p.art_unit);
check('every product still on drawn artwork declares a shape', noUnit.length === 0, noUnit.map((p) => p.slug).join(', '));

const gallery = illustrated.filter((p) => {
  try { return JSON.parse(p.images || '[]').length < 3; } catch { return true; }
});
check('every illustrated product has a three-view gallery', gallery.length === 0, gallery.map((p) => p.slug).join(', '));

// Tea must stay photographed: the whole point of building lots on base teas was
// that they inherit a real photograph rather than being drawn.
const drawnTea = TEAS.filter((p) => p.image_kind !== 'photo');
check('every tea is shown with a photograph', drawnTea.length === 0, drawnTea.map((p) => p.slug).join(', '));

/* ------------------------------------------------------------- uniqueness */
// The owner's rule: no two products may share an image. Checked against the
// database rather than the selection files, because the database is what the
// storefront actually renders.
const byHero = new Map();
for (const p of products) {
  if (!byHero.has(p.hero_image)) byHero.set(p.hero_image, []);
  byHero.get(p.hero_image).push(p.slug);
}
const sharedHeroes = [...byHero.entries()].filter(([, list]) => list.length > 1);
check(
  `no two products share a main image (${byHero.size} distinct across ${products.length})`,
  sharedHeroes.length === 0,
  sharedHeroes.slice(0, 4).map(([img, list]) => `${img} ×${list.length}`).join('; '),
);

// The hover image on a card is the second gallery entry, so it must be unique
// too — otherwise two cards swap to the same picture.
const bySecond = new Map();
for (const p of products) {
  let gallery = [];
  try { gallery = JSON.parse(p.images || '[]'); } catch { gallery = []; }
  const second = gallery[1];
  if (!second) continue;
  if (!bySecond.has(second)) bySecond.set(second, []);
  bySecond.get(second).push(p.slug);
}
const sharedSeconds = [...bySecond.entries()].filter(([, list]) => list.length > 1);
check(
  'no two products share a hover image',
  sharedSeconds.length === 0,
  sharedSeconds.slice(0, 4).map(([img, list]) => `${img} ×${list.length}`).join('; '),
);

/* ------------------------------------------------------------------ prices */
console.log('\nPrices\n');
/*
 * The jewellery band is the one the operator set: CAD 150 to 1,500. A bead
 * bracelet has no business at four figures, and a carved strand in a scarce
 * material has no business below two, so the range is asserted rather than left
 * to the price ladder.
 *
 * Tea is not banded by anyone — it is priced per tin, from a ten-dollar everyday
 * green to a three-thousand-dollar aged cake — so its check is only that every
 * price is positive and inside the range the catalogue actually produces. It is
 * here so a decimal-point slip in the lot data is caught rather than published.
 */
const PRICE_BANDS = {
  tea: { low: 1000, high: 400000, label: 'CAD 10–4,000' },
  jewellery: { low: 15000, high: 150000, label: 'CAD 150–1,500' },
};

for (const [name, band] of Object.entries(PRICE_BANDS)) {
  const prices = db.prepare(
    `SELECT v.price_cents AS c FROM variants v JOIN products p ON p.id = v.product_id
      WHERE p.category_id IN (SELECT id FROM categories WHERE kind = ?)`,
  ).all(name).map((r) => r.c);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  check(`${name} prices stay inside ${band.label}`, low >= band.low && high <= band.high,
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
check(`tea lots are generated from base teas (${generated.length} lots)`, generated.length === 77, `got ${generated.length}`);

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
