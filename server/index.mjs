/**
 * Cha Yuan — HTTP application.
 *
 * Express server hosting the storefront, the JSON API, the OTT Pay callback
 * endpoint, the 3-D Secure challenge relay and the admin back office.
 *
 * Everything security-relevant lives server side: the OTT Pay appKey/signKey
 * never reach the browser, card data is forwarded to the gateway and discarded,
 * and all prices are recalculated from the database on checkout.
 */
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import expressLayouts from 'express-ejs-layouts';

import config, { validateConfig } from './config.mjs';
import { getDb, get as dbGet, run as dbRun, getSetting, setSetting, all as dbAll } from './db.mjs';
import { seed } from './seed.mjs';
import * as catalog from './catalog.mjs';
import * as orders from './orders.mjs';
import * as payments from './payments.mjs';
import * as imagery from './imagery.mjs';
import * as security from './security.mjs';
// Named import, not `import * as`: views call this as a function, and a module
// namespace object is not callable.
import { fulfilment } from './fulfilment.mjs';
import { englishLabel } from './photo-selection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(config.rootDir, 'public');

/* -------------------------------------------------------------------------- */
/*  Boot                                                                       */
/* -------------------------------------------------------------------------- */

const { problems: bootProblems, warnings: bootWarnings } = validateConfig();

if (bootWarnings.length) {
  console.warn('\n  Configuration warnings:');
  for (const w of bootWarnings) console.warn(`   - ${w}`);
  console.warn('');
}

if (bootProblems.length) {
  console.error('\n  Configuration errors — the service cannot start:');
  for (const p of bootProblems) console.error(`   - ${p}`);
  console.error('');
  process.exit(1);
}

getDb();
seed(); // no-op when the catalogue already exists

if (config.payment.isMock) {
  console.log('  Payment mode: MOCK  (no network calls; use PAYMENT_MODE=sandbox to hit OTT Pay)');
} else {
  console.log(`  Payment mode: ${config.payment.mode.toUpperCase()}  ->  ${config.payment.baseUrl}`);
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.server.trustProxy);

/* View engine: EJS with layouts. */
app.set('view engine', 'ejs');
app.set('views', path.join(config.rootDir, 'views'));
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);
app.use(expressLayouts);

/* -------------------------------------------------------------------------- */
/*  Middleware                                                                 */
/* -------------------------------------------------------------------------- */

app.use((req, res, next) => {
  // The callback body must be readable verbatim for signature/decrypt auditing,
  // so JSON parsing keeps the raw text alongside the parsed object.
  express.json({
    limit: '256kb',
    verify: (req2, _res, buf) => {
      req2.rawBody = buf.toString('utf8');
    },
  })(req, res, next);
});
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

/**
 * Content Security Policy.
 * The 3-D Secure challenge page needs its own, looser policy because the issuer
 * serves the authentication form from an arbitrary ACS domain.
 */
function csp({ relaxed = false } = {}) {
  const common = [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "base-uri 'self'",
    "object-src 'none'",
  ];
  if (relaxed) {
    return [
      ...common,
      "script-src 'self' 'unsafe-inline'",
      "form-action *",
      "frame-src *",
      "connect-src 'self' *",
    ].join('; ');
  }
  const scriptSources = ["'self'"];
  const connectSources = ["'self'"];
  const frameSources = ["'self'"];
  if (config.payment.kount.enabled) {
    // KOUNT device data collection SDK (per OTT Pay's fraud mitigation guide).
    scriptSources.push('https://*.kount.com');
    connectSources.push('https://*.kount.com');
    frameSources.push('https://*.kount.com');
  }
  return [
    ...common,
    `script-src ${scriptSources.join(' ')}`,
    `connect-src ${connectSources.join(' ')}`,
    `frame-src ${frameSources.join(' ')}`,
    "form-action 'self'",
  ].join('; ');
}

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', csp());
  next();
});

/* -------------------------------------------------------------------------- */
/*  Cookies (tiny signed-cookie helper, no dependency)                        */
/* -------------------------------------------------------------------------- */

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

app.use((req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie);
  res.setCookie = (name, value, options = {}) => {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    parts.push(`Path=${options.path || '/'}`);
    if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
    if (options.httpOnly !== false) parts.push('HttpOnly');
    if (options.secure || config.isProduction) parts.push('Secure');
    parts.push(`SameSite=${options.sameSite || 'Lax'}`);
    const existing = res.getHeader('Set-Cookie');
    const cookie = parts.join('; ');
    res.setHeader('Set-Cookie', existing ? [].concat(existing, cookie) : cookie);
  };
  next();
});

/** Every visitor gets a CSRF token; forms and fetch calls echo it back. */
app.use((req, res, next) => {
  let token = req.cookies.cy_csrf;
  if (!token || !/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    token = security.newCsrfToken();
    res.setCookie('cy_csrf', token, { httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  }
  req.csrfToken = token;
  res.locals.csrfToken = token;
  next();
});

function requireCsrf(req, res, next) {
  const submitted = req.get('x-csrf-token') || req.body?._csrf || req.query._csrf;
  if (!security.csrfValid(req.cookies.cy_csrf, submitted)) {
    return res.status(403).json({ error: 'csrf', message: 'Your session expired. Please reload the page and try again.' });
  }
  next();
}

/** Same-origin check for state-changing API calls. */
function sameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!origin) return next();
  try {
    const host = req.get('host');
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return res.status(403).json({ error: 'origin', message: 'Cross-origin request rejected.' });
    }
  } catch {
    return res.status(400).json({ error: 'origin', message: 'Malformed Origin header.' });
  }
  next();
}

/* -------------------------------------------------------------------------- */
/*  View helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Money formatting, used by every price in the storefront and the back office.
 *
 * The house format puts the currency code in front and the symbol after the
 * amount, so a reader who does not recognise "$" alone still knows which dollar
 * this is:  CAD 188.00$  — code, amount to two decimals, symbol.
 *
 * The code comes from CURRENCY and the symbol from CURRENCY_SYMBOL, so an
 * installation in another market formats itself. The amount uses the locale's
 * thousands separators, and always two decimals so a column of prices aligns.
 *
 * @param {number} cents     Amount in cents; money is never a float here.
 * @param {{ withSymbol?: boolean }} [options]  Set withSymbol false to get just
 *        the number, for places that print the currency separately.
 */
const money = (cents, { withSymbol = true } = {}) => {
  const value = (Number(cents) || 0) / 100;
  const amount = value.toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!withSymbol) return amount;
  const code = config.store.currency;
  const symbol = config.store.currencySymbol;
  return `${code} ${amount}${symbol}`;
};

app.locals.money = money;
app.locals.config = config;
app.locals.store = config.store;
app.locals.payment = {
  mode: config.payment.mode,
  isMock: config.payment.isMock,
  kountEnabled: config.payment.kount.enabled,
  kountClientId: config.payment.kount.clientId,
  kountEnvironment: config.payment.kount.environment,
};
app.locals.year = new Date().getFullYear();
app.locals.escapeHtml = security.escapeHtml;
// Fulfilment promises, so any view can render the same deadlines the customer
// was shown. Callable from a template as fulfilment(order); the partial that
// does so lives at views/partials/order-progress.ejs.
app.locals.fulfilment = fulfilment;

function renderPage(res, view, data = {}) {
  res.render(view, { ...data, view, money, config, store: config.store });
}

/**
 * Chrome data (navigation, footer, mega-menu image) is identical on every page
 * and changes only when the catalogue does, so it is cached in catalog.mjs rather
 * than re-queried per request.
 */
app.use((req, res, next) => {
  const chrome = catalog.getChrome();
  res.locals.categories = chrome.categories;
  res.locals.families = chrome.families;
  res.locals.megaShot = chrome.megaShot;
  res.locals.page = res.locals.page || '';
  res.locals.layoutAdmin = req.path.startsWith('/admin');
  next();
});

/* -------------------------------------------------------------------------- */
/*  Generated imagery                                                          */
/* -------------------------------------------------------------------------- */

function sendSvg(res, svg, { immutable = false } = {}) {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=86400');
  res.send(svg);
}

/**
 * Whether a jewellery piece should be drawn as metal or as stone, and what
 * colour that stone is.
 *
 * A metal piece is drawn in the metal gradient; a gemstone piece is drawn in its
 * own material colour, so a ruby ring is red and a sapphire ring is blue. The
 * material is already recorded as the product's `cultivar`, which is where the
 * catalogue stores "18k yellow gold" or "jadeite cabochons".
 */
const METAL_MATERIAL = /^(1[0-9]|2[0-9])k|gold|silver|filigree|platinum|sterling/i;

/**
 * The department an artwork should be drawn for, and whether it must carry the
 * illustration disclosure.
 *
 * `notice` follows the stored image_kind rather than the department: a jade
 * piece that has been photographed gets no notice, and a tea without a
 * photograph would get one.
 *
 * `shape` comes from the stored `art_unit` — the unit the piece is sold in, such
 * as "Bangle" or "Earrings" — so a generated drawing of a bangle is a ring and
 * not the generic plaque every illustrated piece used to get.
 */
function artworkArgs(product) {
  const kind = product.category_kind || 'tea';
  const material = String(product.cultivar || '');
  return {
    slug: product.slug,
    name: product.name,
    family: product.tea_family,
    // The English chop label, stored as `seal` in the catalogue.
    seal: product.seal || 'Tea',
    kind,
    notice: product.image_kind === 'illustration',
    shape: imagery.shapeForUnit(product.art_unit),
    material,
    // Jade is always drawn in its own stone colour — spinach green, mutton fat,
    // lavender jadeite — and jewellery in metal unless it is a gemstone piece.
    fill: kind === 'jewellery' && METAL_MATERIAL.test(material) ? 'metal' : 'material',
  };
}

app.get('/img/product/:slug.svg', (req, res) => {
  const product = catalog.getProduct(req.params.slug);
  if (!product) return res.status(404).send('Not found');
  sendSvg(res, imagery.productArtwork(artworkArgs(product)));
});

/**
 * Detail views for a product with no photograph.
 *
 * Three deliberately composed variants so a gallery never mixes a generated main
 * image with leftover placeholder files. Which three depends on the department:
 * water and leaf for tea, carving and finish for jade, setting for jewellery.
 */
const PRODUCT_DETAIL_STYLES = new Set(['vessel', 'layout', 'profile']);

app.get('/img/product/:slug/:style.svg', (req, res) => {
  const style = req.params.style;
  if (!PRODUCT_DETAIL_STYLES.has(style)) return res.status(404).send('Not found');
  const product = catalog.getProduct(req.params.slug);
  if (!product) return res.status(404).send('Not found');
  sendSvg(res, imagery.productDetailArtwork({ ...artworkArgs(product), style }));
});

app.get('/img/editorial/:slug.svg', (req, res) => {
  const slug = req.params.slug;
  const product = catalog.getProduct(slug.replace(/-(detail|brew)$/, ''));
  const variant = slug.endsWith('-brew') ? 'brew' : 'detail';
  sendSvg(res, imagery.editorialArtwork({
    key: slug,
    family: product?.tea_family || 'Oolong',
    label: variant === 'brew' ? 'Brew' : product?.tea_family || 'Tea',
  }));
});

app.get('/img/category/:slug.svg', (req, res) => {
  const cat = catalog.getCategory(req.params.slug);
  const family = cat ? cat.name : 'Green';
  sendSvg(res, imagery.heroArtwork({ key: `cat-${req.params.slug}`, family, title: '', subtitle: '' }));
});

app.get('/img/hero/:key.svg', (req, res) => {
  const key = req.params.key;
  const family = (req.query.family || 'Green').toString();
  sendSvg(res, imagery.heroArtwork({
    key,
    family,
    title: (req.query.title || '').toString().slice(0, 60),
    subtitle: (req.query.subtitle || '').toString().slice(0, 60),
  }));
});

app.get('/img/logo.svg', (req, res) => sendSvg(res, imagery.logo({ name: config.store.name }), { immutable: true }));
/**
 * Payment-network marks.
 *
 * A real mark file in public/img/badge/<slug>.svg wins; otherwise the generated
 * label pill is drawn instead. The fallback keeps the checkout whole if a brand
 * mark is ever removed, and it is what non-network pills (anything without a
 * mark file) still use.
 */
const BADGE_DIR = path.join(PUBLIC_DIR, 'img', 'badge');

app.get('/img/badge/:label.svg', (req, res) => {
  const raw = String(req.params.label || '');
  // Slug only: no separators, no traversal, no extension games.
  const slug = /^[a-z0-9][a-z0-9-]{0,31}$/.test(raw) ? raw : null;
  if (slug) {
    const file = path.join(BADGE_DIR, `${slug}.svg`);
    if (file.startsWith(BADGE_DIR) && fs.existsSync(file)) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(file);
    }
  }
  return sendSvg(res, imagery.brandBadge({ label: raw }), { immutable: true });
});
app.get('/favicon.svg', (req, res) => sendSvg(res, imagery.favicon(), { immutable: true }));
app.get('/favicon.ico', (req, res) => sendSvg(res, imagery.favicon(), { immutable: true }));

/* -------------------------------------------------------------------------- */
/*  Storefront                                                                 */
/* -------------------------------------------------------------------------- */

app.use(express.static(PUBLIC_DIR, { maxAge: config.isProduction ? '7d' : 0, index: false }));

app.get('/', (req, res) => {
  const editorial = catalog.getEditorial();

  const spotlightProduct = editorial.spotlight?.productSlug
    ? catalog.getProduct(editorial.spotlight.productSlug)
    : null;
  const giftProduct = editorial.gift?.productSlug ? catalog.getProduct(editorial.gift.productSlug) : null;

  // Mosaic tiles: real product and editorial photography, largest tile first.
  const mosaicPool = catalog.listProducts({ limit: 7, sort: 'rating' }).products;
  const mosaicLabels = ['Leaf', 'Liquor', 'Clay', 'Steep', 'Origin', 'Harvest', 'Vessel'];
  const imageMosaic = mosaicPool.slice(0, 7).map((p, i) => ({
    src: i % 2 === 0 ? p.hero_image : (p.images[1] || p.hero_image),
    label: `${mosaicLabels[i] || 'Tea'} · ${p.name}`,
    href: `/tea/${p.slug}`,
  }));

  renderPage(res, 'index', {
    page: 'home',
    title: `${config.store.name} — ${config.store.tagline}`,
    description: editorial.intro,
    featured: catalog.featuredProducts(8),
    arrivals: catalog.newArrivals(4),
    categories: catalog.listCategories(),
    families: catalog.listTeaFamilies(),
    editorial,
    spotlightProduct,
    giftProduct,
    imageMosaic,
  });
});

/**
 * The shop page.
 *
 * Three states, and keeping them distinct is the whole point:
 *
 *   /shop                      the chooser: three departments and nothing else
 *   /shop?department=tea       that department, with its own categories as chips
 *   /shop?category=green-tea   one category, still inside its department
 *
 * The owner's complaint was that /shop opened with twelve category chips at
 * once — tea's eight internal divisions, jade, jewellery, teaware and gifts all
 * presented as peers — which made the page read as a wall of filters rather than
 * as a shop with three things in it. Tea's divisions now appear only once you
 * are inside Tea.
 */
app.get('/shop', (req, res) => {
  const { category = '', family = '', q = '', sort = 'featured', stock = '', department = '' } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = 20;

  const activeCategory = category ? catalog.getCategory(String(category)) : null;
  const activeDepartment = catalog.getDepartment(String(department));

  // A category URL implies its department, so breadcrumbs and the chip row stay
  // consistent whichever way the customer arrived.
  const departmentForView = activeDepartment
    || (activeCategory ? catalog.DEPARTMENTS.find((d) => d.kinds.includes(activeCategory.kind)) : null);

  const searching = Boolean(String(q).trim());
  // The chooser is only shown when nothing at all has been chosen.
  const showChooser = !departmentForView && !activeCategory && !searching && !family && !stock;

  if (showChooser) {
    return renderPage(res, 'shop', {
      page: 'shop',
      title: `Shop — ${config.store.name}`,
      description: 'Three departments: single-origin Chinese tea, jade and stone, and fine jewellery.',
      chooser: true,
      cards: catalog.departmentCards(),
      counts: catalog.departmentCounts(),
      categories: catalog.listCategories(),
      products: [],
      total: 0,
      page: 1,
      perPage,
      pages: 1,
      filters: { category: '', family: '', q: '', sort, stock: '' },
      activeCategory: null,
      activeDepartment: null,
      subCategories: [],
      families: catalog.listTeaFamilies(),
    });
  }

  const { products, total } = catalog.listProducts({
    category: String(category),
    kinds: !activeCategory && departmentForView ? departmentForView.kinds : null,
    family: String(family),
    q: String(q),
    sort: String(sort),
    inStock: stock === '1',
    limit: perPage,
    offset: (page - 1) * perPage,
  });

  // Sub-categories are shown for the tea department only: jade and jewellery are
  // single categories, so a chip row for them would be one chip.
  const subCategories = departmentForView && departmentForView.slug === 'tea'
    ? catalog.listCategories().filter((c) => c.kind === 'tea')
    : [];

  renderPage(res, 'shop', {
    page: 'shop',
    title: `${activeCategory?.name || departmentForView?.name || 'All products'} — ${config.store.name}`,
    description: activeCategory?.description || departmentForView?.blurb || '',
    chooser: false,
    cards: catalog.departmentCards(),
    counts: catalog.departmentCounts(),
    products,
    total,
    page: Number(page),
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
    filters: { category: String(category), family: String(family), q: String(q), sort: String(sort), stock: String(stock), department: String(department) },
    categories: catalog.listCategories(),
    families: catalog.listTeaFamilies(),
    activeCategory,
    activeDepartment: departmentForView,
    subCategories,
  });
});

app.get('/tea/:slug', (req, res, next) => {
  const product = catalog.getProduct(req.params.slug);
  if (!product) return next();
  renderPage(res, 'product', {
    page: 'shop',
    title: `${product.name} — ${config.store.name}`,
    description: product.short_description,
    product,
    related: catalog.relatedProducts(product, 4),
    breadcrumbCategory: catalog.getCategory(product.category_slug),
  });
});

app.get('/guides', (req, res) => {
  renderPage(res, 'guides', {
    page: 'guides',
    title: `Tea guides — ${config.store.name}`,
    editorial: catalog.getEditorial(),
  });
});

app.get('/guides/:slug', (req, res, next) => {
  const editorial = catalog.getEditorial();
  const guide = editorial.guides.find((g) => g.slug === req.params.slug);
  if (!guide) return next();
  renderPage(res, 'guide', {
    page: 'guides',
    title: `${guide.title} — ${config.store.name}`,
    description: guide.summary,
    guide,
    others: editorial.guides.filter((g) => g.slug !== guide.slug),
  });
});

app.get('/about', (req, res) => {
  renderPage(res, 'about', {
    page: 'about',
    title: `About ${config.store.name}`,
    editorial: catalog.getEditorial(),
  });
});

app.get('/shipping', (req, res) => {
  renderPage(res, 'shipping', {
    page: 'shipping',
    title: `Shipping, returns & payment — ${config.store.name}`,
    description: 'How we ship, what it costs, how refunds work, and how card payments are secured.',
  });
});

app.get('/terms', (req, res) => {
  // Photography is used under Creative Commons licences that require
  // attribution, so the credits are published on the legal page.
  let photoCredits = [];
  try {
    const raw = fs.readFileSync(path.join(PUBLIC_DIR, 'img', 'credits.json'), 'utf8');
    const parsed = JSON.parse(raw);
    photoCredits = Object.entries(parsed.credits || {}).map(([slot, credit]) => ({
      slot,
      ...credit,
      // Attribution has to name the author, and a number of Commons titles and
      // authors are written in Chinese or Russian. The English label is shown
      // here and the original stays in credits.json, so the credit is still
      // traceable to the file it came from.
      title: englishLabel(credit.title),
      author: englishLabel(credit.author),
    }));
  } catch {
    photoCredits = [];
  }

  renderPage(res, 'terms', {
    page: 'terms',
    title: `Terms, privacy & cookies — ${config.store.name}`,
    description: 'Our terms of sale, privacy policy, cookie use, and photo credits.',
    photoCredits,
  });
});

app.get('/credits', (req, res) => {
  let photoCredits = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'img', 'credits.json'), 'utf8'));
    photoCredits = Object.entries(parsed.credits || {}).map(([slot, credit]) => ({
      slot,
      ...credit,
      title: englishLabel(credit.title),
      author: englishLabel(credit.author),
    }));
  } catch {
    photoCredits = [];
  }
  renderPage(res, 'credits', {
    page: 'credits',
    title: `Photography & illustrations — ${config.store.name}`,
    description: 'Attribution for the openly-licensed photography used on this site, and how to tell an illustration from a photograph.',
    photoCredits,
  });
});

app.get('/cart', (req, res) => {
  renderPage(res, 'cart', { page: 'cart', title: `Your basket — ${config.store.name}` });
});

app.get('/checkout', (req, res) => {
  renderPage(res, 'checkout', {
    page: 'checkout',
    title: `Checkout — ${config.store.name}`,
    paymentMode: config.payment.mode,
    isMock: config.payment.isMock,
  });
});

/** Payment result page: the frontURL the cardholder returns to. */
app.get('/payment/result', async (req, res) => {
  const orderNumber = String(req.query.order || '');
  const order = orderNumber ? orders.getOrderByNumber(orderNumber) : null;
  const editorial = catalog.getEditorial();
  renderPage(res, 'payment-result', {
    page: 'checkout',
    title: `Payment — ${config.store.name}`,
    order,
    orderNumber,
    editorial,
  });
});

app.get('/order', (req, res) => {
  renderPage(res, 'order-lookup', {
    page: 'order',
    title: `Find your order — ${config.store.name}`,
    editorial: catalog.getEditorial(),
  });
});

app.get('/order/:orderNumber', (req, res, next) => {
  const order = orders.getOrderByNumber(req.params.orderNumber);
  if (!order) return next();
  // Order lookup is by unguessable order number; the email must match to reveal
  // the full shipping address.
  const email = String(req.query.email || '').toLowerCase();
  const verified = !email || email === order.customer_email.toLowerCase();
  renderPage(res, 'order', {
    page: 'order',
    title: `Order ${order.order_number} — ${config.store.name}`,
    order: verified
      ? order
      : {
          ...order,
          shipping_line1: '••••',
          shipping_line2: '',
          shipping_postal_code: '•••',
          customer_email: order.customer_email.replace(/^(.).*(@.*)$/, '$1•••$2'),
        },
    verified,
  });
});

/* -------------------------------------------------------------------------- */
/*  JSON API — catalogue                                                       */
/* -------------------------------------------------------------------------- */

app.get('/api/config', (req, res) => {
  res.json({
    store: {
      name: config.store.name,
      tagline: config.store.tagline,
      currency: config.store.currency,
      currencySymbol: config.store.currencySymbol,
      freeShippingThreshold: config.store.freeShippingThreshold,
      flatShippingFee: config.store.flatShippingFee,
      taxRate: config.store.taxRate,
      taxLabel: config.store.taxLabel,
    },
    payment: {
      mode: config.payment.mode,
      isMock: config.payment.isMock,
      kountEnabled: config.payment.kount.enabled,
      kountClientId: config.payment.kount.clientId,
      kountEnvironment: config.payment.kount.environment,
    },
    csrfToken: req.csrfToken,
  });
});

app.get('/api/products', (req, res) => {
  const { products, total } = catalog.listProducts({
    category: String(req.query.category || ''),
    family: String(req.query.family || ''),
    q: String(req.query.q || ''),
    sort: String(req.query.sort || 'featured'),
    inStock: req.query.stock === '1',
    limit: Math.min(60, Number.parseInt(req.query.limit, 10) || 24),
    offset: Number.parseInt(req.query.offset, 10) || 0,
  });
  res.json({ products, total });
});

app.get('/api/products/:slug', (req, res) => {
  const product = catalog.getProduct(req.params.slug);
  if (!product) return res.status(404).json({ error: 'not_found' });
  res.json({ product, related: catalog.relatedProducts(product, 4) });
});

app.get('/api/categories', (req, res) => {
  res.json({ categories: catalog.listCategories(), families: catalog.listTeaFamilies() });
});

app.get('/api/search-index', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(catalog.searchIndex());
});

/** Authoritative cart pricing — the client sends variant ids, never prices. */
app.post('/api/cart/price', sameOrigin, requireCsrf, (req, res) => {
  const priced = orders.priceCart(req.body?.items, { shippingMethod: req.body?.shippingMethod });
  res.json({ cart: priced, formatted: { total: money(priced.totalCents) } });
});

app.post('/api/newsletter', sameOrigin, requireCsrf, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!security.emailValid(email)) return res.status(400).json({ error: 'invalid_email', message: 'Please enter a valid email address.' });
  try {
    dbRun('INSERT INTO subscribers (email) VALUES (?) ON CONFLICT(email) DO NOTHING', email);
    res.json({ ok: true, message: 'Thank you — you are on the list.' });
  } catch {
    res.status(500).json({ error: 'server', message: 'Could not save your address right now.' });
  }
});

/* -------------------------------------------------------------------------- */
/*  Checkout                                                                   */
/* -------------------------------------------------------------------------- */

const checkoutLimiter = (req, res, next) => {
  const key = `checkout:${security.clientIp(req)}`;
  const { allowed, retryAfterSeconds } = security.rateLimit(key, { limit: 12, windowMs: 60_000 });
  if (!allowed) {
    return res.status(429).json({
      error: 'rate_limited',
      message: `Too many payment attempts. Please wait ${retryAfterSeconds} seconds and try again.`,
    });
  }
  next();
};

/**
 * POST /api/checkout
 *
 * Validates the basket and the card, creates the order, records a payment
 * attempt, then calls OTT Pay. Card data is forwarded to the gateway and is
 * never written to the database or to a log.
 */
app.post('/api/checkout', sameOrigin, requireCsrf, checkoutLimiter, async (req, res) => {
  const body = req.body || {};
  const mode = payments.paymentMode();

  const errors = {};

  const email = String(body.email || '').trim().toLowerCase();
  if (!security.emailValid(email)) errors.email = 'Enter a valid email address — your receipt goes there.';

  const name = String(body.name || '').trim();
  if (name.length < 2) errors.name = 'Enter your full name.';

  const phone = String(body.phone || '').trim();
  if (phone && !/^[+()\d][\d\s().-]{5,24}$/.test(phone)) errors.phone = 'That phone number does not look right.';

  const address = {
    address: String(body.address || '').trim(),
    line2: String(body.address2 || '').trim(),
    city: String(body.city || '').trim(),
    province: String(body.province || '').trim(),
    country: String(body.country || 'CA').trim().toUpperCase().slice(0, 2),
    zip: String(body.postalCode || '').trim().toUpperCase(),
  };
  if (address.address.length < 4) errors.address = 'Enter your street address.';
  if (!address.city) errors.city = 'Enter your city.';
  if (!address.province) errors.province = 'Enter your state or province.';
  if (!security.postalValid(address.zip, address.country)) errors.postalCode = 'Enter a valid postal or ZIP code.';

  const cardNumber = String(body.cardNumber || '').replace(/\D/g, '');
  const cardHolder = String(body.cardHolder || '').trim();
  const cardExpiryMonth = String(body.cardExpiryMonth || '').trim();
  const cardExpiryYear = String(body.cardExpiryYear || '').trim();
  const cardCvv = String(body.cardCvv || '').replace(/\D/g, '');

  if (!security.luhn(cardNumber)) errors.cardNumber = 'That card number is not valid — please check it.';
  if (cardHolder.length < 2) errors.cardHolder = 'Enter the name printed on the card.';
  if (!security.expiryValid(cardExpiryMonth, cardExpiryYear)) errors.cardExpiry = 'That expiry date is invalid or in the past.';
  const brand = payments.detectBrand(cardNumber);
  const cvvLength = brand === 'AMEX' ? 4 : 3;
  if (cardCvv.length !== cvvLength) errors.cardCvv = `Enter the ${cvvLength}-digit security code.`;

  const shippingMethod = body.shippingMethod === 'express' ? 'express' : 'standard';
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) errors.cart = 'Your basket is empty.';

  const priced = orders.priceCart(items, { shippingMethod });
  if (priced.problems.length) {
    errors.cart = priced.problems.map((p) => p.message).join(' ');
  }

  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'validation', errors, message: 'Please correct the highlighted fields.' });
  }

  // Create the order first so a payment can always be reconciled against it.
  const created = orders.createOrder({
    priced,
    customer: { email, name, phone },
    shipping: {
      name: String(body.shippingName || name).trim(),
      line1: address.address,
      line2: address.line2,
      city: address.city,
      province: address.province,
      postalCode: address.zip,
      country: address.country,
    },
    shippingMethod,
    note: String(body.note || '').slice(0, 500),
  });

  const order = orders.getOrderById(created.orderId);
  const reference = orders.newReference(created.orderNumber);
  const kountSessionId = String(body.kountSessionId || orders.newKountSessionId()).slice(0, 32);

  orders.recordAttempt({
    orderId: created.orderId,
    reference,
    amountCents: created.totalCents,
    kountSessionId,
    requestPayload: {
      amount: created.totalCents,
      reference,
      orderNumber: created.orderNumber,
      mode,
      kountSessionId,
      card: { brand, last4: payments.cardLast4(cardNumber) },
    },
  });

  const callbackUrl = `${config.store.publicBaseUrl}/api/ottpay/callback`;
  const frontUrl = `${config.store.publicBaseUrl}/payment/result?order=${encodeURIComponent(created.orderNumber)}`;

  const paymentResult = await payments.startCardPayment({
    amountCents: created.totalCents,
    card: {
      number: cardNumber,
      holder: cardHolder,
      expiry: `${cardExpiryMonth.padStart(2, '0')}${cardExpiryYear.slice(-2)}`,
      cvv: cardCvv,
    },
    avs: {
      address: address.address + (address.line2 ? ` ${address.line2}` : ''),
      city: address.city,
      province: address.province,
      country: address.country,
      zip: address.zip,
    },
    browser: security.collectBrowserFingerprint(body.browser, req),
    kountSessionId,
    email,
    reference,
    callbackUrl,
    frontUrl,
    origin: `${req.protocol}://${req.get('host')}`,
  });

  if (!paymentResult.ok) {
    orders.applyPaymentResult({
      orderId: created.orderId,
      reference,
      result: { paymentStatus: 'orderclosed', responsePayload: paymentResult.error },
    });
    return res.status(402).json({
      error: 'payment_failed',
      code: paymentResult.error.code,
      message: paymentResult.error.message,
      detail: paymentResult.error.detail,
      orderNumber: created.orderNumber,
    });
  }

  const data = paymentResult.data;
  orders.applyPaymentResult({
    orderId: created.orderId,
    reference,
    result: {
      paymentStatus: data.paymentStatus,
      paymentId: data.paymentId,
      ccType: payments.detectBrand(cardNumber),
      cardLast4: payments.cardLast4(cardNumber),
      responsePayload: data.responsePayload,
    },
  });

  const paid = payments.PAID_STATUSES.has(String(data.paymentStatus || '').toLowerCase());

  // If the mock acquirer or the gateway produced a capture immediately, fire our
  // own signed callback so the same reconciliation path runs in every mode.
  if (paid) {
    scheduleMockCallback(created.orderNumber, reference, data.paymentId, created.totalCents).catch(() => {});
  }

  return res.json({
    ok: true,
    orderNumber: created.orderNumber,
    reference,
    paymentStatus: data.paymentStatus,
    paid,
    challenge: Boolean(data.escape3DSChallengeForm),
    challengeUrl: data.escape3DSChallengeForm ? `/payment/3ds/challenge?ref=${encodeURIComponent(reference)}` : null,
    challengeForm: data.escape3DSChallengeForm || '',
    redirectUrl: paid ? `/payment/result?order=${encodeURIComponent(created.orderNumber)}` : `/payment/result?order=${encodeURIComponent(created.orderNumber)}`,
    nextAction: data.escape3DSChallengeForm ? 'challenge' : paid ? 'redirect' : 'failed',
    amountCents: created.totalCents,
  });
});

/**
 * In mock mode, post a genuine signed callback to our own callback endpoint.
 * This exercises AES-ECB decryption, dedupe and reconciliation end to end.
 */
async function scheduleMockCallback(orderNumber, reference, paymentId, amountCents) {
  if (!config.payment.isMock) return;
  const md5Seed = crypto.createHash('md5').update(`${reference}${Date.now()}`).digest('hex').toUpperCase();
  const signKey = config.payment.signKey || 'MOCKSIGNKEY0000';
  const { data, md5 } = payments.encryptCallbackPayload(
    {
      reference,
      order_status: 'captured',
      amount: String(amountCents),
      bizpay_order_id: `MOCK${reference.slice(-8)}`,
      tip: '0',
      merchant_id: config.payment.merchantId || 'MOCK0000001',
      order_id: paymentId || `MOCK${Date.now()}`,
      finish_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      remarks: orderNumber,
    },
    md5Seed,
    signKey,
  );
  const body = JSON.stringify({
    rsp_code: 'SUCCESS',
    rsp_msg: 'success',
    merchant_id: config.payment.merchantId || 'MOCK0000001',
    data,
    md5,
  });
  try {
    await fetch(`${config.store.publicBaseUrl}/api/ottpay/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch {
    // The shop works without the self-callback; it is a realism aid only.
  }
}

/* -------------------------------------------------------------------------- */
/*  OTT Pay callback (webhook)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/ottpay/callback
 *
 * OTT Pay posts the payment result here. The body is
 *   { rsp_code, rsp_msg, merchant_id, data, md5 }
 * and `data` is AES-128-ECB (Base64) encrypted with a key derived from
 * MD5(md5 + signKey). We always answer HTTP 200 with rsp_code SUCCESS so the
 * gateway does not retry forever; failures are recorded for the admin.
 */
app.post('/api/ottpay/callback', express.json({ limit: '512kb' }), async (req, res) => {
  const body = req.body || {};
  const rawBody = req.rawBody || JSON.stringify(body).slice(0, 20000);

  const merchantId = String(body.merchant_id || '');
  if (config.payment.merchantId && merchantId && merchantId !== config.payment.merchantId) {
    console.warn(`[ottpay] callback for unexpected merchant_id ${merchantId}`);
  }

  const decrypted = payments.decryptCallback(body);
  const reference = decrypted.payload?.reference || '';
  const ottOrderId = decrypted.payload?.order_id || '';
  const eventKey = crypto.createHash('sha256').update(`${body.md5 || ''}|${reference}|${ottOrderId}`).digest('hex');

  const existing = dbGet('SELECT id, processed FROM webhook_events WHERE event_key = ?', eventKey);

  if (!decrypted.ok) {
    dbRun(
      `INSERT INTO webhook_events (provider, event_key, order_id, rsp_code, rsp_msg, raw_body, decrypted, processed, error)
       VALUES (?,?,?,?,?,?,?,0,?)
       ON CONFLICT(event_key) DO NOTHING`,
      'ottpay',
      eventKey,
      reference,
      String(body.rsp_code || ''),
      String(body.rsp_msg || ''),
      rawBody,
      '',
      decrypted.error || 'decryption failed',
    );
    console.error(`[ottpay] callback could not be decrypted: ${decrypted.error}`);
    return res.json({ rsp_code: 'SUCCESS', rsp_msg: 'received' });
  }

  const payload = decrypted.payload;
  const order = orders.getOrderByReference(payload.reference || '') || orders.getOrderByNumber(payload.remarks || '');

  if (!existing) {
    dbRun(
      `INSERT INTO webhook_events (provider, event_key, order_id, rsp_code, rsp_msg, raw_body, decrypted, processed)
       VALUES (?,?,?,?,?,?,?,0)
       ON CONFLICT(event_key) DO NOTHING`,
      'ottpay',
      eventKey,
      payload.reference || '',
      String(body.rsp_code || ''),
      String(body.rsp_msg || ''),
      rawBody,
      JSON.stringify(payload).slice(0, 20000),
    );
  }

  if (!order) {
    dbRun('UPDATE webhook_events SET error = ? WHERE event_key = ?', 'No matching order for reference', eventKey);
    console.warn(`[ottpay] callback for unknown reference ${payload.reference}`);
    return res.json({ rsp_code: 'SUCCESS', rsp_msg: 'ok' });
  }

  const orderStatus = String(payload.order_status || '').toLowerCase();
  const paid = payments.PAID_STATUSES.has(orderStatus);

  if (!existing || !existing.processed) {
    orders.applyPaymentResult({
      orderId: order.id,
      reference: payload.reference || order.ott_reference,
      result: {
        paymentStatus: paid ? 'captured' : orderStatus || 'unknown',
        paymentId: payload.order_id || '',
        cardLast4: order.ott_card_last4,
        ccType: order.ott_cc_type,
        responsePayload: payload,
      },
    });
    dbRun(
      `UPDATE orders SET ott_bizpay_order_id = COALESCE(NULLIF(?, ''), ott_bizpay_order_id), updated_at = datetime('now') WHERE id = ?`,
      payload.bizpay_order_id || '',
      order.id,
    );
  }

  dbRun('UPDATE webhook_events SET processed = 1, order_id = ? WHERE event_key = ?', order.order_number, eventKey);

  return res.json({ rsp_code: 'SUCCESS', rsp_msg: 'ok' });
});

/* -------------------------------------------------------------------------- */
/*  3-D Secure challenge relay                                                 */
/* -------------------------------------------------------------------------- */

/**
 * GET /payment/3ds/challenge?ref=...
 *
 * OTT Pay returns the issuer's authentication form as raw HTML inside
 * `escape3DSChallengeForm` when the 3DS2 challenge flow is required. We wrap it
 * on our own domain so the cardholder never sees an unstyled blank page, and so
 * we can log the challenge. It auto-submits to the issuer.
 */
app.get('/payment/3ds/challenge', (req, res) => {
  const reference = String(req.query.ref || '');
  const attempt = reference ? dbGet('SELECT * FROM payment_attempts WHERE reference = ?', reference) : null;
  if (!attempt) return res.status(404).render('error', { page: 'error', title: 'Payment session not found', status: 404, message: 'This payment session has expired. Please start checkout again.' });

  const order = orders.getOrderById(attempt.order_id);

  // Reuse the stored challenge form when the gateway supplied one.
  let form = '';
  try {
    const stored = JSON.parse(attempt.response_payload || '{}');
    form = stored?.escape3DSChallengeForm || '';
  } catch {
    form = '';
  }

  if (!form && payments.isMock()) {
    const txn = payments.mockTxn(reference);
    if (txn?.challengeId) {
      form = `<form id="challenge" name="challenge" action="/mock-3ds/challenge" method="post">
        <input type="hidden" name="MD" value="${security.escapeHtml(txn.challengeId)}" />
        <input type="hidden" name="ref" value="${security.escapeHtml(reference)}" />
      </form>`;
    }
  }

  res.setHeader('Content-Security-Policy', csp({ relaxed: true }));
  res.render('challenge', {
    page: 'checkout',
    layout: false,
    title: 'Confirm your payment',
    order,
    reference,
    form,
    isMock: payments.isMock(),
  });
});

/**
 * POST /mock-3ds/challenge
 *
 * Stands in for the issuer's ACS endpoint in mock mode: accepts the mock
 * "password" and resolves the transaction, then bounces the cardholder back to
 * the frontURL exactly as a real ACS would.
 */
app.post('/mock-3ds/challenge', express.urlencoded({ extended: false }), async (req, res) => {
  const challengeId = String(req.body.MD || '');
  const reference = String(req.body.ref || '');
  const password = String(req.body.password || req.body.pass || '');

  const resolved = payments.resolveMockChallenge(challengeId, password);

  // Show the mock challenge form if the cardholder has not submitted yet.
  if (!password) {
    return res.render('challenge', {
      page: 'checkout',
      layout: false,
      title: 'Issuer authentication',
      order: reference ? orders.getOrderByReference(reference) : null,
      reference,
      form: '',
      isMock: true,
      askPassword: true,
      challengeId,
      csrfToken: req.csrfToken,
    });
  }

  const attempt = reference ? dbGet('SELECT * FROM payment_attempts WHERE reference = ?', reference) : null;
  const order = attempt ? orders.getOrderById(attempt.order_id) : null;

  if (order) {
    if (resolved.ok && resolved.authenticated) {
      orders.applyPaymentResult({
        orderId: order.id,
        reference,
        result: {
          paymentStatus: 'authorised',
          paymentId: payments.mockTxn(reference)?.paymentId || '',
          ccType: order.ott_cc_type,
          cardLast4: order.ott_card_last4,
          responsePayload: { mock: true, transStatus: 'Y', eci: '05' },
        },
      });
      await scheduleMockCallback(order.order_number, reference, payments.mockTxn(reference)?.paymentId, order.total_cents);
    } else {
      orders.applyPaymentResult({
        orderId: order.id,
        reference,
        result: {
          paymentStatus: 'orderclosed',
          responsePayload: { mock: true, transStatus: 'N' },
        },
      });
    }
  }

  const target = `/payment/result?order=${encodeURIComponent(order?.order_number || '')}&auth=${resolved.ok && resolved.authenticated ? 'ok' : 'failed'}`;
  return res.redirect(303, target);
});

/** JSON status endpoint used by the result page to poll. */
app.get('/api/orders/:orderNumber/status', (req, res) => {
  const order = orders.getOrderByNumber(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'not_found' });
  res.json({
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    ottPaymentStatus: order.ott_payment_status,
    paymentId: order.ott_payment_id,
    totalCents: order.total_cents,
  });
});

/** Re-query OTT Pay for the authoritative status (used by the result page). */
app.post('/api/orders/:orderNumber/sync', sameOrigin, requireCsrf, async (req, res) => {
  const order = orders.getOrderByNumber(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'not_found' });
  if (!order.ott_payment_id && !order.ott_reference) {
    return res.status(400).json({ error: 'no_payment', message: 'No payment has been attempted for this order yet.' });
  }
  const result = await payments.fetchPaymentStatus({
    paymentId: order.ott_payment_id,
    reference: order.ott_reference,
  });
  if (!result.ok) return res.status(502).json({ error: 'gateway', message: result.error.message });

  const status = String(result.data.paymentStatus || '').toLowerCase();
  if (payments.PAID_STATUSES.has(status) || status === 'success') {
    orders.applyPaymentResult({
      orderId: order.id,
      reference: order.ott_reference,
      result: { paymentStatus: 'captured', paymentId: result.data.paymentId, responsePayload: result.data.responsePayload },
    });
  }
  const fresh = orders.getOrderByNumber(order.order_number);
  res.json({
    orderNumber: fresh.order_number,
    status: fresh.status,
    paymentStatus: fresh.payment_status,
    gateway: result.data,
  });
});

/* -------------------------------------------------------------------------- */
/*  Admin                                                                      */
/* -------------------------------------------------------------------------- */

const ADMIN_COOKIE = 'cy_admin';

function loadAdmin(req, res, next) {
  const session = security.verifyToken(req.cookies[ADMIN_COOKIE]);
  req.admin = session && session.role === 'admin' ? session : null;
  res.locals.admin = req.admin;
  next();
}
app.use(loadAdmin);

function requireAdmin(req, res, next) {
  if (!req.admin) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'unauthorized' });
    return res.redirect(`/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
}

app.get('/admin/login', (req, res) => {
  if (req.admin) return res.redirect('/admin');
  res.render('admin-login', { page: 'admin', layout: 'admin-layout', title: 'Admin sign in', error: null, next: req.query.next || '/admin' });
});

app.post('/admin/login', (req, res) => {
  const ip = security.clientIp(req);
  const { allowed, retryAfterSeconds } = security.rateLimit(`adminlogin:${ip}`, { limit: 8, windowMs: 5 * 60_000 });
  if (!allowed) {
    return res.status(429).render('admin-login', {
      page: 'admin', layout: 'admin-layout', title: 'Admin sign in', next: '/admin',
      error: `Too many attempts. Try again in ${retryAfterSeconds} seconds.`,
    });
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const ok = security.safeEqual(email, config.admin.email) && security.safeEqual(password, config.admin.password);

  if (!ok) {
    return res.status(401).render('admin-login', {
      page: 'admin', layout: 'admin-layout', title: 'Admin sign in',
      error: 'Those credentials were not accepted.', next: req.body.next || '/admin',
    });
  }

  res.setCookie(ADMIN_COOKIE, security.signToken({ role: 'admin', email }, 60 * 60 * 12), { httpOnly: true, maxAge: 60 * 60 * 12 });
  res.redirect(String(req.body.next || '/admin').startsWith('/admin') ? String(req.body.next || '/admin') : '/admin');
});

app.post('/admin/logout', (req, res) => {
  res.setCookie(ADMIN_COOKIE, '', { maxAge: 0 });
  res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (req, res) => {
  const { orders: list } = orders.listOrders({ limit: 20 });
  res.render('admin-dashboard', {
    page: 'admin',
    layout: 'admin-layout',
    view: 'admin-dashboard',
    title: 'Dashboard',
    stats: orders.orderStats(),
    recent: list,
    lowStock: catalog.lowStock(6),
    paymentMode: config.payment.mode,
    baseUrl: config.store.publicBaseUrl,
  });
});

app.get('/admin/orders', requireAdmin, (req, res) => {
  const { orders: list, total } = orders.listOrders({
    limit: 100,
    status: String(req.query.status || ''),
    search: String(req.query.q || ''),
  });
  res.render('admin-orders', {
    page: 'admin',
    layout: 'admin-layout',
    view: 'admin-orders',
    title: 'Orders',
    orders: list,
    total,
    filters: { status: String(req.query.status || ''), q: String(req.query.q || '') },
  });
});

app.get('/admin/orders/:orderNumber', requireAdmin, (req, res, next) => {
  const order = orders.getOrderByNumber(req.params.orderNumber);
  if (!order) return next();
  res.render('admin-order', {
    page: 'admin',
    layout: 'admin-layout',
    view: 'admin-order',
    title: `Order ${order.order_number}`,
    order,
    req,
    statuses: orders.ORDER_STATUSES,
    webhooks: dbAll('SELECT * FROM webhook_events WHERE order_id = ? OR decrypted LIKE ? ORDER BY id DESC LIMIT 20', order.order_number, `%${order.ott_reference}%`),
  });
});

app.post('/admin/orders/:orderNumber/status', requireAdmin, (req, res) => {
  const order = orders.getOrderByNumber(req.params.orderNumber);
  if (!order) return res.status(404).send('Not found');
  const status = String(req.body.status || '');
  try {
    orders.updateOrderStatus(order.id, status, req.body.adminNote ?? null);
    if (status === 'cancelled' && !order.paid_at) orders.restockOrder(order.id);
  } catch (err) {
    return res.status(400).send(err.message);
  }
  res.redirect(`/admin/orders/${order.order_number}`);
});

app.post('/admin/orders/:orderNumber/refund', requireAdmin, async (req, res) => {
  const order = orders.getOrderByNumber(req.params.orderNumber);
  if (!order) return res.status(404).send('Not found');

  if (!order.ott_payment_id && !order.ott_reference) {
    return res.status(400).send('This order has no payment to refund.');
  }
  const requested = req.body.full === '1'
    ? order.total_cents - order.refunded_cents
    : Math.round((Number.parseFloat(req.body.amount) || 0) * 100);

  if (requested <= 0 || requested > order.total_cents - order.refunded_cents) {
    return res.status(400).send('Invalid refund amount.');
  }

  const result = await payments.refundPayment({
    oriPaymentId: order.ott_payment_id || order.ott_reference,
    refundAmountCents: requested,
  });

  if (!result.ok) {
    orders.recordRefund({
      orderId: order.id,
      oriPaymentId: order.ott_payment_id,
      amountCents: requested,
      status: 'failure',
      reason: req.body.reason || '',
      responsePayload: result.error,
    });
    return res.redirect(`/admin/orders/${order.order_number}?refund=failed`);
  }

  orders.recordRefund({
    orderId: order.id,
    refundId: result.data.refundId,
    oriPaymentId: order.ott_payment_id,
    amountCents: requested,
    status: result.data.refundStatus === 'failure' ? 'failure' : 'success',
    reason: req.body.reason || '',
    responsePayload: result.data.responsePayload,
  });

  res.redirect(`/admin/orders/${order.order_number}?refund=ok`);
});

app.post('/admin/orders/:orderNumber/sync', requireAdmin, async (req, res) => {
  const order = orders.getOrderByNumber(req.params.orderNumber);
  if (!order) return res.status(404).send('Not found');
  const result = await payments.fetchPaymentStatus({ paymentId: order.ott_payment_id, reference: order.ott_reference });
  if (result.ok) {
    const status = String(result.data.paymentStatus || '').toLowerCase();
    if (payments.PAID_STATUSES.has(status) || status === 'success') {
      orders.applyPaymentResult({
        orderId: order.id,
        reference: order.ott_reference,
        result: { paymentStatus: 'captured', paymentId: result.data.paymentId, responsePayload: result.data.responsePayload },
      });
    }
  }
  res.redirect(`/admin/orders/${order.order_number}?sync=${result.ok ? 'ok' : 'failed'}`);
});

app.get('/admin/products', requireAdmin, (req, res) => {
  const { products, total } = catalog.listProducts({ limit: 200, sort: 'name' });
  res.render('admin-products', { page: 'admin', layout: 'admin-layout', view: 'admin-products', title: 'Catalogue', products, total });
});

app.post('/admin/products/:variantId/stock', requireAdmin, (req, res) => {
  const stock = Math.max(0, Math.min(100000, Number.parseInt(req.body.stock, 10) || 0));
  dbRun('UPDATE variants SET stock = ? WHERE id = ?', stock, Number(req.params.variantId));
  catalog.invalidateChrome();
  res.redirect(req.get('referer') || '/admin/products');
});

app.get('/admin/webhooks', requireAdmin, (req, res) => {
  res.render('admin-webhooks', {
    page: 'admin',
    layout: 'admin-layout',
    view: 'admin-webhooks',
    title: 'Payment callbacks',
    events: dbAll('SELECT * FROM webhook_events ORDER BY id DESC LIMIT 100'),
  });
});

app.get('/admin/settings', requireAdmin, (req, res) => {
  const review = validateConfig();
  res.render('admin-settings', {
    page: 'admin',
    layout: 'admin-layout',
    view: 'admin-settings',
    title: 'Settings',
    problems: review.problems,
    warnings: review.warnings,
    envPath: path.join(config.rootDir, '.env'),
  });
});

/* -------------------------------------------------------------------------- */
/*  Development visual probe                                                   */
/* -------------------------------------------------------------------------- */

/**
 * GET /dev/probe?path=/shop
 *
 * Loads the given storefront path in a hidden same-origin iframe and reports
 * measured layout facts (element geometry, computed colours, fonts, overflow).
 * Used to verify the rendered design without a human looking at a screenshot —
 * it doubles as a quick regression check for the stylesheet.
 */
/**
 * Dev tooling (development only).
 *
 *   GET /dev/probe?path=/shop   -> interactive wrapper page for a human
 *   GET /dev/audit?path=/shop   -> the real page with the probe script injected
 *
 * `/dev/audit` is what visual-check.mjs drives. A headless `--dump-dom` capture
 * finishes before a cross-document iframe's load event fires, so the measurement
 * script has to run inside the document being measured — this route fetches the
 * storefront page over the loopback interface and injects it.
 */
app.get('/dev/probe', (req, res) => {
  const target = String(req.query.path || '/');
  if (!target.startsWith('/')) return res.status(400).send('path must be site-relative');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>probe</title></head>
<body style="margin:0;background:#06100b;color:#f1ece0;font-family:monospace">
<p style="padding:24px">For automated checks use
<a style="color:#dcc07a" href="/dev/audit?path=${encodeURIComponent(target)}">/dev/audit?path=${security.escapeHtml(target)}</a>
— a headless <code>--dump-dom</code> capture does not wait for an iframe's load event.</p>
<script src="/js/dev-probe.js"></script>
</body></html>`);
});

app.get('/dev/audit', async (req, res) => {
  const target = String(req.query.path || '/');
  if (!target.startsWith('/') || target.startsWith('/dev/')) {
    return res.status(400).send('path must be a site-relative storefront path');
  }
  try {
    const upstream = await fetch(`http://127.0.0.1:${config.server.port}${target}`);
    let html = await upstream.text();
    const tag = '<script src="/js/dev-probe.js"></script>';
    html = html.includes('</body>') ? html.replace('</body>', `${tag}</body>`) : html + tag;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(html);
  } catch (err) {
    res.status(502).send(`Could not fetch ${target}: ${err.message}`);
  }
});

/* -------------------------------------------------------------------------- */
/*  Health check                                                               */
/* -------------------------------------------------------------------------- */

/**
 * GET /healthz
 *
 * A liveness check that is deliberately cheap but not vacuous: it touches the
 * database, so a service that cannot answer a query fails its health check
 * instead of serving errors. Used by Render (see render.yaml).
 */
app.get('/healthz', (req, res) => {
  try {
    const products = dbGet('SELECT COUNT(*) AS n FROM products')?.n ?? 0;
    res.json({
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      products,
      paymentMode: config.payment.mode,
      version: 1,
    });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/*  Errors                                                                     */
/* -------------------------------------------------------------------------- */

app.use((req, res) => {
  res.status(404);
  if (req.path.startsWith('/api/')) return res.json({ error: 'not_found' });
  renderPage(res, 'error', { page: 'error', title: 'Page not found', status: 404, message: 'We could not find that page. The tea is still out there.' });
});

app.use((err, req, res, _next) => {
  console.error('[error]', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'server', message: 'Something went wrong on our side.' });
  }
  // The status must be set on the response, not merely passed to the view:
  // rendering the error page with a 200 made a broken page look healthy to
  // every client, monitor and assertion that only checks the status code.
  res.status(500);
  renderPage(res, 'error', { page: 'error', title: 'Something went wrong', status: 500, message: 'An unexpected error occurred. Nothing has been charged.' });
});

/* -------------------------------------------------------------------------- */
/*  Listen                                                                     */
/* -------------------------------------------------------------------------- */

const port = config.server.port;
const host = config.server.host;

const server = app.listen(port, host, () => {
  const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
  console.log('');
  console.log(`  ${config.store.name} — ${config.store.tagline}`);
  console.log(`  Storefront      ${url}`);
  console.log(`  Admin           ${url}/admin  (${config.admin.email})`);
  console.log(`  Public base URL ${config.store.publicBaseUrl}`);
  console.log(`  Callback URL    ${config.store.publicBaseUrl}/api/ottpay/callback`);
  console.log('');
});

function shutdown(signal) {
  console.log(`\n${signal} received — closing.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
