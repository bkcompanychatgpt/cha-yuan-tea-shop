/**
 * One-off migration: replace every CJK `seal` in the catalogue with an English
 * label.
 *
 * The `seal` field was originally a single Chinese character rendered into a
 * product's chop mark. The storefront is English-only, so each becomes a short
 * English word that still reads as a chop and still identifies the tea. The
 * character-to-label mapping lives in ./data/seal-transliterations.json so this
 * script contains no non-Latin text of its own.
 *
 * This has already been run. It is kept because it documents the change and is
 * safe to re-run: it only rewrites `seal:` values it recognises.
 *
 *   node server/scripts/localise-seals.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(__dirname, '..', 'catalog-data.mjs');
const MAP_FILE = path.resolve(__dirname, 'data', 'seal-transliterations.json');

const { map: MAP, note } = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));

let text = fs.readFileSync(FILE, 'utf8');
const counts = new Map();

text = text.replace(/seal: '([^']+)'/g, (match, value) => {
  const label = MAP[value];
  if (!label) return match; // already English, or unmapped: leave it alone
  counts.set(label, (counts.get(label) || 0) + 1);
  return `seal: '${label}'`;
});

fs.writeFileSync(FILE, Buffer.from(text, 'utf8'));

const remaining = (text.match(/seal: '[^a-zA-Z']/g) || []).length;
console.log(`${counts.size} distinct English seal labels written`);
console.log(`  ${[...counts.entries()].map(([k, v]) => (v > 1 ? `${k} x${v}` : k)).join(', ')}`);
console.log(`  non-Latin seals remaining: ${remaining}`);
if (note) console.log(`  note: ${note}`);
