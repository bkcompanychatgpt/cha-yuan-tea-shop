/** List the jade and jewellery products that still use a photograph. */
import { getDb } from '../db.mjs';

const db = getDb();
const rows = db.prepare(
  `SELECT p.slug, p.name, p.cultivar, p.art_unit, p.image_kind, c.kind, p.hero_image
     FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = 1 AND c.kind IN ('jade','jewellery') AND p.image_kind = 'photo'
    ORDER BY c.kind, p.id`,
).all();

console.log(`${rows.length} products still on a photograph\n`);
for (const r of rows) {
  console.log(`  ${r.kind.padEnd(10)} ${r.slug.padEnd(36)} unit=${(r.art_unit || '(empty)').padEnd(12)} ${r.name}`);
}
