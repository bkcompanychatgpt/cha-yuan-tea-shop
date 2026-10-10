/**
 * Give the hand-written jade and jewellery pieces an art unit.
 *
 * They were written before `art_unit` existed, so the field is empty on all
 * seventeen — which means the prompt generator cannot tell a bangle from a ring
 * and describes them all the same way, and the drawn-work fallback would use the
 * generic plaque silhouette for every one of them.
 *
 * The unit is the thing the piece is sold in, and it drives the framing line in
 * the prompt and the silhouette in the fallback artwork.
 *
 *   node server/scripts/add-art-units.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FILE = path.join(ROOT, 'server', 'data-jade.mjs');

const UNITS = {
  'hetian-jade-buddha-pendant': 'Pendant',
  'jadeite-bangle-classic-round': 'Bangle',
  'jadeite-bangle-certified': 'Bangle',
  'jadeite-bangle-imperial': 'Bangle',
  'jade-carved-pendant-tiger': 'Pendant',
  'jade-dragon-pendant': 'Pendant',
  'jade-leaf-and-grape-pendant': 'Pendant',
  'jade-deer-study': 'Figure',
  'jade-ruyi-sceptre': 'Sceptre',
  'jade-and-nephrite-pair': 'Pair',
  'pearl-strand-necklace': 'Necklace',
  // The slug says pendant, the piece is a ring.
  'jadeite-diamond-pendant': 'Ring',
  'jade-gold-necklace-beads': 'Necklace',
  'gold-filigree-cuff': 'Cuff',
  'gold-and-jade-ring': 'Ring',
  'jadeite-and-gold-earrings': 'Earrings',
  'imperial-jadeite-earrings': 'Earrings',
};

let src = fs.readFileSync(FILE, 'utf8');
let added = 0;

for (const [slug, unit] of Object.entries(UNITS)) {
  const marker = `slug: '${slug}',`;
  const at = src.indexOf(marker);
  if (at < 0) {
    console.log(`  MISSING  ${slug}`);
    continue;
  }
  // Skip if this row already carries a unit.
  const rowEnd = src.indexOf('\n  },', at);
  const row = src.slice(at, rowEnd < 0 ? at + 800 : rowEnd);
  if (row.includes('artUnit:')) {
    console.log(`  already  ${slug}`);
    continue;
  }
  // Insert after the `family:` line, which every row has.
  const famAt = src.indexOf('family:', at);
  const famEnd = src.indexOf('\n', famAt);
  src = `${src.slice(0, famEnd + 1)}    artUnit: '${unit}',\n${src.slice(famEnd + 1)}`;
  added += 1;
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`\n  ${added} art units added to server/data-jade.mjs`);
