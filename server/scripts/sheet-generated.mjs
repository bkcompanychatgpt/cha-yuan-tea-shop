/**
 * Look at the generated images before importing them.
 *
 *   node server/scripts/sheet-generated.mjs <zip|folder> [count]
 *
 * Builds one contact sheet from an evenly spaced sample of the archive, so the
 * whole set can be judged without opening ninety-seven files. The generated
 * images then go through import-product-photos.mjs.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { extractFlat } from './lib/zip.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const arg = process.argv[2];
const want = Number(process.argv[3]) || 24;

if (!arg) {
  console.error('usage: node server/scripts/sheet-generated.mjs <zip|folder> [count]');
  process.exitCode = 2;
} else {
  const given = path.resolve(arg);
  let dir = given;
  let temp = null;

  if (/\.zip$/i.test(given)) {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cy-sheet-'));
    const { written } = extractFlat(fs.readFileSync(given), temp, { fs, path });
    dir = temp;
    console.log(`unpacked ${written.length} images`);
  }

  const files = fs.readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();

  const step = Math.max(1, Math.floor(files.length / want));
  const picked = files.filter((_, i) => i % step === 0).slice(0, want);

  const CELL = 240;
  const LABEL = 22;
  const COLS = 6;
  const rows = Math.ceil(picked.length / COLS);
  const W = COLS * CELL;
  const H = rows * (CELL + LABEL) + 30;

  const composites = [{
    input: Buffer.from(
      `<svg width="${W}" height="28"><rect width="100%" height="100%" fill="#08160f"/>` +
      `<text x="8" y="20" font-family="Consolas,monospace" font-size="14" fill="#dcc07a">generated sample — ${picked.length} of ${files.length}</text></svg>`,
    ),
    top: 0,
    left: 0,
  }];

  for (let i = 0; i < picked.length; i += 1) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL;
    const y = 30 + row * (CELL + LABEL);
    let buf;
    try {
      buf = await sharp(path.join(dir, picked[i]))
        .resize(CELL - 6, CELL - 6 - LABEL + 6, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch {
      buf = await sharp({ create: { width: CELL - 6, height: CELL - LABEL, channels: 3, background: { r: 60, g: 20, b: 20 } } }).jpeg().toBuffer();
    }
    composites.push({ input: buf, top: y + 3, left: x + 3 });
    composites.push({
      input: Buffer.from(
        `<svg width="${CELL - 6}" height="${LABEL}"><rect width="100%" height="100%" fill="#0b1c13"/>` +
        `<text x="4" y="15" font-family="Consolas,monospace" font-size="11" fill="#dcc07a">${picked[i].replace(/\.(jpe?g|png|webp)$/i, '').slice(0, 30)}</text></svg>`,
      ),
      top: y + CELL - LABEL + 3,
      left: x + 3,
    });
  }

  const out = path.join(ROOT, '_shots', 'generated-sample.jpg');
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 6, g: 16, b: 11 } } })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toFile(out);
  console.log(out);

  if (temp) fs.rmSync(temp, { recursive: true, force: true });
}
