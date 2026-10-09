/**
 * Build a close-up comparison sheet of specific built product tiles, so the
 * grading can be judged at a size a person can actually see.
 *
 *   node server/scripts/preview-tiles.mjs <slug> [slug...]
 *   node server/scripts/preview-tiles.mjs --all
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PRODUCT_PHOTOS } from '../photo-selection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PHOTO_OUT = path.join(ROOT, 'public', 'img', 'photos');
const PREVIEW_DIR = path.join(ROOT, 'data', 'photos', 'preview');

const args = process.argv.slice(2);
const slugs = args.includes('--all') || !args.length ? Object.keys(PRODUCT_PHOTOS) : args;

const COLS = 3;
const CELL = 440;
const LABEL = 28;

async function main() {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const rows = Math.ceil(slugs.length / COLS);
  const composites = [];

  for (let i = 0; i < slugs.length; i += 1) {
    const slug = slugs[i];
    const file = path.join(PHOTO_OUT, `${slug}-hero.jpg`);
    const left = (i % COLS) * CELL;
    const top = Math.floor(i / COLS) * CELL;

    if (fs.existsSync(file)) {
      composites.push({
        input: await sharp(file).resize(CELL - 8, CELL - 8 - LABEL, { fit: 'cover' }).toBuffer(),
        left: left + 4,
        top: top + 4,
      });
    }
    const label = Buffer.from(
      `<svg width="${CELL - 8}" height="${LABEL}"><rect width="100%" height="100%" fill="#0b1c13"/>` +
        `<text x="6" y="19" font-family="monospace" font-size="14" fill="#dcc07a">${slug.slice(0, 46)}</text></svg>`,
    );
    composites.push({ input: label, left: left + 4, top: top + CELL - LABEL });
  }

  const out = path.join(PREVIEW_DIR, 'tile-check.jpg');
  await sharp({
    create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: { r: 6, g: 16, b: 11 } },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(out);
  console.log(`${slugs.length} tiles → ${path.relative(ROOT, out)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
