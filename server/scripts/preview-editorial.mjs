/**
 * Preview the editorial photography at the aspect ratios the site actually uses,
 * so a banner crop can be judged before it ships.
 *
 *   node server/scripts/preview-editorial.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { EDITORIAL_PHOTOS } from '../photo-selection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PHOTO_OUT = path.join(ROOT, 'public', 'img', 'photos');
const PREVIEW_DIR = path.join(ROOT, 'data', 'photos', 'preview');

const WIDTH = 640;
const WIDE_H = Math.round((WIDTH * 1080) / 1920);
const LABEL = 26;

async function main() {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const slots = Object.keys(EDITORIAL_PHOTOS);

  const composites = [];
  let y = 0;
  for (const slot of slots) {
    const wide = path.join(PHOTO_OUT, `${slot}-hero-wide.jpg`);
    if (!fs.existsSync(wide)) continue;

    composites.push({
      input: await sharp(wide).resize(WIDTH, WIDE_H, { fit: 'cover' }).toBuffer(),
      left: 0,
      top: y,
    });
    composites.push({
      input: Buffer.from(
        `<svg width="${WIDTH}" height="${LABEL}"><rect width="100%" height="100%" fill="#0b1c13"/><text x="6" y="18" font-family="monospace" font-size="14" fill="#dcc07a">${slot}  (16:9 banner crop)</text></svg>`,
      ),
      left: 0,
      top: y + WIDE_H,
    });
    y += WIDE_H + LABEL + 10;
  }

  const out = path.join(PREVIEW_DIR, 'editorial-banners.jpg');
  await sharp({ create: { width: WIDTH, height: y, channels: 3, background: { r: 6, g: 16, b: 11 } } })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(out);
  console.log(`${slots.length} banners → ${path.relative(ROOT, out)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
