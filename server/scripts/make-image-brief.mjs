/**
 * Emit one self-contained prompt that produces all the product images.
 *
 * Not a list to work through by hand: a single instruction that names the whole
 * job, states the shared look once, carries every item with the filename its
 * image must be saved as, and defines the deliverable as one ZIP. Whoever or
 * whatever receives it should be able to finish without asking a question.
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
const ZIP_NAME = 'cha-yuan-product-images.zip';

const data = JSON.parse(fs.readFileSync(PROMPTS, 'utf8'));
const style = data.style;

/** Strip the shared style block back off, leaving the description of the piece. */
function subjectOf(prompt) {
  const cut = prompt.indexOf('Photorealistic product photograph');
  return (cut > 0 ? prompt.slice(0, cut) : prompt).trim();
}

const jade = data.prompts.filter((p) => p.department === 'jade');
const jewellery = data.prompts.filter((p) => p.department === 'jewellery');

const L = [];
const push = (...xs) => L.push(...xs);

push(`# One prompt: generate all ${data.prompts.length} product images and return a ZIP`);
push('');
push('Copy everything in the block below and send it as a single message.');
push('');

push('```text');
push('You are producing the product imagery for Cha Yuan, a shop selling Chinese tea, jade and');
push('fine jewellery. Complete the entire task below in one go and hand back a single ZIP file.');
push('Do not stop to ask questions, and do not deliver the images one at a time.');
push('');

push('TASK');
push(`Generate ${data.prompts.length} photorealistic product images — one for every item listed at the`);
push('end of this message. Each image must be square (1:1) and must be saved under the exact');
push('filename given for that item.');
push('');

push('HOW TO BUILD EACH PROMPT');
push('For an item, the image prompt is: that item\'s description, followed by the style block');
push('below, copied verbatim. Do not paraphrase the style block and do not drop the last');
push('sentence of it — the things it forbids are the ones generators add by default.');
push('');
push('STYLE BLOCK (append to every item description, verbatim)');
push(style);
push('');

push('REQUIREMENTS');
push('1. Square 1:1. The shop crops to a square; a landscape or portrait image loses the object.');
push(`2. Filenames exactly as listed — for example ${data.prompts[0].filename}. They are matched`);
push('   programmatically, so a renamed file is a lost file.');
push(`3. One object per image, centred, filling about 70% of the frame.`);
push('4. No text, lettering, watermark, logo, brand mark, price tag, ruler, hand, person, prop box,');
push('   packaging, second object, or white studio backdrop in any image.');
push('5. Consistent lighting and background across all of them. The set has to read as one');
push('   catalogue, not as ninety-seven separate pictures.');
push('6. Where a generator produces an off-centre or skewed object, regenerate it rather than');
push('   shipping it.');
push(`7. Work through every one of the ${data.prompts.length} items. Report any you could not produce.`);
push('');

push('DELIVERABLE');
push(`A single ZIP file named ${ZIP_NAME} containing all ${data.prompts.length} images at the top level`);
push('(no nested folders), each named exactly as listed below, plus a plain-text file called');
push('MANIFEST.txt listing every filename you included and any you had to leave out.');
push('');

push('THE ITEMS');
push('');

push(`### Jade & Stone — ${jade.length} images`);
push('');
for (const p of jade) {
  push(`* ${p.filename} — ${subjectOf(p.prompt)}`);
}
push('');

push(`### Fine Jewellery — ${jewellery.length} images`);
push('');
for (const p of jewellery) {
  push(`* ${p.filename} — ${subjectOf(p.prompt)}`);
}
push('');

push('Once the ZIP is ready, that is the deliverable. Nothing else is needed.');
push('```');
push('');

push('---');
push('');
push('## What to do with the ZIP');
push('');
push(`Hand back ${ZIP_NAME} and it can be imported directly — the importer reads a zip without`);
push('being unpacked first:');
push('');
push('```');
push(`node server/scripts/import-product-photos.mjs ${ZIP_NAME} --dry-run   # check first`);
push(`node server/scripts/import-product-photos.mjs ${ZIP_NAME}`);
push('```');
push('');
push('It crops and grades each image to the shop\'s look, writes the card, thumbnail and gallery');
push('derivatives, records the credit, and points the product at them.');

fs.writeFileSync(OUT, `${L.join('\n')}\n`, 'utf8');

const chars = L.join('\n').length;
console.log(`${OUT}`);
console.log(`  ${data.prompts.length} items, ${chars.toLocaleString()} characters, one paste block`);
