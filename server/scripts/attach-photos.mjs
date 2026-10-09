/**
 * Wire the built photography into the catalogue.
 *
 * Points each product's `hero_image` and `images`, and each category's
 * `hero_image`, at the files recorded in the manifest written by
 * build-photos.mjs. Slots with no photograph — the bamboo tea tray, a couple of
 * teaware items — keep the generated SVG artwork from server/imagery.mjs, so a
 * partial photo library is a supported state rather than a broken one.
 *
 * The manifest is the single source of truth for *which files exist*. It is
 * important that this script reads the manifest rather than the curation data:
 * a pick can be edited and fail to download, and the manifest is what reflects
 * reality on disk.
 *
 * Idempotent — safe to re-run after editing photo-selection.mjs.
 *
 *   node server/scripts/attach-photos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, run, all } from '../db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PHOTO_OUT = path.join(ROOT, 'public', 'img', 'photos');
const MANIFEST = path.join(PHOTO_OUT, 'manifest.json');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, 'public', String(rel).replace(/^\//, '')));
}

/** Resolve a manifest path, falling back to null when the file is absent. */
function live(rel) {
  return rel && exists(rel) ? rel : null;
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`No manifest at ${MANIFEST}. Run: npm run photos:build`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

  /* --------------------------------------------------------------- products */
  let productsAttached = 0;
  const productProblems = [];

  for (const [slug, entry] of Object.entries(manifest.products || {})) {
    const product = get('SELECT id FROM products WHERE slug = ?', slug);
    if (!product) {
      productProblems.push(`no product for slug ${slug}`);
      continue;
    }
    const gallery = (entry.gallery || []).filter(live);
    if (!gallery.length) {
      productProblems.push(`${slug}: no live gallery files`);
      continue;
    }
    run('UPDATE products SET hero_image = ?, images = ? WHERE id = ?', gallery[0], JSON.stringify(gallery), product.id);
    productsAttached += 1;
  }

  /* ------------------------------------------------------------- categories */
  let categoriesAttached = 0;
  const categoryProblems = [];

  for (const [slug, rel] of Object.entries(manifest.categories || {})) {
    const category = get('SELECT id FROM categories WHERE slug = ?', slug);
    if (!category) {
      categoryProblems.push(`no category for slug ${slug}`);
      continue;
    }
    const src = live(rel);
    if (!src) {
      categoryProblems.push(`${slug}: missing ${rel}`);
      continue;
    }
    run('UPDATE categories SET hero_image = ? WHERE id = ?', src, category.id);
    categoriesAttached += 1;
  }

  /* ----------------------------------------------------------------- report */
  const productTotal = get('SELECT COUNT(*) AS n FROM products')?.n ?? 0;
  const categoryTotal = get('SELECT COUNT(*) AS n FROM categories')?.n ?? 0;
  const productsWithPhotos = get('SELECT COUNT(*) AS n FROM products WHERE hero_image LIKE ?', '/img/photos/%')?.n ?? 0;
  const categoriesWithPhotos = get('SELECT COUNT(*) AS n FROM categories WHERE hero_image LIKE ?', '/img/photos/%')?.n ?? 0;

  console.log(`\nproducts   ${productsAttached} attached, ${productsWithPhotos}/${productTotal} now use photography`);
  console.log(`categories ${categoriesAttached} attached, ${categoriesWithPhotos}/${categoryTotal} now use photography`);
  console.log(`story      ${(manifest.story || []).length} editorial photo(s) exposed to the templates`);
  console.log(`hero       ${manifest.hero || '(none)'}`);
  console.log(`library    ${manifest.counts?.files ?? 0} file(s) in public/img/photos`);

  const withoutPhotos = all(
    `SELECT slug, hero_image FROM products WHERE hero_image NOT LIKE ? ORDER BY slug`,
    '/img/photos/%',
  );
  if (withoutPhotos.length) {
    console.log(`\nstill using generated artwork (${withoutPhotos.length}):`);
    for (const row of withoutPhotos) console.log(`  ${row.slug}  ->  ${row.hero_image}`);
  }

  const problems = [...productProblems, ...categoryProblems];
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`  - ${p}`);
  }
}

main();
