/**
 * Rebuild contact sheets with stable numbering and emit an index.
 *
 * The first pass burned the source title into each tile, which truncates and
 * cannot be matched back to a file. This pass numbers tiles 1..n and writes a
 * parallel index so a tile can be selected by number and resolved to its
 * download path and licence metadata.
 *
 *   node server/scripts/build-sheets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PHOTO_DIR = path.join(ROOT, 'data', 'photos');
const RAW_DIR = path.join(PHOTO_DIR, 'raw');
const SHEET_DIR = path.join(PHOTO_DIR, 'sheets');
const MANIFEST = path.join(PHOTO_DIR, 'candidates.json');

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function buildSheet(entries, outFile, { cols = 6, cell = 250 } = {}) {
  const rows = Math.ceil(entries.length / cols);
  const labelH = 26;
  const composites = [];

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const left = (i % cols) * cell;
    const top = Math.floor(i / cols) * cell;
    try {
      const img = await sharp(entry.file)
        .resize(cell - 10, cell - 10 - labelH, { fit: 'cover', position: 'centre' })
        .toBuffer();
      composites.push({ input: img, left: left + 5, top: top + 5 });
    } catch {
      composites.push({
        input: Buffer.from(
          `<svg width="${cell - 10}" height="${cell - 10 - labelH}"><rect width="100%" height="100%" fill="#2a1414"/><text x="8" y="24" font-family="monospace" font-size="14" fill="#d4715f">unreadable</text></svg>`,
        ),
        left: left + 5,
        top: top + 5,
      });
    }
    const label = Buffer.from(
      `<svg width="${cell - 10}" height="${labelH}"><rect width="100%" height="100%" fill="#0b1c13"/>` +
        `<text x="6" y="18" font-family="monospace" font-size="15" fill="#dcc07a">#${i + 1}</text></svg>`,
    );
    composites.push({ input: label, left: left + 5, top: top + cell - labelH });
  }

  await sharp({
    create: { width: cols * cell, height: rows * cell, channels: 3, background: { r: 6, g: 16, b: 11 } },
  })
    .composite(composites)
    .jpeg({ quality: 84 })
    .toFile(outFile);

  return rows;
}

async function main() {
  const candidates = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  fs.mkdirSync(SHEET_DIR, { recursive: true });

  const groups = [...new Set(candidates.map((c) => c.group))];
  const index = {};

  for (const group of groups) {
    const entries = candidates
      .filter((c) => c.group === group && fs.existsSync(path.join(ROOT, c.file)))
      .map((c) => ({ ...c, file: path.join(ROOT, c.file) }));

    if (!entries.length) {
      console.log(`${group}: no readable files`);
      continue;
    }

    const outFile = path.join(SHEET_DIR, `${group}.jpg`);
    const rows = await buildSheet(entries, outFile);
    index[group] = entries.map((c, i) => ({
      n: i + 1,
      file: path.relative(ROOT, c.file).replace(/\\/g, '/'),
      title: c.title,
      licence: c.licence,
      licenceUrl: c.licenceUrl,
      author: c.author,
      descriptionUrl: c.descriptionUrl,
      width: c.width,
      height: c.height,
      query: c.query,
    }));
    console.log(`${group.padEnd(16)} ${entries.length} tiles, ${rows} rows → sheets/${group}.jpg`);
  }

  fs.writeFileSync(path.join(PHOTO_DIR, 'sheets-index.json'), JSON.stringify(index, null, 2));
  const total = Object.values(index).reduce((n, a) => n + a.length, 0);
  console.log(`\n${total} tiles indexed → data/photos/sheets-index.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
