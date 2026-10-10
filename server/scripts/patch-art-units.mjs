/**
 * Add art_unit to the jade and jewellery rows in catalog-data.mjs.
 *
 * server/data-jade.mjs is the *source* for those rows, but catalog-data.mjs holds
 * them as literals spliced in by merge-jade.mjs at some earlier point — so editing
 * data-jade.mjs alone changes nothing the application reads. Both are updated:
 * data-jade.mjs so a future re-merge keeps the field, and catalog-data.mjs because
 * that is what the seed actually builds the catalogue from.
 *
 *   node server/scripts/patch-art-units.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FILE = path.join(ROOT, 'server', 'catalog-data.mjs');

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
  if (at < 0) { console.log(`  MISSING  ${slug}`); continue; }

  const rowEnd = src.indexOf('\n  },', at);
  const row = src.slice(at, rowEnd < 0 ? at + 1200 : rowEnd);
  if (row.includes('artUnit:')) { console.log(`  already  ${slug}`); continue; }

  const famAt = src.indexOf('family:', at);
  if (famAt < 0 || famAt > (rowEnd < 0 ? at + 1200 : rowEnd)) {
    console.log(`  no family line for ${slug}`);
    continue;
  }
  const famEnd = src.indexOf('\n', famAt);
  src = `${src.slice(0, famEnd + 1)}    artUnit: '${unit}',\n${src.slice(famEnd + 1)}`;
  added += 1;
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`\n  ${added} art units added to server/catalog-data.mjs`);
