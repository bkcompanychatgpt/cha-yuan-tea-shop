/**
 * Contact sheet of candidate department covers.
 *
 * The three department cards borrow their cover from the category with the most
 * products in it, which is a reasonable default and a poor choice of photograph:
 * the tea cover is a blurred close-up and the jewellery cover crops its ornament
 * off top and bottom. This shows the alternatives that already exist, cropped to
 * the card's 4:5, so one can be picked by looking.
 *
 *   node server/scripts/sheet-covers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PHOTOS = path.join(ROOT, 'public', 'img', 'photos');

const CANDIDATES = {
  Tea: [
    'story-withering-hero.jpg', 'story-harvest-hero.jpg', 'story-terraces-hero.jpg',
    'lion-peak-longjing-hero.jpg', 'da-hong-pao-hero.jpg', 'jasmine-pearls-nine-scent-hero.jpg',
    'aged-shou-tuocha-2008-hero.jpg', 'category-green-tea-tile.jpg',
  ],
  'Jade & Stone': [
    'category-jade-tile.jpg', 'jadeite-bangle-classic-round-hero.jpg',
    'jadeite-bangle-imperial-hero.jpg', 'hetian-jade-buddha-pendant-hero.jpg',
    'jade-ruyi-sceptre-hero.jpg', 'jade-dragon-pendant-hero.jpg',
    'jade-deer-study-hero.jpg', 'jade-carved-pendant-tiger-hero.jpg',
  ],
  'Fine Jewellery': [
    'category-jewellery-tile.jpg', 'pearl-strand-necklace-hero.jpg',
    'gold-filigree-cuff-hero.jpg', 'jadeite-diamond-pendant-hero.jpg',
    'jade-gold-necklace-beads-hero.jpg', 'gold-and-jade-ring-hero.jpg',
    'jadeite-and-gold-earrings-hero.jpg', 'imperial-jadeite-earrings-hero.jpg',
  ],
};

const CELL_W = 150;
const CELL_H = 188;   // 4:5, the card's own ratio
const LABEL = 26;

const cols = 8;
const rows = Object.keys(CANDIDATES).length;
const W = cols * CELL_W;
const H = rows * (CELL_H + LABEL) + 30;

const composites = [{
  input: Buffer.from(
    `<svg width="${W}" height="28"><rect width="100%" height="100%" fill="#08160f"/>` +
    `<text x="8" y="20" font-family="Consolas,monospace" font-size="14" fill="#dcc07a">candidates, cropped to the card's 4:5 — one row per department</text></svg>`,
  ),
  top: 0,
  left: 0,
}];

let row = 0;
for (const [dept, files] of Object.entries(CANDIDATES)) {
  const y = 30 + row * (CELL_H + LABEL);
  composites.push({
    input: Buffer.from(
      `<svg width="190" height="${CELL_H}"><rect width="100%" height="100%" fill="#0b1c13"/>` +
      `<text x="8" y="24" font-family="Consolas,monospace" font-size="14" fill="#dcc07a">${dept.replace('&', '&amp;')}</text></svg>`,
    ),
    top: y,
    left: 0,
  });
  files.forEach((file, i) => {
    const p = path.join(PHOTOS, file);
    if (!fs.existsSync(p)) return;
    const x = (i + 1) * CELL_W;
    composites.push({
      input: Buffer.from(
        `<svg width="${CELL_W}" height="${LABEL}"><rect width="100%" height="100%" fill="#0b1c13"/>` +
        `<text x="3" y="17" font-family="Consolas,monospace" font-size="10" fill="#8b8779">${file.replace(/-hero\.jpg|-tile\.jpg/, '').slice(0, 22)}</text></svg>`,
      ),
      top: y + CELL_H - LABEL,
      left: x,
    });
  });
  row += 1;
}

/* Images go in a second pass so they sit above their own label bars. */
row = 0;
for (const files of Object.values(CANDIDATES)) {
  const y = 30 + row * (CELL_H + LABEL);
  for (let i = 0; i < files.length; i += 1) {
    const p = path.join(PHOTOS, files[i]);
    if (!fs.existsSync(p)) continue;
    const buf = await sharp(p).resize(CELL_W, CELL_H, { fit: 'cover', position: 'centre' })
      .composite([{ input: Buffer.from(
        `<svg width="${CELL_W}" height="${CELL_H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="55%" stop-color="#040c08" stop-opacity="0"/><stop offset="100%" stop-color="#040c08" stop-opacity="0.95"/>` +
        `</linearGradient></defs><rect width="${CELL_W}" height="${CELL_H}" fill="#0d2016" fill-opacity="0.28"/>` +
        `<rect y="${CELL_H - 60}" width="${CELL_W}" height="60" fill="url(#g)"/></svg>`,
      ), blend: 'over' }])
      .jpeg({ quality: 82 }).toBuffer();
    composites.push({ input: buf, top: y, left: (i + 1) * CELL_W });
  }
  row += 1;
}

const out = path.join(ROOT, '_shots', 'cover-candidates.jpg');
await sharp({ create: { width: W, height: H, channels: 3, background: { r: 6, g: 16, b: 11 } } })
  .composite(composites)
  .jpeg({ quality: 86 })
  .toFile(out);
console.log(out);
