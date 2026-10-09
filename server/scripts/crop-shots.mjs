/**
 * Slice a full-page screenshot into readable sections.
 *
 * A 5200px-tall capture gets downscaled past the point of usefulness when it is
 * viewed whole, so this crops it into bands at native resolution.
 *
 *   node server/scripts/crop-shots.mjs [_shots/home.png] [--bands 6]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--')) || path.join(ROOT, '_shots', 'home.png');
const bandCount = Number(args[args.indexOf('--bands') + 1]) || 5;
const overlap = 40;

async function main() {
  const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  if (!fs.existsSync(abs)) {
    console.error(`Not found: ${abs}`);
    process.exit(1);
  }

  const meta = await sharp(abs).metadata();
  const outDir = path.join(path.dirname(abs), 'bands');
  fs.mkdirSync(outDir, { recursive: true });

  const bandHeight = Math.ceil(meta.height / bandCount);
  const base = path.basename(abs, path.extname(abs));

  for (let i = 0; i < bandCount; i += 1) {
    const top = Math.max(0, i * bandHeight - (i > 0 ? overlap : 0));
    const height = Math.min(bandHeight + overlap, meta.height - top);
    if (height <= 0) break;
    const out = path.join(outDir, `${base}-${i + 1}.jpg`);
    await sharp(abs).extract({ left: 0, top, width: meta.width, height }).jpeg({ quality: 88 }).toFile(out);
    console.log(`  ${path.relative(ROOT, out)}  ${meta.width}x${height}  (y ${top}–${top + height})`);
  }
  console.log(`\n${meta.width}x${meta.height} → ${bandCount} bands in ${path.relative(ROOT, outDir)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
