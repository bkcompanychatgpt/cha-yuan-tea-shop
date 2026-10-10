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

/**
 * The product name is not always the whole subject.
 *
 * `jade-carved-pendant-tiger` is listed as "Carved Nephrite Pendant" and carries
 * its actual subject — a crouching tiger — only in the subtitle. A prompt built
 * from the name alone asks for a generic carved pendant, and a generic carved
 * pendant is what came back: a perfectly good nephrite piece with a dragon on
 * it, which does not match the copy beside it. The subtitle's first clause is
 * the subject, so it goes in front of the form.
 *
 * It is dropped when it only repeats the material, or the prompt ends up saying
 * "Black nephrite" twice — once as the subject and once in the Material line.
 */
function subjectOf(product) {
  const clause = String(product.subtitle || '').split('·')[0].trim();
  if (!clause) return product.name;

  const lower = clause.toLowerCase();
  const material = String(product.cultivar || '').toLowerCase();
  if (material.includes(lower)) return product.name;

  const nameWords = product.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  if (nameWords.some((w) => lower.includes(w))) return product.name;

  return `${product.name} — ${clause}`;
}

/**
 * Products whose prompt needs a disambiguation that the name and subtitle cannot
 * carry.
 *
 * The first attempt at the tiger pendant came back as a dragon. It was a
 * perfectly good carved nephrite pendant on exactly the right deep green ground,
 * which is why it passed every check — the animal carved on it was simply the
 * wrong one. Asked for "a carved pendant with a crouching tiger", a generator
 * reaches for the far more common dragon motif unless the difference is spelled
 * out, and the difference is not something the product name can state: the
 * listing is called "Carved Nephrite Pendant", and the tiger lives in the
 * subtitle alongside the stone colour.
 *
 * So the note says what the piece must be *and* what it must not be. Naming the
 * wrong answer is what makes this work; "a tiger" alone did not.
 */
const PROMPT_NOTES = {
  'jade-carved-pendant-tiger':
    'The carving is a TIGER and must be unmistakably feline: a rounded head, small rounded ears, ' +
    'closely striped flanks, four paws. It is not a dragon — no horns, no long whiskers, no scales, ' +
    'no sinuous serpent body — and it is not a lion or a qilin. If the result reads as any of those, ' +
    'regenerate it.',
};

/** Per-department phrasing that keeps the object itself the subject. */
function describe(product) {
  const kind = product.kind;
  const material = String(product.cultivar || '').trim();
  const unit = String(product.art_unit || '').trim().toLowerCase();
  const name = subjectOf(product);
  const note = PROMPT_NOTES[product.slug] || '';

  if (kind === 'jade') {
    return [
      // The product name already names the form, so the unit is used only to
      // choose how it is framed. "a bangle of moss-in-snow oval bangle" is what
      // happens when both are pasted in.
      `Subject: ${name}, a finished hand-carved piece of Chinese jade.`,
      note,
      `Material: ${material || 'polished nephrite jade'}, showing its true translucency,`,
      'its fine internal clouding and the wet-looking polish of worked stone.',
      unit.includes('bangle')
        ? 'Framed as a complete circle in three-quarter view so the thickness of the ring is clear.'
        : 'Framed in three-quarter view so both the carved face and the edge of the stone are visible.',
    ].filter(Boolean).join(' ');
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
// The real path, not a hard-coded one: printing `_shots/…` while writing
// somewhere else sends the reader to a stale file.
console.log(`\n  ${path.relative(ROOT, OUT_JSON)}   (structured, for tooling)`);
console.log(`  ${path.relative(ROOT, OUT_TXT)}    (readable, for pasting)`);
