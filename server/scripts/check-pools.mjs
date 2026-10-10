/**
 * Check the tea photo pools and the assignment they produce, without building
 * any images.
 *
 *   node server/scripts/check-pools.mjs
 */
import { BASE_PRODUCTS } from '../catalog-data.mjs';
import { TEA_LOT_ROWS } from '../data-lots.mjs';
import { PRODUCT_PHOTOS, JADE_PHOTOS, EDITORIAL_PHOTOS } from '../photo-selection.mjs';
import { TEA_POOLS } from '../photo-pools.mjs';
import { validatePools, buildTeaPhotos, knownPicks } from '../build-tea-photos.mjs';

const poolProblems = validatePools();
console.log(`Pools: ${Object.keys(TEA_POOLS).length} groups`);
if (poolProblems.length) {
  console.log('\nPOOL PROBLEMS');
  for (const p of poolProblems) console.log(`  - ${p}`);
} else {
  console.log('  all pool entries reference real tiles, none listed twice');
}

const { photos, problems: buildProblems, stats } = buildTeaPhotos(
  BASE_PRODUCTS,
  TEA_LOT_ROWS,
  { ...EDITORIAL_PHOTOS, ...PRODUCT_PHOTOS, ...JADE_PHOTOS },
);

console.log(`\nAssigned photographs to ${stats.lots} lots\n`);
console.log('  base tea                          pool                 lots  tiles left');
for (const b of stats.perBase) {
  console.log(`  ${b.base.padEnd(34)}${b.pool.padEnd(21)}${String(b.count).padStart(4)}${String(b.left).padStart(12)}`);
}

if (buildProblems.length) {
  console.log('\nBUILD PROBLEMS');
  for (const p of buildProblems) console.log(`  - ${p}`);
}

/* ------------------------------------------------------------- uniqueness */
const known = knownPicks();
const allPicks = [];
for (const [slug, entry] of Object.entries({ ...PRODUCT_PHOTOS, ...JADE_PHOTOS })) {
  for (const pick of entry.picks || []) allPicks.push({ slug, pick });
}
for (const [slug, entry] of Object.entries(photos)) {
  for (const pick of entry.picks || []) allPicks.push({ slug, pick });
}

const byPick = new Map();
let unknown = 0;
for (const { slug, pick } of allPicks) {
  if (!known.has(pick)) { console.log(`  UNKNOWN TILE ${pick} (${slug})`); unknown += 1; }
  if (!byPick.has(pick)) byPick.set(pick, []);
  byPick.get(pick).push(slug);
}
const shared = [...byPick.entries()].filter(([, list]) => list.length > 1);

console.log('\n  uniqueness');
console.log(`    tiles referenced            ${byPick.size}`);
console.log(`    assignments                 ${allPicks.length}`);
console.log(`    tiles used by 2+ products   ${shared.length}${shared.length ? '  <-- MUST BE 0' : ''}`);
console.log(`    unknown tiles               ${unknown}`);
for (const [pick, list] of shared.slice(0, 20)) {
  console.log(`      ${pick}  ->  ${list.join(', ')}`);
}

if (poolProblems.length || buildProblems.length || shared.length || unknown) {
  process.exitCode = 1;
  console.log('\n  FAILED');
} else {
  console.log('\n  every tile is used by exactly one product');
}
