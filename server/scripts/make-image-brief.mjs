/**
 * Emit one paste-ready brief for an image generator.
 *
 * The full prompt file repeats a 600-character house-style block ninety-seven
 * times, which is about sixty thousand characters and miserable to paste. This
 * writes the same thing in the shape a person can actually send: the style stated
 * once, then one compact line per product with the filename that line's image
 * must be saved as.
 *
 *   node server/scripts/make-image-brief.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PROMPTS = path.join(ROOT, 'docs', 'image-prompts.json');
const OUT = path.join(ROOT, 'docs', 'prompts-for-image-ai.md');

const data = JSON.parse(fs.readFileSync(PROMPTS, 'utf8'));
const style = data.style;

/** Strip the shared style back off, leaving the sentence that describes the piece. */
function subjectOf(prompt) {
  const cut = prompt.indexOf('Photorealistic product photograph');
  return (cut > 0 ? prompt.slice(0, cut) : prompt).trim();
}

const byDept = { jade: [], jewellery: [] };
for (const p of data.prompts) (byDept[p.department] ||= []).push(p);

const lines = [];

lines.push('# Image brief — Cha Yuan product visuals');
lines.push('');
lines.push(`Generate **${data.prompts.length} square (1:1) product images**, one per item below.`);
lines.push('Save each one using the filename given for that item.');
lines.push('');
lines.push('## How to generate each image');
lines.push('');
lines.push('For every item, the prompt is: **the item\'s description, followed by this style block, verbatim.**');
lines.push('');
lines.push('> ' + style);
lines.push('');
lines.push('## Rules that matter');
lines.push('');
lines.push('- **Square, 1:1.** The shop crops to square; anything else loses the object.');
lines.push('- **Filename exactly as given**, e.g. `moss-in-snow-oval-bangle.jpg` — the import script matches on it.');
lines.push('- **One object per image.** No text, no watermark, no hands, no packaging, no white backdrop — the');
lines.push('  last paragraph of the style block lists all of it and it is not optional.');
lines.push('- **Consistent look across all of them.** If the generator drifts, re-state the style block.');
lines.push('- If you can produce extra angles, save them as `<filename>-2.jpg` and `<filename>-3.jpg`;');
lines.push('  otherwise one image per item is fine and the gallery reuses it.');
lines.push('');
lines.push('## The items');
lines.push('');

for (const [dept, label] of [['jade', 'Jade & Stone'], ['jewellery', 'Fine Jewellery']]) {
  const items = byDept[dept] || [];
  if (!items.length) continue;
  lines.push(`### ${label} (${items.length})`);
  lines.push('');
  for (const p of items) {
    lines.push(`**${p.filename}** — ${p.name}`);
    lines.push('');
    lines.push(subjectOf(p.prompt));
    lines.push('');
  }
}

lines.push('---');
lines.push('');
lines.push('When the images are ready, drop them all in one folder and run:');
lines.push('');
lines.push('```');
lines.push('node server/scripts/import-product-photos.mjs <folder>');
lines.push('```');
lines.push('');
lines.push('That crops and grades each one to the shop\'s look, writes the card, thumbnail and gallery');
lines.push('derivatives, records the credit and points the product at them.');

fs.writeFileSync(OUT, `${lines.join('\n')}\n`, 'utf8');

const chars = lines.join('\n').length;
console.log(`${OUT}`);
console.log(`  ${data.prompts.length} items, ${chars.toLocaleString()} characters`);
console.log(`  (the full per-item version is ${JSON.stringify(data).length.toLocaleString()} characters)`);
