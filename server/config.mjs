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

const ottBaseUrl =
  paymentMode === 'live'
    ? str('OTT_LIVE_BASE_URL', 'https://ecom-api.ottpay.com')
    : str('OTT_SANDBOX_BASE_URL', 'https://sandbox-api.ottpay.com');

const config = {
  rootDir: ROOT_DIR,
  env: str('NODE_ENV', 'development'),
  isProduction: str('NODE_ENV', 'development') === 'production',

  store: {
    name: str('STORE_NAME', 'Cha Yuan'),
    tagline: str('STORE_TAGLINE', 'Single-origin Chinese tea, sourced at the mountain.'),
    publicBaseUrl: str('PUBLIC_BASE_URL', 'http://localhost:3080').replace(/\/+$/, ''),
    currency: str('CURRENCY', 'CAD').toUpperCase(),
    currencySymbol: str('CURRENCY_SYMBOL', '$'),
    freeShippingThreshold: Math.round(num('FREE_SHIPPING_THRESHOLD', 79) * 100),
    flatShippingFee: Math.round(num('FLAT_SHIPPING_FEE', 9.5) * 100),
    taxRate: num('TAX_RATE', 0.13),
    taxLabel: str('TAX_LABEL', 'HST (13%)'),
  },

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
    email: str('ADMIN_EMAIL', 'owner@chayuan.test').toLowerCase(),
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
  adminEmail: 'owner@chayuan.test',
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
