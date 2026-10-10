/**
 * Seed the database from server/catalog-data.mjs.
 *
 *   node server/seed.mjs            # seed only if empty
 *   node server/seed.mjs --force    # wipe catalogue and reseed
 *
 * Orders are never touched by --force; only the catalogue is rebuilt.
 */
import { getDb, run, get, all, transaction, setSetting } from './db.mjs';
import { CATEGORIES, PRODUCTS, EDITORIAL } from './catalog-data.mjs';
import { variantSku, findSkuProblems } from './sku.mjs';
import fs from 'node:fs';
import path from 'node:path';
import config from './config.mjs';
const force = process.argv.includes('--force');

function imagePath(kind, slug) {
  return `/img/${kind}/${slug}.svg`;
}

/**
 * Editorial copy plus the photo manifest produced by build-photos.mjs.
 *
 * The manifest is merged here rather than written into the database by
 * attach-photos.mjs, because this function rewrites the stored editorial copy on
 * every boot — anything attach-photos wrote would be wiped the next time the
 * server started.
 */
function editorialWithPhotos() {
  const payload = { ...EDITORIAL };
  const manifestFile = path.join(config.rootDir, 'public', 'img', 'photos', 'manifest.json');
  try {
    if (fs.existsSync(manifestFile)) {
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      payload.photos = {
        hero: manifest.hero,
        story: manifest.story || [],
        categories: manifest.categories || {},
      };
      if (Array.isArray(manifest.story) && manifest.story.length) {
        payload.storyPhotos = manifest.story;
      }
    }
  } catch {
    // A missing or unreadable manifest just means no photography yet.
  }
  return payload;
}

function seed({ always = false } = {}) {
  const db = getDb();

  const existing = get('SELECT COUNT(*) AS n FROM products');

  // Editorial copy (ticker, FAQ, testimonials, guides, spotlights, gift banner)
  // is content the shop never writes to, so it is refreshed on every boot.
  // Only the catalogue itself is expensive and therefore left alone once built.
  setSetting('editorial', JSON.stringify(editorialWithPhotos()));

  /*
   * The catalogue is rebuilt on every boot from catalog-data.mjs.
   *
   * It used to be seeded once and then left alone, which broke a deploy in a way
   * that was invisible from the outside: the code shipped 49 products and 276
   * photographs, and the running site kept serving the 32 products and generated
   * artwork it had been seeded with on its first boot. Nothing on the dashboard
   * said so.
   *
   * Variants carry the prices and the stock, so they are rebuilt with the
   * products. That resets stock counts to the figures in the catalogue file, and
   * it renumbers variant ids — which is harmless, because a basket is validated
   * against the database on every price request and drops lines that no longer
   * exist. Order history is untouched: order_items stores its own snapshot of
   * each product name, variant and price.
   */
  let productCount = 0;
  let variantCount = 0;

  transaction(() => {
    // Catalogue tables only. Orders, payment attempts and webhook events are the
    // shop's own records and must survive any number of deploys.
    db.exec('DELETE FROM variants');
    db.exec('DELETE FROM products');
    db.exec('DELETE FROM categories');

    const catIds = new Map();
    CATEGORIES.forEach((c, i) => {
      run(
        `INSERT INTO categories (slug, name, kind, tagline, description, hero_image, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(slug) DO UPDATE SET
           name = excluded.name, kind = excluded.kind, tagline = excluded.tagline,
           description = excluded.description, hero_image = excluded.hero_image,
           sort_order = excluded.sort_order`,
        c.slug,
        c.name,
        c.kind,
        c.tagline,
        c.description,
        imagePath('category', c.slug),
        (i + 1) * 10,
      );
      const row = get('SELECT id FROM categories WHERE slug = ?', c.slug);
      catIds.set(c.slug, row.id);
    });

    PRODUCTS.forEach((p, index) => {
      const categoryId = catIds.get(p.category);
      if (!categoryId) throw new Error(`Product ${p.slug} references unknown category ${p.category}`);

      const hero = imagePath('product', p.slug);
      // A product with no photograph gets three deliberately composed generated
      // views rather than a main image plus leftover placeholder files, so its
      // gallery reads as illustrated rather than unfinished. attach-photos.mjs
      // replaces these when real photography exists.
      const images = JSON.stringify([
        hero,
        `/img/product/${p.slug}/layout.svg`,
        `/img/product/${p.slug}/profile.svg`,
      ]);

      run(
        `INSERT INTO products (
           slug, sku, name, subtitle, category_id, tea_family, origin, altitude, cultivar,
           harvest, oxidation, roast, caffeine, liquor, seal, art_unit, short_description, description,
           tasting_notes, brewing, images, hero_image, badges, rating, review_count,
           is_featured, is_new, is_active, sort_order
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(slug) DO UPDATE SET
           name = excluded.name, subtitle = excluded.subtitle, category_id = excluded.category_id,
           tea_family = excluded.tea_family, origin = excluded.origin, altitude = excluded.altitude,
           cultivar = excluded.cultivar, harvest = excluded.harvest, oxidation = excluded.oxidation,
           roast = excluded.roast, caffeine = excluded.caffeine, liquor = excluded.liquor,
           seal = excluded.seal, art_unit = excluded.art_unit,
           short_description = excluded.short_description, description = excluded.description,
           tasting_notes = excluded.tasting_notes, brewing = excluded.brewing,
           images = excluded.images, hero_image = excluded.hero_image, badges = excluded.badges,
           rating = excluded.rating, review_count = excluded.review_count,
           is_featured = excluded.is_featured, is_new = excluded.is_new,
           sort_order = excluded.sort_order`,
        p.slug,
        p.sku,
        p.name,
        p.subtitle || '',
        categoryId,
        p.family || '',
        p.origin || '',
        p.altitude || '',
        p.cultivar || '',
        p.harvest || '',
        p.oxidation || '',
        p.roast || '',
        p.caffeine || '',
        p.liquor || '',
        p.seal || '',
        p.artUnit || '',
        p.short_description || '',
        p.description || '',
        JSON.stringify(p.tasting_notes || []),
        JSON.stringify(p.brewing || {}),
        images,
        hero,
        JSON.stringify(p.badges || []),
        p.rating ?? 0,
        p.review_count ?? 0,
        p.is_featured ? 1 : 0,
        p.is_new ? 1 : 0,
        1,
        (index + 1) * 10,
      );

      const product = get('SELECT id FROM products WHERE slug = ?', p.slug);
      productCount += 1;

      // Replace this product's variants so re-seeding is idempotent.
      run('DELETE FROM variants WHERE product_id = ?', product.id);

      const variants = p.variants?.length ? p.variants : [{ label: '50 g', grams: 50, price: 30, stock: 10, default: true }];
      const hasDefault = variants.some((v) => v.default);
      variants.forEach((v, vi) => {
        run(
          `INSERT INTO variants (product_id, label, weight_grams, price_cents, compare_cents, stock, sku_suffix, is_default, sort_order)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          product.id,
          v.label,
          v.grams ?? 0,
          Math.round(Number(v.price) * 100),
          v.compare ? Math.round(Number(v.compare) * 100) : null,
          v.stock ?? 0,
          v.sku || '',
          (!hasDefault && vi === 0) || v.default ? 1 : 0,
          (vi + 1) * 10,
        );
        variantCount += 1;
      });
    });

    setSetting('editorial', JSON.stringify(editorialWithPhotos()));
    setSetting('seeded_at', new Date().toISOString());
    setSetting('catalogue_version', '1');
  });

  // Point products and categories at their photographs.
  const photos = applyPhotos();

  assertUniqueSkus();

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${productCount} products, ${variantCount} variants`
    + ` — ${photos.products} with photography, ${photos.illustrated} illustrated, ${photos.categories} category tiles.`,
  );
  return { skipped: false, products: productCount, variants: variantCount, photos };
}

/**
 * Every variant SKU must identify exactly one thing.
 *
 * This runs after seeding and throws rather than warning, because a duplicate
 * SKU is silent otherwise: the catalogue looks fine, and the first person to
 * notice is whoever is packing the order. It previously went unnoticed until a
 * design review of the confirmation page showed three different pearl strands
 * sharing one code.
 */
function assertUniqueSkus() {
  const rows = all(
    `SELECT p.sku AS product_sku, p.name AS product_name, v.label AS variant_label
       FROM variants v JOIN products p ON p.id = v.product_id
      ORDER BY p.id, v.sort_order, v.id`,
  ).map((r) => ({
    sku: variantSku(r.product_sku, r.variant_label),
    productSku: r.product_sku,
    productName: r.product_name,
    label: r.variant_label,
  }));

  const { duplicates, empty } = findSkuProblems(rows);
  if (!duplicates.size && !empty.length) return;

  const lines = [];
  for (const [sku, list] of duplicates) {
    lines.push(`  ${sku} is shared by ${list.length} variants:`);
    for (const r of list) lines.push(`    - ${r.productName} / ${r.label}`);
  }
  for (const r of empty) lines.push(`  (blank SKU) ${r.productName} / ${r.label}`);

  throw new Error(
    `Variant SKUs are not unique — refusing to seed a catalogue that cannot be fulfilled:\n${lines.join('\n')}`,
  );
}

/**
 * Apply the photograph manifest to the catalogue.
 *
 * `public/img/photos/manifest.json` is written by build-photos.mjs and lists the
 * image files that actually exist. Wiring it in here — rather than in a script an
 * operator has to remember to run — is what makes a deploy self-consistent: the
 * code, the images and the database all come from the same commit.
 *
 * The previous arrangement had `attach-photos.mjs` run by hand against the local
 * database, which left the deployed site serving the generated SVG artwork while
 * the photographs sat unused on disk. It looked like the images were missing.
 */
function applyPhotos() {
  const manifestFile = path.join(config.rootDir, 'public', 'img', 'photos', 'manifest.json');
  const result = { products: 0, categories: 0, story: 0, illustrated: 0, inherited: 0, galleries: 0 };

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch {
    // No manifest means no photography yet. Every product then stands on its
    // generated artwork, and must be labelled as such rather than left looking
    // like a photograph that failed to load.
    const marked = run("UPDATE products SET image_kind = 'illustration' WHERE hero_image = '' OR hero_image LIKE '/img/product/%'");
    result.illustrated = Number(marked?.changes || 0);
    result.galleries = giveIllustratedProductsAGallery();
    return result;
  }

  const exists = (rel) => {
    try {
      return fs.existsSync(path.join(config.rootDir, 'public', String(rel).replace(/^\//, '')));
    } catch {
      return false;
    }
  };

  for (const [slug, entry] of Object.entries(manifest.products || {})) {
    const gallery = (entry.gallery || []).filter(exists);
    if (!gallery.length) continue;
    const product = get('SELECT id FROM products WHERE slug = ?', slug);
    if (!product) continue;
    run(
      "UPDATE products SET hero_image = ?, images = ?, image_kind = 'photo' WHERE id = ?",
      gallery[0],
      JSON.stringify(gallery),
      product.id,
    );
    result.products += 1;
  }

  for (const [slug, rel] of Object.entries(manifest.categories || {})) {
    if (!exists(rel)) continue;
    const category = get('SELECT id FROM categories WHERE slug = ?', slug);
    if (!category) continue;
    run('UPDATE categories SET hero_image = ? WHERE id = ?', rel, category.id);
    result.categories += 1;
  }

  // Generated tea lots inherit their base tea's photograph.
  //
  // A photograph of Longjing is a photograph of Longjing whichever picking grade
  // is in the tin, so the lots of one tea share that tea's photography rather
  // than being drawn. Jade and jewellery have no photograph to inherit, so they
  // keep their artwork and carry the illustration disclosure.
  const baseOf = new Map(PRODUCTS.map((p) => [p.slug, p.photoBase || '']));
  const withPhotos = all("SELECT id, slug, hero_image, images FROM products WHERE image_kind = 'photo' AND hero_image <> ''");
  const photoFor = new Map(withPhotos.map((p) => [p.slug, { hero: p.hero_image, images: p.images }]));

  for (const [slug, baseSlug] of baseOf) {
    if (!baseSlug) continue;
    const source = photoFor.get(baseSlug);
    if (!source) continue;
    const lot = get('SELECT id FROM products WHERE slug = ?', slug);
    if (!lot) continue;
    run(
      "UPDATE products SET hero_image = ?, images = ?, image_kind = 'photo' WHERE id = ?",
      source.hero,
      source.images,
      lot.id,
    );
    result.products += 1;
    result.inherited = (result.inherited || 0) + 1;
  }

  // Anything still without a photograph keeps its generated artwork, and has to
  // say so on the storefront.
  const rest = run("UPDATE products SET image_kind = 'illustration' WHERE hero_image = '' OR hero_image LIKE '/img/product/%'");
  result.illustrated = Number(rest?.changes || 0);
  result.galleries = giveIllustratedProductsAGallery();

  result.story = (manifest.story || []).length;
  return result;
}

/**
 * A gallery for every illustrated product.
 *
 * A product with no photograph still needs three images on its page, or the
 * gallery renders empty and the thumbnail strip collapses. These point at the
 * generated detail views, which carry the same illustration notice as the main
 * artwork, so nothing in the strip can be mistaken for photography.
 *
 * Products that do have photography are left alone: their real gallery came from
 * the manifest, and mixing artwork into it would be worse than having none.
 */
function giveIllustratedProductsAGallery() {
  const rows = all("SELECT id, slug FROM products WHERE image_kind = 'illustration'");
  for (const row of rows) {
    const gallery = ['vessel', 'layout', 'profile'].map((style) => `/img/product/${row.slug}/${style}.svg`);
    run(
      'UPDATE products SET hero_image = ?, images = ? WHERE id = ?',
      `/img/product/${row.slug}.svg`,
      JSON.stringify(gallery),
      row.id,
    );
  }
  return rows.length;
}

// Run when invoked directly.
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain || process.argv[1]?.endsWith('seed.mjs')) {
  seed();
}

export { seed };
