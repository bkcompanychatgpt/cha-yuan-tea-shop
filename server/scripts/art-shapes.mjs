/** How the generated artwork will draw each illustrated product. */
import { getDb } from '../db.mjs';
import { shapeForUnit } from '../imagery.mjs';

const db = getDb();

const rows = db.prepare(
  `SELECT art_unit, COUNT(*) AS n
     FROM products
    WHERE image_kind = 'illustration'
    GROUP BY art_unit
    ORDER BY n DESC`,
).all();

console.log('Illustrated products by unit and resulting silhouette\n');
let total = 0;
for (const r of rows) {
  total += r.n;
  console.log(`  ${String(r.art_unit || '(none)').padEnd(14)} ${String(r.n).padStart(3)}  -> ${shapeForUnit(r.art_unit)}`);
}
console.log(`\n  ${total} illustrated products`);

const vague = rows.filter((r) => !r.art_unit);
if (vague.length) console.log(`  WARNING: ${vague[0].n} illustrated product(s) have no art_unit and will draw a plaque`);
