/**
 * Photograph coverage summary.
 *
 * How much of the catalogue actually has photography and which slots are still
 * using generated artwork. Faster to read than the full gap audit when you only
 * want the numbers.
 *
 *   node server/scripts/coverage.mjs
 */
import { get, all } from '../db.mjs';

const pct = (n, total) => (total ? `${Math.round((n / total) * 100)}%` : '—');

const productsTotal = get('SELECT COUNT(*) AS n FROM products')?.n ?? 0;
const productsWith = get("SELECT COUNT(*) AS n FROM products WHERE hero_image LIKE '/img/photos/%'")?.n ?? 0;
const categoriesTotal = get('SELECT COUNT(*) AS n FROM categories')?.n ?? 0;
const categoriesWith = get("SELECT COUNT(*) AS n FROM categories WHERE hero_image LIKE '/img/photos/%'")?.n ?? 0;
const variants = get('SELECT COUNT(*) AS n FROM variants')?.n ?? 0;

console.log('\nPhotograph coverage\n');
console.log(`  products    ${String(productsWith).padStart(3)}/${productsTotal}   ${pct(productsWith, productsTotal)}`);
console.log(`  categories  ${String(categoriesWith).padStart(3)}/${categoriesTotal}   ${pct(categoriesWith, categoriesTotal)}`);
console.log(`  variants    ${String(variants).padStart(3)} priced options across ${productsTotal} products`);

const without = all(
  "SELECT slug, hero_image FROM products WHERE hero_image NOT LIKE '/img/photos/%' ORDER BY slug",
);
if (without.length) {
  console.log(`\n  Using generated artwork (${without.length}):`);
  for (const row of without) console.log(`    ${row.slug.padEnd(26)} ${row.hero_image}`);
} else {
  console.log('\n  Every product has photography.');
}
console.log('');
