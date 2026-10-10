/** List the existing catalogue by category, to build sub-lots against. */
import { PRODUCTS, CATEGORIES } from '../catalog-data.mjs';

const kindOf = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.kind]));

let current = '';
for (const p of PRODUCTS) {
  const kind = kindOf[p.category] || '?';
  if (kind !== 'tea') continue;
  if (p.category !== current) {
    current = p.category;
    console.log(`\n${current}`);
  }
  const prices = (p.variants || []).map((v) => v.price);
  console.log(
    `  ${String(p.sku).padEnd(11)} ${String(p.slug).padEnd(32)} ${String(p.seal).padEnd(9)} ` +
    `${String(p.family).padEnd(13)} ${String(p.harvest).slice(0, 34).padEnd(36)} ` +
    `${prices[0]}-${prices[prices.length - 1]}`,
  );
}

const teaCats = CATEGORIES.filter((c) => c.kind === 'tea');
console.log('\ntea categories:', teaCats.map((c) => c.slug).join(', '));
console.log('tea products:', PRODUCTS.filter((p) => kindOf[p.category] === 'tea').length);
