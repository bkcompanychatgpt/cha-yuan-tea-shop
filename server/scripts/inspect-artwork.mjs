/**
 * Inspect the colours a generated artwork actually uses, and optionally render
 * a small preview so the palette can be judged rather than guessed at.
 *
 *   node server/scripts/inspect-artwork.mjs category pu-erh
 *   node server/scripts/inspect-artwork.mjs product wuyi-shuixian --preview
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import * as imagery from '../imagery.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const [, , kind = 'category', slug = 'pu-erh'] = process.argv;
const wantPreview = process.argv.includes('--preview');

const FAMILY_BY_CATEGORY = {
  'green-tea': 'Green',
  'white-tea': 'White',
  'oolong-tea': 'Oolong',
  'dan-cong': 'Dan Cong',
  'rock-oolong': 'Rock Oolong',
  'black-tea': 'Black',
  'pu-erh': 'Pu-erh',
  'floral-blends': 'Floral',
  teaware: 'Teaware',
  'gift-sets': 'Gift',
};

const family = FAMILY_BY_CATEGORY[slug] || slug;
const svg =
  kind === 'category'
    ? imagery.heroArtwork({ key: `cat-${slug}`, family, title: '', subtitle: '' })
    : imagery.productArtwork({ slug, name: slug, family, seal: 'Sample', kind: 'tea' });

const colours = [...new Set([...svg.matchAll(/stop-color="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]))];
console.log(`${kind}/${slug}  family=${family}`);
console.log(`  palette tokens: ${colours.join('  ')}`);
console.log(`  palette entry : ${JSON.stringify(imagery.FAMILY_PALETTE[family])}`);

if (wantPreview) {
  const out = path.join(ROOT, '_shots', `artwork-${kind}-${slug}.png`);
  await sharp(Buffer.from(svg)).resize(600, 600, { fit: 'cover' }).png().toFile(out);
  console.log(`  preview       : ${path.relative(ROOT, out)}`);
}
