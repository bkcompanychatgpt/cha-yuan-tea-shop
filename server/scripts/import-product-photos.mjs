/**
 * Import generated product images.
 *
 * Point it at a folder **or a zip file** of images named after the product slug
 * (the filenames are in docs/image-prompts.json, so nothing has to be typed) and
 * it grades each one to the shop's house style, writes the same derivatives the
 * photographic pipeline writes, records the credit, and flags the product as
 * photographed.
 *
 *   node server/scripts/import-product-photos.mjs <folder | .zip> [--dry-run]
 *   node server/scripts/import-product-photos.mjs <folder | .zip> --list
 *   node server/scripts/import-product-photos.mjs <folder | .zip> --replace [--expect prompts.json]
 *
 * By default only products still showing drawn artwork are touched, so a
 * half-finished archive can never overwrite a real photograph. `--replace` lifts
 * that guard: every product the archive actually contains is rewritten, which is
 * what a deliberate re-shoot of already-photographed pieces needs. `--list` names
 * the files in the archive and stops, so it can be checked before anything moves.
 * `--expect <prompts.json>` reports which requested items the archive left out.
 *
 * Derivatives per product, matching build-photos.mjs:
 *   <slug>-hero.jpg   1200 sq   card, gallery, spotlight
 *   <slug>-thumb.jpg   520 sq   cart, admin tables
 *   <slug>-alt.jpg    1200 sq   gallery second view
 *   <slug>-alt2.jpg   1200 sq   gallery third view
 *
 * With one image supplied, the second and third views are the same file cropped
 * differently, so the gallery does not break. Supply `<slug>-2.jpg` and
 * `<slug>-3.jpg` alongside to use real second and third views instead.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getDb } from '../db.mjs';
import { extractFlat } from './lib/zip.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT_DIR = path.join(ROOT, 'public', 'img', 'photos');
const CREDITS = path.join(ROOT, 'public', 'img', 'credits.json');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const PROMPTS = path.join(ROOT, 'docs', 'image-prompts.json');

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag) => (has(flag) ? argv[argv.indexOf(flag) + 1] : null);
const DRY = has('--dry-run');
const LIST = has('--list');
const REPLACE = has('--replace');
const EXPECT = valueOf('--expect');
const SKIP = new Set(
  (valueOf('--skip') || '').split(',').map((s) => s.trim()).filter(Boolean),
);
const arg = argv.find((a) => !a.startsWith('--') && a !== EXPECT);

if (!arg) {
  console.error(
    'usage: node server/scripts/import-product-photos.mjs <folder | .zip> ' +
    '[--dry-run | --list | --replace] [--expect prompts.json]',
  );
  process.exitCode = 2;
} else {
  /*
   * A zip is unpacked into a temporary directory first, flat, and removed
   * afterwards. Whoever generates the images will hand back an archive, and
   * asking them to unpack it first is a step that only exists to be got wrong.
   */
  const given = path.resolve(arg);
  let SRC_DIR = given;
  let tempDir = null;
  /** Basenames of the images the archive or folder actually holds. */
  let supplied = [];

  if (/\.zip$/i.test(given)) {
    if (!fs.existsSync(given)) {
      console.error(`no such file: ${given}`);
      process.exitCode = 1;
    } else {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cy-import-'));
      const { written, skipped } = extractFlat(fs.readFileSync(given), tempDir, { fs, path });
      SRC_DIR = tempDir;
      supplied = written;
      console.log(`\n  unpacked ${written.length} image(s) from ${path.basename(given)}`);
      if (skipped.length) console.log(`  ignored ${skipped.length} non-image entr(ies)`);
      if (!written.length) {
        console.error('  the archive held no images — nothing to import');
        process.exitCode = 1;
      }
    }
  } else if (fs.existsSync(given)) {
    supplied = fs.readdirSync(given).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  }

  /*
   * `--list` names what arrived and stops before the database is opened, so an
   * archive can be checked against the prompt list without moving anything.
   */
  if (LIST) {
    for (const name of supplied.slice().sort()) console.log(`  ${name}`);
    console.log(`\n  ${supplied.length} image(s) in ${given}`);
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(0);
  }

  const SIZES = {
    hero: [1200, 1200],
    thumb: [520, 520],
  };

  /**
   * The house grade, matching the `product` grade in build-photos.mjs: a slight
   * warm lift, a restrained ink-green wash, and a vignette so a white studio
   * background does not punch a hole in the dark grid.
   */
  async function grade(src, width, height) {
    const img = sharp(src).rotate();
    const meta = await img.metadata();
    const size = Math.min(meta.width || width, meta.height || height);
    const left = Math.max(0, Math.round((((meta.width || size) - size) / 2)));
    const top = Math.max(0, Math.round((((meta.height || size) - size) / 2)));

    return img
      .extract({ left, top, width: size, height: size })
      .resize(width, height, { fit: 'cover' })
      .modulate({ brightness: 0.97, saturation: 0.94 })
      .tint({ r: 246, g: 248, b: 240 })
      .composite([{
        input: Buffer.from(
          `<svg width="${width}" height="${height}">` +
          `<defs><radialGradient id="v" cx="50%" cy="46%" r="72%">` +
          `<stop offset="55%" stop-color="#06100b" stop-opacity="0"/>` +
          `<stop offset="100%" stop-color="#06100b" stop-opacity="0.5"/>` +
          `</radialGradient></defs>` +
          `<rect width="${width}" height="${height}" fill="url(#v)"/>` +
          `<rect width="${width}" height="${height}" fill="#0d2016" fill-opacity="0.10"/>` +
          `</svg>`,
        ),
        blend: 'over',
      }])
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  }

  function findSource(slug, suffix = '') {
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      const p = path.join(SRC_DIR, `${slug}${suffix}.${ext}`);
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  const prompts = fs.existsSync(PROMPTS)
    ? JSON.parse(fs.readFileSync(PROMPTS, 'utf8')).prompts || []
    : [];
  const known = new Map(prompts.map((p) => [p.slug, p]));

  const db = getDb();
  /*
   * Default: only products still showing drawn artwork. A generated image is
   * worth having where there is nothing better, but it must never quietly
   * displace a real photograph because an archive happened to contain the slug.
   * `--replace` is the operator saying they meant it.
   */
  const products = db.prepare(
    `SELECT p.id, p.slug, p.name FROM products p
      WHERE p.is_active = 1${REPLACE ? '' : " AND p.image_kind = 'illustration'"}`,
  ).all();

  /*
   * Which requested items the archive left out. Without `--expect` the only
   * honest answer is "every product that is still waiting", which is true but
   * useless once most of the catalogue has been photographed.
   */
  const expected = EXPECT && fs.existsSync(path.resolve(EXPECT))
    ? (JSON.parse(fs.readFileSync(path.resolve(EXPECT), 'utf8')).prompts || []).map((p) => p.slug)
    : null;

  const credits = fs.existsSync(CREDITS)
    ? JSON.parse(fs.readFileSync(CREDITS, 'utf8'))
    : { credits: {} };
  credits.credits = credits.credits || {};

  let imported = 0;
  const missing = [];
  /** Slugs this run actually rewrote, which is what may be recorded as generated. */
  const written = [];

  for (const product of products) {
    if (SKIP.has(product.slug)) {
      console.log(`  skipping      ${product.slug}  (--skip)`);
      continue;
    }
    const primary = findSource(product.slug);
    if (!primary) {
      /*
       * Under `--replace` every product in the shop is a candidate, so "no file"
       * means "not part of this job" rather than "missing" — unless an expected
       * list says it was asked for.
       */
      if (expected ? expected.includes(product.slug) : !REPLACE) missing.push(product.slug);
      continue;
    }
    const prompt = known.get(product.slug);

    if (DRY) {
      console.log(`  would import  ${product.slug}  <- ${path.basename(primary)}`);
      imported += 1;
      continue;
    }

    const hero = await grade(primary, ...SIZES.hero);
    const thumb = await grade(primary, ...SIZES.thumb);
    fs.writeFileSync(path.join(OUT_DIR, `${product.slug}-hero.jpg`), hero);
    fs.writeFileSync(path.join(OUT_DIR, `${product.slug}-thumb.jpg`), thumb);

    // Second and third views: real ones if supplied, otherwise framed differently
    // from the same source so the gallery still has three images.
    const second = findSource(product.slug, '-2');
    const third = findSource(product.slug, '-3');
    const alt = await grade(second || primary, ...SIZES.hero);
    const alt2 = await grade(third || primary, ...SIZES.hero);
    fs.writeFileSync(path.join(OUT_DIR, `${product.slug}-alt.jpg`), alt);
    fs.writeFileSync(path.join(OUT_DIR, `${product.slug}-alt2.jpg`), alt2);

    credits.credits[product.slug] = {
      source: '',
      title: prompt ? `Generated illustration of ${product.name}` : `Generated image of ${product.name}`,
      author: 'Generated for Cha Yuan',
      licence: 'Own work, generated',
      licenceUrl: '',
      generated: true,
    };

    db.prepare(
      "UPDATE products SET hero_image = ?, images = ?, image_kind = 'illustration' WHERE id = ?",
    ).run(
      `/img/photos/${product.slug}-hero.jpg`,
      JSON.stringify([
        `/img/photos/${product.slug}-hero.jpg`,
        `/img/photos/${product.slug}-alt.jpg`,
        `/img/photos/${product.slug}-alt2.jpg`,
      ]),
      product.id,
    );

    imported += 1;
    written.push(product.slug);
  }

  if (!DRY) {
    fs.writeFileSync(CREDITS, `${JSON.stringify(credits, null, 2)}\n`, 'utf8');

    /*
     * Generated images stay marked `illustration`, and that is deliberate.
     *
     * A generated photograph is not a photograph of the goods either — it is a
     * very good drawing of them — so the disclosure has to survive. Two things
     * make that work: the slug goes into the manifest so a reseed does not throw
     * the image away, and it also goes into generated.json, which the seed reads
     * to put the kind back to `illustration` after the manifest has marked
     * everything it covers as `photo`.
     */
    const GENERATED = path.join(ROOT, 'public', 'img', 'generated.json');
    const generated = fs.existsSync(GENERATED)
      ? JSON.parse(fs.readFileSync(GENERATED, 'utf8'))
      : { slugs: [] };
    const slugs = new Set(generated.slugs || []);

    if (fs.existsSync(MANIFEST)) {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
      manifest.products = manifest.products || {};
      /*
       * Only what this run rewrote.
       *
       * Looping the candidate list instead means `--replace` sweeps the whole
       * shop: every product whose derivatives already exist on disk gets written
       * into generated.json, so the next reseed relabels the tea department —
       * which has real photographs — as drawn artwork. The candidate list is
       * "what may be touched"; this list is "what was touched".
       */
      for (const slug of written) {
        const files = ['hero', 'alt', 'alt2']
          .map((s) => `/img/photos/${slug}-${s}.jpg`)
          .filter((rel) => fs.existsSync(path.join(ROOT, 'public', rel.replace(/^\//, ''))));
        if (files.length) {
          manifest.products[slug] = { gallery: files };
          slugs.add(slug);
        }
      }
      fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    }

    fs.writeFileSync(GENERATED, `${JSON.stringify({ slugs: [...slugs].sort() }, null, 2)}\n`, 'utf8');
  }

  if (REPLACE) {
    console.log(
      `\n  ${DRY ? 'would import' : 'imported'} ${imported} product(s); ` +
      `${products.length - imported} in the shop were not in the source`,
    );
  } else {
    console.log(`\n  ${DRY ? 'would import' : 'imported'} ${imported} of ${products.length} illustrated products`);
  }
  if (missing.length) {
    // The label is the path the operator gave, not the temporary unzip directory,
    // which would be meaningless and is deleted moments later.
    console.log(`  ${missing.length} still without a file in ${given}:`);
    for (const slug of missing.slice(0, 12)) console.log(`    ${slug}`);
    if (missing.length > 12) console.log(`    … and ${missing.length - 12} more`);
  }
  if (!DRY && imported) {
    console.log('\n  Restart the server to reseed, then check with:');
    console.log('    node server/scripts/check-catalogue.mjs');
  }

  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
}
