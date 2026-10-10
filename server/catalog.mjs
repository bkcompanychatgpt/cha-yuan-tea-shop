/**
 * Read-side catalogue queries. Everything the storefront and admin need to
 * render products, categories and filters.
 */
import { all, get, getSetting } from './db.mjs';

const productColumns = `
  p.id, p.slug, p.sku, p.name, p.subtitle, p.category_id, p.tea_family, p.origin, p.altitude,
  p.cultivar, p.harvest, p.oxidation, p.roast, p.caffeine, p.liquor, p.seal,
  p.short_description, p.description, p.tasting_notes, p.brewing, p.images, p.hero_image,
  p.image_kind, p.art_unit, p.badges, p.rating, p.review_count, p.is_featured, p.is_new, p.sort_order,
  c.slug AS category_slug, c.name AS category_name, c.kind AS category_kind
`;

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function hydrateProduct(row) {
  if (!row) return null;
  return {
    ...row,
    tasting_notes: parseJson(row.tasting_notes, []),
    brewing: parseJson(row.brewing, {}),
    images: parseJson(row.images, []),
    badges: parseJson(row.badges, []),
    is_featured: !!row.is_featured,
    is_new: !!row.is_new,
    // True when the image the customer is looking at is house artwork rather
    // than a photograph of the goods. Every surface that shows an image has to
    // check this, so it is computed once here instead of in each view.
    is_illustrated: row.image_kind === 'illustration',
  };
}

function withVariants(product) {
  if (!product) return null;
  const variants = all(
    'SELECT id, label, weight_grams, price_cents, compare_cents, stock, is_default FROM variants WHERE product_id = ? ORDER BY sort_order, id',
    product.id,
  );
  const prices = variants.map((v) => v.price_cents);
  return {
    ...product,
    variants,
    priceFrom: prices.length ? Math.min(...prices) : 0,
    priceTo: prices.length ? Math.max(...prices) : 0,
    inStock: variants.some((v) => v.stock > 0),
    defaultVariant: variants.find((v) => v.is_default) || variants[0] || null,
  };
}

export function listCategories({ includeEmpty = false } = {}) {
  const rows = all(`
    SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
      FROM categories c
     WHERE c.is_active = 1
     ORDER BY c.sort_order, c.name
  `);
  return includeEmpty ? rows : rows.filter((c) => c.product_count > 0);
}

export function getCategory(slug) {
  return get('SELECT * FROM categories WHERE slug = ? AND is_active = 1', String(slug));
}

export function listTeaFamilies() {
  return all(`
    SELECT p.tea_family AS family, COUNT(*) AS count
      FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = 1 AND p.tea_family <> ''
     GROUP BY p.tea_family
     ORDER BY count DESC, family
  `);
}

export function listOrigins() {
  return all(`
    SELECT origin, COUNT(*) AS count FROM products
     WHERE is_active = 1 AND origin <> '' AND origin <> '—'
     GROUP BY origin ORDER BY origin
  `);
}

/**
 * Query products with filters used by the shop page.
 * @param {{category?:string, family?:string, q?:string, featured?:boolean, isNew?:boolean,
 *          inStock?:boolean, sort?:string, limit?:number, offset?:number}} opts
 */
export function listProducts(opts = {}) {
  const {
    category = '',
    family = '',
    q = '',
    featured = false,
    isNew = false,
    inStock = false,
    sort = 'featured',
    limit = 60,
    offset = 0,
    ids = null,
    kinds = null,
  } = opts;

  const where = ['p.is_active = 1'];
  const params = [];

  if (category) {
    where.push('(c.slug = ? OR c.kind = ?)');
    params.push(category, category);
  }
  // Explicit kind filter, for the department landing pages. Distinct from
  // `category` because department "tea" means the eight tea categories only —
  // not teaware and gift sets, which are their own group.
  if (Array.isArray(kinds) && kinds.length) {
    where.push(`c.kind IN (${kinds.map(() => '?').join(',')})`);
    params.push(...kinds);
  }
  if (family) {
    where.push('p.tea_family = ?');
    params.push(family);
  }
  if (q) {
    where.push('(p.name LIKE ? OR p.subtitle LIKE ? OR p.short_description LIKE ? OR p.origin LIKE ? OR p.tea_family LIKE ? OR p.tasting_notes LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }
  if (featured) where.push('p.is_featured = 1');
  if (isNew) where.push('p.is_new = 1');
  if (Array.isArray(ids) && ids.length) {
    where.push(`p.id IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
  }
  if (inStock) {
    where.push('EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.stock > 0)');
  }

  const orderBy = {
    featured: 'p.is_featured DESC, p.sort_order ASC',
    newest: 'p.is_new DESC, p.id DESC',
    'price-asc': '(SELECT MIN(price_cents) FROM variants v WHERE v.product_id = p.id) ASC',
    'price-desc': '(SELECT MAX(price_cents) FROM variants v WHERE v.product_id = p.id) DESC',
    rating: 'p.rating DESC, p.review_count DESC',
    name: 'p.name ASC',
  }[sort] || 'p.is_featured DESC, p.sort_order ASC';

  const clause = where.join(' AND ');
  const rows = all(
    `SELECT ${productColumns}
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE ${clause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    ...params,
    Math.min(200, Number(limit) || 60),
    Number(offset) || 0,
  );

  const totalRow = get(
    `SELECT COUNT(*) AS n FROM products p JOIN categories c ON c.id = p.category_id WHERE ${clause}`,
    ...params,
  );

  return { products: rows.map(hydrateProduct).map(withVariants), total: totalRow?.n ?? 0 };
}

export function getProduct(slug) {
  const row = get(
    `SELECT ${productColumns} FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ? AND p.is_active = 1`,
    String(slug),
  );
  return withVariants(hydrateProduct(row));
}

/**
 * The three departments the shop is organised around, and the small group that
 * sits outside them.
 *
 * A flat row of twelve category chips made the shop page read as a wall of
 * filters. The owner's instruction was that the main split is Tea / Jade /
 * Jewellery, and that tea's own divisions belong one level down: you choose Tea
 * first, then choose the kind of tea. This is that structure, in one place, so
 * the shop page, the homepage and the breadcrumbs cannot disagree about it.
 */
export const DEPARTMENTS = [
  {
    slug: 'tea',
    name: 'Tea',
    kinds: ['tea'],
    eyebrow: 'Leaf',
    blurb: 'Single-origin lots from Fujian, Yunnan, Anhui, Zhejiang and Guangdong, dated by harvest.',
  },
  {
    slug: 'jade',
    name: 'Jade & Stone',
    kinds: ['jade'],
    eyebrow: 'Stone',
    blurb: 'Nephrite and jadeite, hand-carved and polished until the stone gives up its depth.',
  },
  {
    slug: 'jewellery',
    name: 'Fine Jewellery',
    kinds: ['jewellery'],
    eyebrow: 'Metal',
    blurb: 'Gold, pearls and set stones, worked by hand rather than cast.',
  },
];

/** Teaware and gift sets: real departments, but not among the three. */
export const ALSO = { slug: 'also', name: 'Teaware & gifts', kinds: ['teaware', 'gift'] };

/**
 * Department cards, ready to render.
 *
 * Each department is represented by its largest category's photograph, because
 * a department has no image of its own — the cover is borrowed from the category
 * with the most in it, which is the one most likely to have good photography.
 *
 * Shared by the homepage and the shop chooser so the two cannot disagree about
 * what the departments are called, how many pieces are in them, or which picture
 * stands for each.
 */
export function departmentCards() {
  const categories = listCategories();
  const toCard = (dept) => {
    const members = categories.filter((c) => dept.kinds.includes(c.kind));
    if (!members.length) return null;
    const hero = members.reduce((a, b) => (b.product_count > a.product_count ? b : a));
    return {
      slug: dept.slug,
      name: dept.name,
      eyebrow: dept.eyebrow,
      blurb: dept.blurb,
      href: `/shop?department=${dept.slug}`,
      count: members.reduce((n, c) => n + c.product_count, 0),
      hero,
      members,
    };
  };
  return {
    departments: DEPARTMENTS.map(toCard).filter(Boolean),
    also: toCard(ALSO),
  };
}

export function getDepartment(slug) {
  const key = String(slug || '');
  return DEPARTMENTS.find((d) => d.slug === key) || (key === ALSO.slug ? ALSO : null);
}

/**
 * Product counts per department, for the chooser cards.
 *
 * Counted rather than hard-coded, so the numbers on the landing page cannot go
 * stale when the catalogue changes.
 */
export function departmentCounts() {
  const rows = all(
    `SELECT c.kind AS kind, COUNT(*) AS n
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
      GROUP BY c.kind`,
  );
  const byKind = Object.fromEntries(rows.map((r) => [r.kind, r.n]));
  const sum = (kinds) => kinds.reduce((total, k) => total + (byKind[k] || 0), 0);
  return {
    ...Object.fromEntries(DEPARTMENTS.map((d) => [d.slug, sum(d.kinds)])),
    [ALSO.slug]: sum(ALSO.kinds),
    all: rows.reduce((total, r) => total + r.n, 0),
  };
}

export function getProductById(id) {
  const row = get(
    `SELECT ${productColumns} FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
    Number(id),
  );
  return withVariants(hydrateProduct(row));
}

export function getVariant(variantId) {
  const row = get(
    `SELECT v.*, p.slug AS product_slug, p.name AS product_name, p.hero_image
       FROM variants v JOIN products p ON p.id = v.product_id
      WHERE v.id = ?`,
    Number(variantId),
  );
  return row || null;
}

/** Products related to a given one: same family first, then same category. */
export function relatedProducts(product, limit = 4) {
  if (!product) return [];
  const rows = all(
    `SELECT ${productColumns} FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1 AND p.id <> ?
      ORDER BY (p.tea_family = ?) DESC, (p.category_id = ?) DESC, p.rating DESC, p.sort_order
      LIMIT ?`,
    product.id,
    product.tea_family,
    product.category_id,
    Number(limit) || 4,
  );
  return rows.map(hydrateProduct).map(withVariants);
}

export function featuredProducts(limit = 6) {
  return all(
    `SELECT ${productColumns} FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1 ORDER BY p.is_featured DESC, p.rating DESC, p.sort_order LIMIT ?`,
    Number(limit) || 6,
  )
    .map(hydrateProduct)
    .map(withVariants);
}

export function newArrivals(limit = 4) {
  return all(
    `SELECT ${productColumns} FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1 ORDER BY p.is_new DESC, p.id DESC LIMIT ?`,
    Number(limit) || 4,
  )
    .map(hydrateProduct)
    .map(withVariants);
}

/** Full-text-ish search across products and guides. */
export function search(term, limit = 20) {
  const { products } = listProducts({ q: term, limit });
  const editorial = getEditorial();
  const needle = String(term || '').toLowerCase();
  const guides = editorial.guides.filter(
    (g) => g.title.toLowerCase().includes(needle) || g.summary.toLowerCase().includes(needle),
  );
  return { products, guides };
}

export function getEditorial() {
  const raw = getSetting('editorial', null);
  return raw ? parseJson(raw, { pillars: [], guides: [] }) : { pillars: [], guides: [] };
}

/** Lightweight payload for the client-side predictive search. */
export function searchIndex() {
  const rows = all(
    `SELECT p.slug, p.name, p.subtitle, p.tea_family, p.hero_image, p.category_id,
            (SELECT MIN(price_cents) FROM variants v WHERE v.product_id = p.id) AS price_from
       FROM products p WHERE p.is_active = 1 ORDER BY p.sort_order`,
  );
  const cats = listCategories();
  return {
    products: rows,
    categories: cats.map((c) => ({ slug: c.slug, name: c.name, kind: c.kind })),
    guides: getEditorial().guides.map((g) => ({ slug: g.slug, title: g.title, summary: g.summary })),
  };
}

export function lowStock(threshold = 6) {
  return all(
    `SELECT v.id AS variant_id, v.label, v.stock, p.name, p.slug
       FROM variants v JOIN products p ON p.id = v.product_id
      WHERE p.is_active = 1 AND v.stock <= ?
      ORDER BY v.stock ASC, p.name`,
    Number(threshold) || 6,
  );
}

/* --------------------------------------------------------------- chrome cache */

/**
 * The site chrome (navigation and the mega menu's featured lot) is identical on
 * every page and changes only when the catalogue or stock does. It is cached here
 * so a page render costs one query for its own content rather than three for its
 * own content plus two for the header.
 *
 * `invalidateChrome()` is called by anything that writes to the catalogue or
 * stock, so the cache cannot go stale in a running process.
 */
let chromeCache = null;

export function invalidateChrome() {
  chromeCache = null;
}

/** Navigation categories plus one representative photograph for the mega menu. */
export function getChrome() {
  if (chromeCache) return chromeCache;

  const categories = listCategories();
  const products = listProducts({ limit: 8, sort: 'rating' }).products;
  const featured = listProducts({ featured: true, limit: 1 }).products[0] || products[0];

  chromeCache = {
    categories,
    families: listTeaFamilies(),
    // The mega menu illustrates the tea families, so an oolong is preferred;
    // any lot will do if the catalogue has none.
    megaShot: (products.find((p) => p.tea_family === 'Oolong') || featured || {}).hero_image
      || (categories[0] ? categories[0].hero_image : null),
    products,
  };
  return chromeCache;
}

export function chromeStats() {
  return chromeCache ? { cached: true, categories: chromeCache.categories.length } : { cached: false };
}
