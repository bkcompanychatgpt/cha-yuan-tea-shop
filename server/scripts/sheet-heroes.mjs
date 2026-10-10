/**
 * Render a sheet of candidate hero photographs, so the one that goes behind the
 * homepage headline can be chosen by looking at it rather than by filename.
 *
 *   node server/scripts/sheet-heroes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const FILES = [
  'hero-wide.jpg',
  'story-terraces-hero-wide.jpg',
  'story-plantation-hero-wide.jpg',
  'story-harvest-hero-wide.jpg',
  'story-pluck-hero-wide.jpg',
  'story-withering-hero-wide.jpg',
  'story-ceremony-hero-wide.jpg',
  'story-ceremony-2-hero-wide.jpg',
];

const CELL_W = 470;
const CELL_H = 200;
const COLS = 2;

const tiles = [];
for (const f of FILES) {
  const p = path.join(ROOT, 'public', 'img', 'photos', f);
  if (!fs.existsSync(p)) continue;
  const buf = await sharp(p).resize(CELL_W - 6, CELL_H - 26, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
  tiles.push({ buf, label: f.replace(/-hero-wide\.jpg$/, '') });
}

const rows = Math.ceil(tiles.length / COLS);
const W = COLS * CELL_W;
const H = rows * CELL_H + 34;

const composites = [{
  input: Buffer.from(
    `<svg width="${W}" height="30"><rect width="100%" height="100%" fill="#08160f"/>` +
    `<text x="8" y="21" font-family="Consolas,monospace" font-size="15" fill="#dcc07a">hero candidates — ${tiles.length} wide crops</text></svg>`,
  ),
  top: 0,
  left: 0,
}];

tiles.forEach((t, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = col * CELL_W;
  const y = 34 + row * CELL_H;
  composites.push({ input: t.buf, top: y + 2, left: x + 3 });
  composites.push({
    input: Buffer.from(
      `<svg width="${CELL_W - 6}" height="24"><rect width="100%" height="100%" fill="#0b1c13"/>` +
      `<text x="6" y="17" font-family="Consolas,monospace" font-size="14" fill="#dcc07a">${t.label}</text></svg>`,
    ),
    top: y + CELL_H - 24,
    left: x + 3,
  });
});

const out = path.join(ROOT, '_shots', 'hero-candidates.jpg');
await sharp({ create: { width: W, height: H, channels: 3, background: { r: 6, g: 16, b: 11 } } })
  .composite(composites)
  .jpeg({ quality: 85 })
  .toFile(out);
console.log(out);
