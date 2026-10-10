/**
 * Generate image prompts for every product that has no photograph.
 *
 * The shop's own artwork is a drawn silhouette, which is honest but plainly not a
 * photograph. A generated image can be far closer to the real thing, and — unlike
 * a museum object or a stock photo of somebody else's stock — it depicts the
 * piece this listing actually describes, so there is nothing to misdescribe.
 *
 * One file per product, named by slug, so the importer can match them without
 * anybody typing a filename. The house style block is shared verbatim so fifty
 * pieces generated one at a time still look like one shop.
 *
 *   node server/scripts/make-image-prompts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from '../db.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
// Written into docs/ rather than the gitignored _shots/, because these are the
// deliverable: they have to survive outside this working copy.
const OUT_DIR = path.join(ROOT, 'docs');

/**
 * The look, applied to every prompt.
 *
 * Matched to the storefront: near-black ink-green ground, one soft key light
 * from the upper left, a cool rim light, and nothing else in the frame. The
 * constraints at the end matter as much as the description — generators like to
 * add text, hands, a second object and a bright white studio backdrop, all of
 * which would break a grid of these.
 */
const STYLE = [
  'Photorealistic product photograph for a luxury Chinese tea and jewellery shop.',
  'A single object, centred, filling about 70% of the frame, shot square (1:1).',
  'Background: deep ink-green, almost black, smooth and uncluttered, with a soft radial falloff.',
  'Lighting: one large soft key light from the upper left, a subtle cool rim light along the right edge,',
  'gentle contact shadow beneath the object. Shallow depth of field, sharp on the object, background falling away.',
  'Colour: muted and natural, no saturation boost, no colour cast.',
  'No text, no lettering, no watermark, no logo, no brand marks, no price tag, no ruler,',
  'no hands, no people, no prop boxes, no packaging, no second object, no white studio backdrop.',
].join(' ');

/** Per-department phrasing that keeps the object itself the subject. */
function describe(product) {
  const kind = product.kind;
  const material = String(product.cultivar || '').trim();
  const unit = String(product.art_unit || '').trim().toLowerCase();
  const name = product.name;

  if (kind === 'jade') {
    return [
      // The product name already names the form, so the unit is used only to
      // choose how it is framed. "a bangle of moss-in-snow oval bangle" is what
      // happens when both are pasted in.
      `Subject: ${name}, a finished hand-carved piece of Chinese jade.`,
      `Material: ${material || 'polished nephrite jade'}, showing its true translucency,`,
      'its fine internal clouding and the wet-looking polish of worked stone.',
      unit.includes('bangle')
        ? 'Framed as a complete circle in three-quarter view so the thickness of the ring is clear.'
        : 'Framed in three-quarter view so both the carved face and the edge of the stone are visible.',
    ].join(' ');
  }
  if (kind === 'jewellery') {
    return [
      `Subject: ${name}, a finished hand-made piece of fine jewellery.`,
      `Material: ${material || '18k gold and set stones'}, with the metal showing a soft worn polish`,
      'rather than a mirror finish, and the stones lit so their colour reads clearly.',
      'Framed in three-quarter view, the object alone, standing or laid flat on the surface.',
    ].join(' ');
  }
  return `Subject: ${name}. ${product.subtitle || ''}`;
}

const db = getDb();
/*
 * Which products to write prompts for.
 *
 *   node server/scripts/make-image-prompts.mjs
 *     every product whose image is drawn or rendered — the main set.
 *
 *   node server/scripts/make-image-prompts.mjs --departments jade,jewellery --all --out docs/prompts-jade-jewellery-photos
 *     every jade and jewellery product, including the ones already carrying a
 *     photograph. Those are the handful whose original Commons photographs have
 *     white or grey studio backgrounds sitting in a grid of dark renders.
 */
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const departments = flag('--departments');
const includePhotographed = args.includes('--all');
// Only the products that already have a photograph. Used to re-render a handful
// whose originals do not match the rest of the grid.
const onlyPhotographed = args.includes('--only-photographed');
const outBase = flag('--out') || path.join(ROOT, 'docs', 'image-prompts');

const kindFilter = departments
  ? departments.split(',').map((s) => s.trim()).filter(Boolean)
  : ['jade', 'jewellery', 'tea', 'teaware', 'gift'];

const imageKindFilter = onlyPhotographed
  ? "p.image_kind = 'photo'"
  : includePhotographed ? '1 = 1' : "p.image_kind = 'illustration'";

const rows = db.prepare(
  `SELECT p.slug, p.name, p.subtitle, p.cultivar, p.art_unit, p.image_kind, c.kind
     FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = 1 AND (${imageKindFilter})
    ORDER BY c.kind, p.name`,
).all().filter((p) => kindFilter.includes(p.kind));

const out = { style: STYLE, generatedAt: new Date().toISOString(), prompts: [] };

for (const product of rows) {
  const prompt = `${describe(product)} ${STYLE}`;
  out.prompts.push({
    slug: product.slug,
    filename: `${product.slug}.jpg`,
    name: product.name,
    department: product.kind,
    prompt,
  });
}

fs.mkdirSync(path.dirname(outBase), { recursive: true });
fs.writeFileSync(`${outBase}.json`, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
const OUT_JSON = `${outBase}.json`;
const OUT_TXT = `${outBase}.txt`;
void OUT_JSON;

/* A readable copy, because pasting from JSON is miserable. */
const lines = [
  `Image prompts — ${out.prompts.length} products`,
  '',
  'Generate one square (1:1) image per prompt, save each as the filename given,',
  'and put them all in one folder. Then:',
  '',
  '  node server/scripts/import-product-photos.mjs <folder>',
  '',
  'The house style is repeated in every prompt so the set looks consistent.',
  '',
  '='.repeat(78),
  '',
];
for (const p of out.prompts) {
  lines.push(`--- ${p.name}  [${p.department}]`);
  lines.push(`filename: ${p.filename}`);
  lines.push('');
  lines.push(p.prompt);
  lines.push('');
}
fs.writeFileSync(OUT_TXT, lines.join('\n'), 'utf8');

const byDept = {};
for (const p of out.prompts) byDept[p.department] = (byDept[p.department] || 0) + 1;
console.log(`${out.prompts.length} prompts written`);
for (const [d, n] of Object.entries(byDept)) console.log(`  ${d.padEnd(12)} ${n}`);
console.log('\n  _shots/image-prompts.json   (structured, for tooling)');
console.log('  _shots/image-prompts.txt    (readable, for pasting)');
