/**
 * Which tile each tea product ended up with.
 *
 * Fit sheets show that an assignment is wrong; this says which tile to remove to
 * fix it. Prints every tea product's picks, optionally filtered to a list of
 * slugs on the command line.
 *
 *   node server/scripts/tiles-in-use.mjs
 *   node server/scripts/tiles-in-use.mjs lion-peak-longjing-late-spring rose-black-tea
 */
import { TEA_PHOTOS } from '../photo-selection.mjs';
import { getDb } from '../db.mjs';

const db = getDb();
const want = process.argv.slice(2);
const nameOf = new Map(
  db.prepare('SELECT slug, name FROM products').all().map((r) => [r.slug, r.name]),
);

const slugs = want.length ? want : Object.keys(TEA_PHOTOS);
for (const slug of slugs) {
  const entry = TEA_PHOTOS[slug];
  if (!entry) { console.log(`  ${slug}  (no tea-photo entry)`); continue; }
  console.log(`  ${slug.padEnd(42)} ${String(nameOf.get(slug) || '').padEnd(38)} ${entry.picks.join(', ')}`);
}
