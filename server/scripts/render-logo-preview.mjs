/**
 * Render the generated logo lockup to a PNG so it can be looked at.
 *
 *   node server/scripts/render-logo-preview.mjs
 *
 * The wordmark width is computed rather than measured, so "does the name fit"
 * is a question only the eye can answer reliably: the SVG is legal either way,
 * and the failure mode is a name with its first and last letter clipped.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { logo } from '../imagery.mjs';
import config from '../config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '..', '_shots', 'logo-preview.png');

const svg = logo({ name: config.store.name, subtitle: config.store.logoSubtitle, width: 600 });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log(`  ${path.relative(process.cwd(), OUT)}  —  ${config.store.name}`);
