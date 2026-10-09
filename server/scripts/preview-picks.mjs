/**
 * Preview specific source tiles at a readable size.
 *
 * The numbered contact sheets are useful for scanning a whole group, but a
 * contact-sheet cell is too small to judge a single candidate. This renders a
 * handful of `group#n` picks large enough to decide on.
 *
 *   node server/scripts/preview-picks.mjs teaware#13 teaware#14 bamboo-tray#1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PHOTO_DIR = path.join(ROOT, 'data', 'photos');
const PREVIEW_DIR = path.join(PHOTO_DIR, 'preview');

const picks = process.argv.slice(2);
if (!picks.length) {
  console.error('usage: node server/scripts/preview-picks.mjs <group#n> [group#n ...]');
  process.exit(1);
}

/** Load both indexes so a pick can quote either a survey or targeted group. */
function loadLookup() {
  const lookup = new Map();
  for (const file of ['targeted-index.json', 'sheets-index.json']) {
    const full = path.join(PHOTO_DIR, file);
    if (!fs.existsSync(full)) continue;
    const sheets = JSON.parse(fs.readFileSync(full, 'utf8'));
    for (const [group, entries] of Object.entries(sheets)) {
      for (const entry of entries) {
        const key = `${group}#${entry.n}`;
        if (!lookup.has(key)) lookup.set(key, entry);
      }
    }
  }
  return lookup;
}

const COLS = 3;
const CELL = 470;
const LABEL = 30;

async function main() {
  const lookup = loadLookup();
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  const composites = [];
  const missing = [];

  for (let i = 0; i < picks.length; i += 1) {
    const entry = lookup.get(picks[i]);
    const left = (i % COLS) * CELL;
    const top = Math.floor(i / COLS) * CELL;

    if (entry && fs.existsSync(path.join(ROOT, entry.file))) {
      composites.push({
        input: await sharp(path.join(ROOT, entry.file)).resize(CELL, CELL - LABEL, { fit: 'cover' }).toBuffer(),
        left,
        top,
      });
    } else {
      missing.push(picks[i]);
      composites.push({
        input: Buffer.from(
          `<svg width="${CELL}" height="${CELL - LABEL}"><rect width="100%" height="100%" fill="#2a1414"/><text x="10" y="30" font-family="monospace" font-size="16" fill="#d4715f">NOT FOUND</text></svg>`,
        ),
        left,
        top,
      });
    }

    composites.push({
      input: Buffer.from(
        `<svg width="${CELL}" height="${LABEL}"><rect width="100%" height="100%" fill="#0b1c13"/><text x="6" y="21" font-family="monospace" font-size="16" fill="#dcc07a">${picks[i]}</text></svg>`,
      ),
      left,
      top: top + CELL - LABEL,
    });
  }

  const rows = Math.ceil(picks.length / COLS);
  const out = path.join(PREVIEW_DIR, 'pick-check.jpg');
  await sharp({
    create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: { r: 6, g: 16, b: 11 } },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(out);

  console.log(`${picks.length} pick(s) → ${path.relative(ROOT, out)}`);
  if (missing.length) console.log(`  not found: ${missing.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
