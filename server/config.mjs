/**
 * Configuration loader.
 * Reads .env (simple KEY=VALUE parser, no dependency) and exposes a frozen,
 * validated config object. Fails loudly when a live/sandbox payment mode is
 * selected without the credentials it needs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');

/** Parse a .env file into a plain object. Supports quotes, `export`, comments. */
function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    let key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    let value = line.slice(eq + 1).trim();
    // Strip a trailing comment that is not inside quotes.
    if (!/^["']/.test(value)) {
      const hash = value.indexOf(' #');
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Load .env then .env.local (local wins), without clobbering real env vars. */
function loadEnv() {
  const merged = {
    ...parseEnvFile(path.join(ROOT_DIR, '.env')),
    ...parseEnvFile(path.join(ROOT_DIR, '.env.local')),
  };
  for (const [k, v] of Object.entries(merged)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnv();

const str = (key, fallback = '') => {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
};
const num = (key, fallback) => {
  const v = Number.parseFloat(str(key, String(fallback)));
  return Number.isFinite(v) ? v : fallback;
};
const bool = (key, fallback = false) => {
  const v = str(key, fallback ? '1' : '0').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
};

const PAYMENT_MODES = ['mock', 'sandbox', 'live'];
const paymentMode = str('PAYMENT_MODE', 'mock').toLowerCase();

/**
 * Sample trading details, used until the operator supplies the real ones.
 *
 * They are deliberately British-Columbia-shaped rather than generic, because a
 * placeholder that looks plausible is easier to spot on a page than one that
 * looks like a placeholder — and the pages say outright that they are samples.
 */
/**
 * The trading entity.
 *
 * Real details, supplied by the operator. The company is registered in Markham,
 * Ontario, which is why the shop charges Ontario HST at 13% — the tax line and
 * the address now agree with each other, and the placeholder note that used to
 * sit on /contact is gone for the fields that are filled in below.
 *
 * Two numbers are still outstanding and are marked so on the page rather than
 * being invented: the Ontario corporate registration number and the HST
 * registration number. Both are on the operator to supply; until then the site
 * says "to be supplied" next to them instead of printing a plausible-looking
 * false number, because a registration number is the one thing on a policy page
 * that someone might actually look up.
 *
 * The trading entity and the fulfilment location are separate things: this is
 * where the company is registered, and every parcel ships from China.
 */
const COMPANY_DEFAULTS = {
  legalName: 'Bridgeport Global Inc.',
  address: '4-400 Esna Park Drive|Markham, Ontario L3R 3K2|Canada',
  country: 'Canada',
  // Left blank on purpose — see the note above.
  registrationNumber: '',
  taxNumber: '',
  /*
   * Where customers send a return.
   *
   * Defaults to the registered office, which is what the operator asked for: the
   * goods ship from the warehouse in China, but returns come back to Markham. The
   * variable exists so a warehouse address can replace it later without a code
   * change — an address that holds no stock is only a good returns address while
   * somebody there is actually receiving and inspecting parcels, and that is the
   * operator's call, not a default worth guessing.
   *
   * One row per line, separated by "|", exactly like COMPANY_ADDRESS. Empty means
   * "use the registered office".
   */
  returnsAddress: str('COMPANY_RETURNS_ADDRESS', ''),
  /*
   * Two addresses, for two different jobs.
   *
   * `support@` is what the site prints, because every one of its uses is a
   * customer who needs something done — an order, a return, a question before
   * buying. `privacy@` is separate so an access or deletion request does not
   * queue behind order mail and get answered late; that is the address a data
   * protection regulator expects to find, and the one a customer is most likely
   * to be anxious about.
   *
   * `info@` and `hello@` are still worth having as aliases in Fastmail, so mail
   * sent to the conventional prefixes arrives instead of bouncing — a supplier
   * will guess `info@` before they read the footer.
   */
  email: 'support@bridgeportglobalinc.com',
  privacyEmail: 'privacy@bridgeportglobalinc.com',
  phone: '+1 (942) 380-9665',
};

/**
 * WhatsApp, which is the one messaging channel this shop uses.
 *
 * The number is supplied later, so this is `null` until then and nothing is
 * rendered anywhere. That matters: a WhatsApp button pointing at a number
 * nobody answers is worse than no button at all, and it is the kind of link
 * that gets published once and never tested again.
 *
 * Give the number in international form and the link is built here:
 *
 *   WHATSAPP_NUMBER=+86 138 0013 8000
 *
 * Punctuation and spaces are stripped for the `wa.me` URL and kept for the
 * label, because "wa.me/8613800138000" is unreadable to a customer and a
 * hand-written `wa.me` link is easy to get subtly wrong. Set WHATSAPP_URL
 * instead if you have a full link (a `chat.whatsapp.com` group invite, say).
 *
 * A short number is rejected rather than published: fewer than eight digits is
 * a typo, not a phone number, and it would render a button that goes nowhere.
 */
function buildWhatsApp() {
  const url = str('WHATSAPP_URL').trim();
  const raw = str('WHATSAPP_NUMBER').trim();
  if (url) return { url, display: raw || url, label: 'WhatsApp' };

  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 8) return null;

  return {
    url: `https://wa.me/${digits}`,
    display: raw.startsWith('+') ? raw : `+${raw}`,
    label: 'WhatsApp',
  };
}

const ottBaseUrl =
  paymentMode === 'live'
    ? str('OTT_LIVE_BASE_URL', 'https://ecom-api.ottpay.com')
    : str('OTT_SANDBOX_BASE_URL', 'https://sandbox-api.ottpay.com');

const config = {
  rootDir: ROOT_DIR,
  env: str('NODE_ENV', 'development'),
  isProduction: str('NODE_ENV', 'development') === 'production',

  store: {
    name: str('STORE_NAME', 'Bridgeport Global'),
    /*
     * The word under the wordmark. It used to read "CHINESE TEA", which was true
     * when the shop sold one thing; it now sells tea and beaded bracelets, so the
     * line names both. It is a separate setting from the name because it is
     * letter-spaced artwork rather than prose, and changing one should not force
     * changing the other.
     */
    logoSubtitle: str('STORE_LOGO_SUBTITLE', 'TEA & JEWELLERY'),
    tagline: str('STORE_TAGLINE', 'Chinese tea and beaded jewellery, bought in small lots.'),
    publicBaseUrl: str('PUBLIC_BASE_URL', 'http://localhost:3080').replace(/\/+$/, ''),
    currency: str('CURRENCY', 'CAD').toUpperCase(),
    currencySymbol: str('CURRENCY_SYMBOL', '$'),
    freeShippingThreshold: Math.round(num('FREE_SHIPPING_THRESHOLD', 79) * 100),
    flatShippingFee: Math.round(num('FLAT_SHIPPING_FEE', 9.5) * 100),
    taxRate: num('TAX_RATE', 0.13),
    taxLabel: str('TAX_LABEL', 'HST (13%)'),
  },

  /*
   * The trading entity behind the shop.
   *
   * A policy page that names no legal entity, no address and no reachable
   * contact is not a policy page — card scheme rules and consumer law both
   * require the customer to be able to find out who they are buying from. Every
   * value here is an environment variable, so the real registration can be
   * filled in on the host without touching code.
   */
  company: {
    legalName: str('COMPANY_LEGAL_NAME', COMPANY_DEFAULTS.legalName),
    tradingName: str('COMPANY_TRADING_NAME', str('STORE_NAME', 'Bridgeport Global')),
    addressLines: str('COMPANY_ADDRESS', COMPANY_DEFAULTS.address)
      .split('|')
      .map((line) => line.trim())
      .filter(Boolean),
    country: str('COMPANY_COUNTRY', COMPANY_DEFAULTS.country),
    registrationNumber: str('COMPANY_REGISTRATION_NUMBER', COMPANY_DEFAULTS.registrationNumber),
    taxNumber: str('COMPANY_TAX_NUMBER', COMPANY_DEFAULTS.taxNumber),
    /*
     * Where returns go: the configured warehouse address if one has been
     * supplied, otherwise the registered office. See COMPANY_DEFAULTS.
     * returnsAddress.
     */
    returnsAddressLines: (() => {
      const given = str('COMPANY_RETURNS_ADDRESS', COMPANY_DEFAULTS.returnsAddress)
        .split('|')
        .map((line) => line.trim())
        .filter(Boolean);
      if (given.length) return given;
      return str('COMPANY_ADDRESS', COMPANY_DEFAULTS.address)
        .split('|')
        .map((line) => line.trim())
        .filter(Boolean);
    })(),
    /** True when returns go somewhere other than the registered office. */
    returnsAtWarehouse: str('COMPANY_RETURNS_ADDRESS', COMPANY_DEFAULTS.returnsAddress).trim() !== '',
    get hasReturnsAddress() {
      return this.returnsAddressLines.length > 0;
    },
    contactPerson: str('COMPANY_CONTACT_PERSON', 'Customer service'),
    email: str('COMPANY_EMAIL', COMPANY_DEFAULTS.email),
    privacyEmail: str('COMPANY_PRIVACY_EMAIL', COMPANY_DEFAULTS.privacyEmail),
    phone: str('COMPANY_PHONE', COMPANY_DEFAULTS.phone),
    hours: str('COMPANY_HOURS', 'Monday to Friday, 9:00am to 6:00pm'),
    responseTime: str('COMPANY_RESPONSE_TIME', 'one business day'),

    /*
     * Which details are still missing, field by field.
     *
     * The company name, address, phone and email are real now; the Ontario
     * corporate number and the HST number are not, and are left empty rather
     * than filled with something that looks real. A single "these are samples"
     * flag no longer says the right thing — most of the block is genuine — so the
     * page marks the individual rows instead.
     *
     * Both fields are empty rather than invented because a registration number
     * is the one line on a policy page a customer or a card scheme might actually
     * look up, and a plausible false one is worse than an obvious gap.
     */
    missing: {
      registrationNumber: str('COMPANY_REGISTRATION_NUMBER', COMPANY_DEFAULTS.registrationNumber) === '',
      taxNumber: str('COMPANY_TAX_NUMBER', COMPANY_DEFAULTS.taxNumber) === '',
    },

    /** True while anything at all is still outstanding. */
    get isPlaceholder() {
      return this.missing.registrationNumber || this.missing.taxNumber;
    },
  },

  /**
   * Messaging.
   *
   * `null` until a number is supplied — see buildWhatsApp below. Every surface
   * that offers WhatsApp checks for null first, so the shop simply does not
   * mention a channel it cannot answer on yet.
   */
  whatsapp: buildWhatsApp(),

  payment: {
    mode: PAYMENT_MODES.includes(paymentMode) ? paymentMode : 'mock',
    isMock: paymentMode === 'mock',
    appId: str('OTT_APP_ID'),
    appKey: str('OTT_APP_KEY'),
    // In mock mode a stand-in sign key keeps the callback pipeline (AES-128-ECB
    // decryption, dedupe, reconciliation) exercisable without credentials.
    signKey: str('OTT_SIGN_KEY') || (paymentMode === 'mock' ? 'MOCK-SIGN-KEY-0001' : ''),
    merchantId: str('OTT_MERCHANT_ID') || (paymentMode === 'mock' ? 'MOCK0000001' : ''),
    baseUrl: ottBaseUrl.replace(/\/+$/, ''),
    tokenTtlSeconds: num('OTT_TOKEN_TTL_SECONDS', 900),
    tokenRefreshSkewSeconds: num('OTT_TOKEN_REFRESH_SKEW_SECONDS', 60),
    httpTimeoutMs: num('OTT_HTTP_TIMEOUT_MS', 30000),
    kount: {
      clientId: str('KOUNT_CLIENT_ID'),
      environment: str('KOUNT_ENVIRONMENT', 'TEST').toUpperCase(),
      enabled: str('KOUNT_CLIENT_ID') !== '',
    },
  },

  server: {
    port: num('PORT', 3080),
    host: str('HOST', '127.0.0.1'),
    trustProxy: bool('TRUST_PROXY', false),
    sessionSecret: str('SESSION_SECRET', 'insecure-dev-secret-change-me'),
  },

  admin: {
    email: str('ADMIN_EMAIL', 'owner@bridgeportglobalinc.test').toLowerCase(),
    password: str('ADMIN_PASSWORD', 'changeme-please'),
  },

  databaseFile: path.isAbsolute(str('DATABASE_FILE', './data/shop.db'))
    ? str('DATABASE_FILE', './data/shop.db')
    : path.join(ROOT_DIR, str('DATABASE_FILE', './data/shop.db')),
};

/**
 * Credentials that ship in .env.example, which is a public file. If any of these
 * reach a production deployment they are not defaults, they are published
 * passwords: `/admin` would be open to anyone who has seen the repository.
 */
const PUBLIC_DEFAULTS = {
  adminPassword: 'changeme-please',
  adminEmail: 'owner@bridgeportglobalinc.test',
  sessionSecret: 'change-me-to-a-long-random-string',
};

/** True when a value is empty, or is one of the documented placeholder values. */
function isPlaceholder(value, known) {
  const v = String(value ?? '').trim();
  return v === '' || v.includes('change-me') || v === known;
}

/**
 * Configuration review.
 *
 * Returns two lists, and the distinction matters on a platform like Render:
 *
 *   `problems`  — the service cannot work, or would be unsafe. A production
 *                 deployment still using the published admin password, for
 *                 example. Fatal.
 *   `warnings`  — the service runs but something is not right yet. A missing
 *                 `PUBLIC_BASE_URL` is the important case: on a first deploy you
 *                 cannot know the hostname until Render has created the service,
 *                 so refusing to boot would produce a crash loop that prevents
 *                 you from ever reading the URL you need.
 */
export function validateConfig(cfg = config) {
  const problems = [];
  const warnings = [];
  const { mode } = cfg.payment;

  if (mode !== 'mock') {
    if (!cfg.payment.appId) problems.push(`OTT_APP_ID is required when PAYMENT_MODE=${mode}`);
    if (!cfg.payment.appKey) problems.push(`OTT_APP_KEY is required when PAYMENT_MODE=${mode}`);
    if (!cfg.payment.signKey) problems.push('OTT_SIGN_KEY is required to decrypt payment callbacks');
    if (!cfg.payment.merchantId) problems.push('OTT_MERCHANT_ID is required');
  }

  if (cfg.isProduction) {
    // ---------------------------------------------------------------- secrets
    if (isPlaceholder(cfg.server.sessionSecret, PUBLIC_DEFAULTS.sessionSecret)) {
      problems.push(
        'SESSION_SECRET is empty or still the placeholder from .env.example. '
          + 'Admin session cookies are signed with it, so anyone can forge one. '
          + 'Render generates this automatically when it is omitted from the blueprint.',
      );
    }

    if (isPlaceholder(cfg.admin.password, PUBLIC_DEFAULTS.adminPassword)) {
      problems.push(
        'ADMIN_PASSWORD is empty or still "changeme-please", which is published in .env.example. '
          + 'Set it in the Render dashboard before going live — until then /admin is open to anyone.',
      );
    }

    if (isPlaceholder(cfg.admin.email, PUBLIC_DEFAULTS.adminEmail)) {
      warnings.push(
        'ADMIN_EMAIL is still the example address. It only has to be a login name, '
          + 'but the browser will offer to save it as a password for that domain.',
      );
    }

    // --------------------------------------------------------------- network
    if (!cfg.store.publicBaseUrl.startsWith('https://')) {
      warnings.push(
        `PUBLIC_BASE_URL is "${cfg.store.publicBaseUrl}", which OTT Pay cannot reach. `
          + 'Set it to this service\'s public https URL, or card payments cannot complete.',
      );
    }
    if (!cfg.server.trustProxy) {
      warnings.push('TRUST_PROXY is off — behind a reverse proxy, rate limiting sees the proxy IP for every request');
    }
  }

  return { problems, warnings };
}

/** Backwards-compatible helper: just the fatal list. */
export function configProblems(cfg = config) {
  return validateConfig(cfg).problems;
}

export default config;
