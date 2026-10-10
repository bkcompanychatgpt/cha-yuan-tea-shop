/**
 * Contact sheet of every product's photograph, labelled with the product name.
 *
 * The pools assign photographs by tea family, but "family" is a coarse filter: a
 * tile that shows a pile of dried chillies passes a floral-tea check and lands on
 * a chrysanthemum listing. The only way to catch that is to look at the
 * assignment as a whole, with names attached.
 *
 *   node server/scripts/check-photo-fit.mjs [kind] [page]
 *   node server/scripts/check-photo-fit.mjs tea 1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getDb } from '../db.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT_DIR = path.join(ROOT, '_shots');

const kind = process.argv[2] || 'tea';
const page = Number(process.argv[3]) || 1;
const PER_PAGE = 20;

const db = getDb();
// The argument may be a department kind ("tea") or a category slug
// ("floral-blends"), because both are useful ways to slice the sheet.
const rows = db.prepare(
  `SELECT p.slug, p.name, p.hero_image, p.image_kind, c.kind, c.slug AS category_slug
     FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = 1 AND (c.slug = ? OR c.kind = ?)
    ORDER BY c.slug, p.id`,
).all(kind, kind);

const slice = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
console.log(`${kind}: ${rows.length} products, showing ${slice.length} (page ${page} of ${Math.ceil(rows.length / PER_PAGE)})`);

const CELL = 300;
const CAP = 62;
const COLS = 4;

const composites = [];
const W = COLS * CELL;
const ROWS = Math.ceil(slice.length / COLS);
const H = ROWS * (CELL + CAP) + 40;

composites.push({
  input: Buffer.from(
    `<svg width="${W}" height="32"><rect width="100%" height="100%" fill="#08160f"/>` +
    `<text x="8" y="22" font-family="Consolas,monospace" font-size="16" fill="#dcc07a">${kind} page ${page} — ${slice.length} products</text></svg>`,
  ),
  top: 0,
  left: 0,
});

for (let i = 0; i < slice.length; i += 1) {
  const p = slice[i];
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = col * CELL;
  const y = 32 + row * (CELL + CAP);

  const rel = String(p.hero_image || '').replace(/^\//, '');
  const file = path.join(ROOT, 'public', rel);
  let img;
  try {
    img = await sharp(file).resize(CELL - 8, CELL - 8, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
  } catch {
    img = await sharp({ create: { width: CELL - 8, height: CELL - 8, channels: 3, background: { r: 60, g: 20, b: 20 } } }).jpeg().toBuffer();
  }
  composites.push({ input: img, top: y + 4, left: x + 4 });

  const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const words = String(p.name).split(' ');
  const line1 = words.slice(0, 4).join(' ').slice(0, 32);
  const line2 = words.slice(4).join(' ').slice(0, 32);
  const cap = `<svg width="${CELL - 8}" height="${CAP}"><rect width="100%" height="100%" fill="#0b1c13"/>` +
    `<text x="5" y="19" font-family="Consolas,monospace" font-size="15" fill="#dcc07a">${esc(line1)}</text>` +
    `<text x="5" y="38" font-family="Consolas,monospace" font-size="15" fill="#dcc07a">${esc(line2)}</text>` +
    `<text x="5" y="55" font-family="Consolas,monospace" font-size="11" fill="#8b8779">${esc(p.image_kind)} · ${esc(p.slug).slice(0, 34)}</text></svg>`;
  composites.push({ input: Buffer.from(cap), top: y + CELL + 2, left: x + 4 });
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const out = path.join(OUT_DIR, `fit-${kind}-${page}.jpg`);
await sharp({ create: { width: W, height: H, channels: 3, background: { r: 6, g: 16, b: 11 } } })
  .composite(composites)
  .jpeg({ quality: 84 })
  .toFile(out);
console.log(out);
