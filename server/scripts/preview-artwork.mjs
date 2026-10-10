/**
 * Render generative product artwork to a PNG contact sheet.
 *
 * The artwork is SVG, so the only way to know it looks right is to rasterise it
 * and look. This draws the main tile and the three detail views for a sample of
 * departments side by side, including an intentionally unknown department to
 * confirm the fallback still composes something.
 *
 *   node server/scripts/preview-artwork.mjs [_shots/artwork.png]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './lib/chrome.mjs';
import { productArtwork, productDetailArtwork } from '../imagery.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = process.argv[2] ? path.resolve(ROOT, process.argv[2]) : path.join(ROOT, '_shots', 'artwork.png');

const SAMPLES = [
  { label: 'tea', slug: 'sample-longjing', name: 'Lion Peak Longjing', family: 'Green', seal: 'Dragon', kind: 'tea', notice: true },
  { label: 'teaware', slug: 'sample-pot', name: 'Yixing Teapot', family: 'Teaware', seal: 'Pot', kind: 'teaware', notice: true },
  { label: 'jade bangle', slug: 'moss-in-snow-oval-bangle', name: 'Moss-in-Snow Oval Bangle', family: 'Jade', seal: 'Bangle', kind: 'jade', shape: 'torus', material: 'moss-in-snow jadeite', fill: 'material', notice: true },
  { label: 'jade pendant', slug: 'mutton-fat-gourd-pendant', name: 'Mutton-Fat Gourd Pendant', family: 'Jade', seal: 'Gourd', kind: 'jade', shape: 'drop', material: 'mutton-fat nephrite', fill: 'material', notice: true },
  { label: 'jade figure', slug: 'black-jade-ceremonial-axe', name: 'Black Jade Ceremonial Axe', family: 'Jade', seal: 'Axe', kind: 'jade', shape: 'blade', material: 'black nephrite (Dark Jade)', fill: 'material', notice: true },
  { label: 'jade cup', slug: 'spinach-jade-pair-of-cups', name: 'Spinach Jade Pair of Cups', family: 'Jade', seal: 'Cups', kind: 'jade', shape: 'vessel', material: 'spinach-green nephrite', fill: 'material', notice: true },
  { label: 'jewellery ruby', slug: 'burmese-ruby-halo-ring', name: 'Burmese Ruby Halo Ring', family: 'Jewellery', seal: 'Ruby', kind: 'jewellery', shape: 'ring', material: 'rubies', fill: 'material', notice: true },
  { label: 'jewellery sapphire', slug: 'sapphire-and-diamond-halo-ring', name: 'Sapphire and Diamond Halo Ring', family: 'Jewellery', seal: 'Sapphire', kind: 'jewellery', shape: 'ring', material: 'sapphires', fill: 'material', notice: true },
  { label: 'jewellery diamond', slug: 'solitaire-diamond-ring', name: 'Solitaire Diamond Ring', family: 'Jewellery', seal: 'Solitaire', kind: 'jewellery', shape: 'ring', material: 'diamonds', fill: 'material', notice: true },
  { label: 'jewellery gold', slug: '22k-gold-bangle', name: '22k Gold Bangle', family: 'Jewellery', seal: 'Bangle', kind: 'jewellery', shape: 'torus', material: '22k yellow gold', fill: 'metal', notice: true },
  { label: 'jewellery pearl', slug: 'akoya-pearl-necklace', name: 'Akoya Pearl Necklace', family: 'Jewellery', seal: 'Akoya', kind: 'jewellery', shape: 'strand', material: 'Akoya pearls', fill: 'metal', notice: true },
  { label: 'jewellery turquoise', slug: 'hubei-turquoise-ring', name: 'Hubei Turquoise Ring', family: 'Jewellery', seal: 'Turquoise', kind: 'jewellery', shape: 'ring', material: 'turquoise', fill: 'material', notice: true },
  { label: 'unknown shape', slug: 'sample-mystery', name: 'Uncatalogued Piece', family: 'Unassigned', seal: 'Piece', kind: 'mystery', notice: true },
];

const STYLES = ['vessel', 'layout', 'profile'];

function figure(sample) {
  return `
    <div class="sample">
      <div class="row">
        <figure><img src="data:image/svg+xml;base64,${Buffer.from(productArtwork(sample)).toString('base64')}" alt=""><figcaption>${sample.label} — main</figcaption></figure>
        ${STYLES.map((style) => `<figure><img src="data:image/svg+xml;base64,${Buffer.from(productDetailArtwork({ ...sample, style })).toString('base64')}" alt=""><figcaption>${sample.label} — ${style}</figcaption></figure>`).join('')}
      </div>
    </div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin:0; background:#08160f; color:#dcc07a; font:12px Consolas, monospace; padding:14px; }
  .sample { margin-bottom:14px; }
  .row { display:flex; gap:10px; }
  figure { margin:0; width:200px; }
  img { width:200px; height:200px; display:block; border:1px solid #1d3b29; }
  figcaption { font-size:10px; color:#8b8779; padding-top:4px; text-align:center; }
</style></head><body>${SAMPLES.map(figure).join('')}</body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(path.join(ROOT, '_shots', 'artwork.html'), html, 'utf8');

const browser = await launch({ width: 900, height: 1500, dpr: 2 });
try {
  await browser.goto(`file://${path.join(ROOT, '_shots', 'artwork.html').replace(/\\/g, '/')}`);
  await new Promise((r) => setTimeout(r, 900));
  const png = await browser.screenshotCurrent();
  fs.writeFileSync(OUT, png);
  console.log(OUT);
} finally {
  await browser.close();
}
