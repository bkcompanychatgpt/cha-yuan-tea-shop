/**
 * Build a labelled contact sheet from specific picks, and optionally report
 * which pick resolves to which file.
 *
 * Two jobs:
 *
 *   --classify <group> [cols]   re-sheet one group at a larger tile size, so the
 *                               tile numbers stay readable and each tile can be
 *                               judged individually
 *   --picks <group#n,group#n…>  sheet an explicit list, for verifying that a
 *                               product ended up with the photograph intended
 *
 *   node server/scripts/sheet-picks.mjs --classify target-green-more
 *   node server/scripts/sheet-picks.mjs --picks target-green-more#1,target-green-more#16
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SHEET_DIR = path.join(ROOT, 'data', 'photos', 'sheets');
const OUT_DIR = path.join(ROOT, '_shots');

const INDEX_FILES = ['sheets-index.json', 'targeted-index.json', 'openverse-index.json', 'museum-index.json'];

/** group name -> array of { n, file, title, licence, author } */
function loadIndex() {
  const byGroup = {};
  for (const f of INDEX_FILES) {
    const p = path.join(ROOT, 'data', 'photos', f);
    if (!fs.existsSync(p)) continue;
    const idx = JSON.parse(fs.readFileSync(p, 'utf8'));
    const groups = idx.groups || idx;
    for (const [group, value] of Object.entries(groups)) {
      if (byGroup[group]) continue;
      const arr = Array.isArray(value) ? value : Object.values(value);
      byGroup[group] = arr;
    }
  }
  return byGroup;
}

const CELL = 300;
const LABEL = 46;
const COLS = 5;

async function buildSheet(cells, outFile, title) {
  const rows = Math.ceil(cells.length / COLS);
  const W = COLS * CELL;
  const H = rows * (CELL + LABEL) + 60;
  const composites = [];

  composites.push({
    input: Buffer.from(
      `<svg width="${W}" height="30"><rect width="100%" height="100%" fill="#08160f"/>` +
      `<text x="10" y="21" font-family="Consolas,monospace" font-size="17" fill="#dcc07a">${title}</text></svg>`,
    ),
    top: 0,
    left: 0,
  });

  for (let i = 0; i < cells.length; i += 1) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL;
    const y = 30 + row * (CELL + LABEL);

    let img;
    try {
      img = await sharp(cells[i].file)
        .resize(CELL - 8, CELL - 8 - LABEL, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 82 })
        .toBuffer();
    } catch {
      img = await sharp({
        create: { width: CELL - 8, height: CELL - 8 - LABEL, channels: 3, background: { r: 42, g: 20, b: 20 } },
      }).jpeg().toBuffer();
    }
    composites.push({ input: img, top: y + 4, left: x + 4 });

    const cap = `<svg width="${CELL - 8}" height="${LABEL}"><rect width="100%" height="100%" fill="#0b1c13"/>` +
      `<text x="6" y="20" font-family="Consolas,monospace" font-size="17" fill="#dcc07a">#${cells[i].n}</text>` +
      `<text x="6" y="38" font-family="Consolas,monospace" font-size="13" fill="#8b8779">${String(cells[i].note || '').slice(0, 34)}</text></svg>`;
    composites.push({ input: Buffer.from(cap), top: y + CELL - LABEL + 4, left: x + 4 });
  }

  const base = sharp({ create: { width: W, height: H, channels: 3, background: { r: 6, g: 16, b: 11 } } });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await base.composite(composites).jpeg({ quality: 84 }).toFile(outFile);
  return outFile;
}

const argv = process.argv.slice(2);
const index = loadIndex();

if (argv[0] === '--classify') {
  const group = argv[1];
  const entries = index[group];
  if (!entries) {
    console.error(`unknown group "${group}". Known: ${Object.keys(index).join(', ')}`);
    process.exitCode = 1;
  } else {
    const cells = entries.map((e) => ({ n: e.n ?? e.tile, file: path.join(ROOT, e.file), note: e.title || '' }));
    const out = path.join(OUT_DIR, `classify-${group}.jpg`);
    await buildSheet(cells, out, `group ${group} — ${cells.length} tiles`);
    console.log(out);
  }
} else if (argv[0] === '--picks') {
  const picks = argv[1].split(',').map((s) => s.trim()).filter(Boolean);
  const cells = [];
  for (const pick of picks) {
    const [group, nRaw] = pick.split('#');
    const n = Number(nRaw);
    const entry = (index[group] || []).find((e) => (e.n ?? e.tile) === n);
    if (!entry) {
      console.error(`  ! ${pick} not found in index`);
      continue;
    }
    cells.push({ n: `${group}#${n}`, file: path.join(ROOT, entry.file), note: entry.title || '' });
  }
  const out = path.join(OUT_DIR, 'picks.jpg');
  await buildSheet(cells, out, `${cells.length} picks`);
  console.log(out);
  for (const c of cells) console.log(`  ${c.n}  ${c.note}`);
} else {
  console.error('usage: sheet-picks.mjs --classify <group> | --picks <g#n,g#n,…>');
  process.exitCode = 2;
}
