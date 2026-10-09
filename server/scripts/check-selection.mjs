/**
 * Resolve curated picks to their source titles, so a selection can be sanity
 * checked without eyeballing every tile.
 *
 *   node server/scripts/check-selection.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_ASSIGNMENTS } from '../photo-selection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const sheets = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'photos', 'sheets-index.json'), 'utf8'));

const lookup = new Map();
for (const [group, entries] of Object.entries(sheets)) {
  for (const entry of entries) lookup.set(`${group}#${entry.n}`, entry);
}

let problems = 0;
const currentGroup = { value: '' };

for (const [slot, config] of Object.entries(ALL_ASSIGNMENTS)) {
  const picks = config.picks || [config.pick];
  const group = picks[0].split('#')[0];
  if (group !== currentGroup.value) {
    currentGroup.value = group;
    console.log(`\n=== ${group} ===`);
  }
  console.log(`  ${slot}`);
  for (const pick of picks) {
    const entry = lookup.get(pick);
    if (!entry) {
      problems += 1;
      console.log(`      ${pick.padEnd(18)} MISSING`);
      continue;
    }
    console.log(`      ${pick.padEnd(18)} ${entry.licence.padEnd(14)} ${String(entry.title).slice(0, 62)}`);
  }
}

console.log(`\n${problems} unresolved pick(s)`);
process.exit(problems ? 1 : 0);
