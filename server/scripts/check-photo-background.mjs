/**
 * Find listings that do not sit on the same ground as their neighbours.
 *
 * Every card in a department is meant to read as one set. A studio shot on white
 * punches a bright hole in a dark grid, and it is the single most obvious way one
 * listing looks like it does not belong — which is exactly how a
 * museum-archival photograph of a jade pendant stood out among nineteen
 * near-black ones.
 *
 * The measure is the mean luminance of the four corners (see below), and the
 * comparison is against **the listing's own department**, not a fixed number.
 * That distinction matters: the tea department is deliberately shot on a pale
 * ground, and a fixed threshold flagged eighty-four teas, all of them perfectly
 * consistent with each other and none of them a problem. What is wrong is being
 * the odd one out, not being light.
 *
 *   node server/scripts/check-photo-background.mjs
 *   node server/scripts/check-photo-background.mjs --threshold 90   (fixed cut-off instead)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getDb } from '../db.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const args = process.argv.slice(2);
const fixedIdx = args.indexOf('--threshold');
const FIXED = fixedIdx >= 0 ? Number(args[fixedIdx + 1]) : null;

/**
 * Listings known to be out of step, with the reason.
 *
 * A check that is red for a defect already recorded is a check nobody reads, and
 * a check that is green because the defect was deleted from the script is worse.
 * So the known one is named here and reported as information; anything *else*
 * appearing is a failure. Remove an entry when its replacement image lands — the
 * empty list is the goal, and it is worth keeping visible.
 */
const KNOWN_OUT_OF_STEP = [
  {
    slug: 'jade-carved-pendant-tiger',
    why: 'awaiting a replacement render: the generated one showed a dragon, not a tiger',
  },
];

/**
 * Mean luminance of the four corner patches, on the 0–255 scale sharp reports.
 *
 * Corners rather than the whole frame, because a pale object centred in a dark
 * frame is fine and only the surround matters. 12% of each dimension is big
 * enough to be representative and small enough that a centred object never
 * reaches into it.
 */
async function cornerLuma(file) {
  const meta = await sharp(file).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) return null;
  const cw = Math.max(8, Math.round(w * 0.12));
  const ch = Math.max(8, Math.round(h * 0.12));

  let total = 0;
  for (const [left, top] of [[0, 0], [w - cw, 0], [0, h - ch], [w - cw, h - ch]]) {
    const { channels } = await sharp(file).extract({ left, top, width: cw, height: ch }).stats();
    const [r, g, b] = channels;
    // Rec. 601 luma: how bright the corner looks, not how colourful it is.
    total += 0.299 * r.mean + 0.587 * g.mean + 0.114 * b.mean;
  }
  return total / 4;
}

const db = getDb();
const rows = db.prepare(`
  SELECT p.slug, p.name, p.hero_image, p.image_kind, c.kind AS department
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
   WHERE p.is_active = 1
   ORDER BY c.kind, p.slug
`).all();

console.log('\nBackground consistency audit\n');

const measured = [];
for (const row of rows) {
  const rel = String(row.hero_image || '').split('?')[0];
  if (!rel.startsWith('/img/photos/')) continue;
  const file = path.join(ROOT, 'public', rel.replace(/^\//, ''));
  if (!fs.existsSync(file)) continue;
  let luma;
  try {
    luma = await cornerLuma(file);
  } catch {
    continue;
  }
  if (luma === null) continue;
  measured.push({ ...row, luma });
}

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const byDept = new Map();
for (const m of measured) {
  const key = m.department || 'uncategorised';
  if (!byDept.has(key)) byDept.set(key, []);
  byDept.get(key).push(m);
}

const outliers = [];

for (const [dept, list] of byDept) {
  const med = median(list.map((m) => m.luma));
  /*
   * Twice the department's own median, and never below 70. The floor stops a
   * genuinely dark department (near-black jade, median around 30) from flagging
   * anything that is merely a little lighter, and the ratio stops a pale
   * department (tea, median around 120) from flagging anything at all.
   */
  const cut = FIXED === null ? Math.max(70, med * 2) : FIXED;
  const flagged = list.filter((m) => m.luma > cut);
  console.log(
    `  ${dept.padEnd(12)} ${String(list.length).padStart(3)} listings   ` +
    `median ${med.toFixed(0).padStart(3)}/255   cut-off ${cut.toFixed(0).padStart(3)}   ` +
    `${flagged.length ? `\u001b[31m${flagged.length} outlier(s)\u001b[0m` : '\u001b[32mconsistent\u001b[0m'}`,
  );
  for (const f of flagged) outliers.push({ ...f, cut });
}

if (outliers.length) {
  const known = outliers.filter((o) => KNOWN_OUT_OF_STEP.some((k) => k.slug === o.slug));
  const fresh = outliers.filter((o) => !known.some((k) => k.slug === o.slug));

  if (known.length) {
    console.log('\n  Known, and waiting on a replacement image:');
    for (const o of known) {
      const entry = KNOWN_OUT_OF_STEP.find((k) => k.slug === o.slug);
      console.log(`    ${o.luma.toFixed(0).padStart(3)}/255  ${o.slug.padEnd(34)} ${entry.why}`);
    }
  }

  if (fresh.length) {
    console.log('\n  \u001b[31mThese do not match the ground their neighbours sit on:\u001b[0m\n');
    fresh.sort((a, b) => b.luma / b.cut - a.luma / a.cut);
    for (const o of fresh) {
      console.log(
        `    ${o.luma.toFixed(0).padStart(3)}/255  ${o.slug.padEnd(34)} ` +
        `${String(o.image_kind).padEnd(13)} ${o.name}`,
      );
    }
    console.log('\n  Regenerate against the house style and import the replacements:');
    console.log('    node server/scripts/make-image-prompts.mjs --only-photographed --out docs/prompts');
  }

  console.log(
    `\n  ${measured.length} photograph(s) measured, ` +
    `${fresh.length} unexpected, ${known.length} already recorded\n`,
  );
  process.exit(fresh.length ? 1 : 0);
}

console.log(`\n  ${measured.length} photograph(s) measured, none out of step\n`);
process.exit(0);
