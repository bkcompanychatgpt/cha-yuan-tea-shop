/** Check that imported product images survived the reseed. */
import { getDb } from '../db.mjs';

const db = getDb();

const byKind = db.prepare(
  `SELECT image_kind,
          COUNT(*) AS n,
          SUM(CASE WHEN hero_image LIKE '/img/photos/%' THEN 1 ELSE 0 END) AS withFile,
          SUM(CASE WHEN hero_image LIKE '/img/product/%' THEN 1 ELSE 0 END) AS artwork
     FROM products WHERE is_active = 1
    GROUP BY image_kind`,
).all();

console.log('image kind      count   own image file   drawn artwork');
for (const r of byKind) {
  console.log(`  ${String(r.image_kind).padEnd(13)} ${String(r.n).padStart(4)} ${String(r.withFile).padStart(14)} ${String(r.artwork).padStart(15)}`);
}

for (const slug of ['moss-in-snow-oval-bangle', 'burmese-ruby-halo-ring', 'guanyin-pendant']) {
  const p = db.prepare('SELECT slug, hero_image, image_kind, images FROM products WHERE slug = ?').get(slug);
  if (!p) { console.log(`  ${slug} — missing`); continue; }
  const gallery = JSON.parse(p.images || '[]');
  console.log(`\n  ${p.slug}  [${p.image_kind}]`);
  console.log(`    hero:    ${p.hero_image}`);
  console.log(`    gallery: ${gallery.length} image(s)`);
  for (const g of gallery) console.log(`      ${g}`);
}
