/**
 * Point a preview script at BASE_PRODUCTS.
 *
 * The catalogue now exports two things: BASE_PRODUCTS (hand-written) and
 * PRODUCTS (base plus everything generated from it). Tooling that generates lots
 * or pieces must start from the base list, or it tries to generate entries that
 * already exist and reports a wall of phantom slug collisions.
 */
import fs from 'node:fs';

const files = ['server/scripts/preview-pieces.mjs', 'server/scripts/preview-lots.mjs', 'server/scripts/check-pools.mjs'];
for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  s = s.replace(/import \{ PRODUCTS, CATEGORIES \}/, 'import { BASE_PRODUCTS, CATEGORIES }');
  s = s.replace(/import \{ PRODUCTS \}/, 'import { BASE_PRODUCTS }');
  s = s.split('PRODUCTS').join('BASE_PRODUCTS').replace(/BASE_BASE_PRODUCTS/g, 'BASE_PRODUCTS');
  if (s !== before) {
    fs.writeFileSync(file, s, 'utf8');
    console.log(`rewritten ${file}`);
  } else {
    console.log(`unchanged ${file}`);
  }
}
