/**
 * Security helpers: password hashing, signed session cookies, CSRF tokens,
 * HTML escaping and simple in-memory rate limiting.
 *
 * No external auth library — everything here is Node's own crypto.
 */
import crypto from 'node:crypto';
import config from './config.mjs';

/* ------------------------------------------------------------ password hash */

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** scrypt hash, stored as  scrypt$N$r$p$salt$hash  (all hex/base64url). */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return [
    'scrypt',
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltB64, hashB64] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64url');
    const expected = Buffer.from(hashB64, 'base64url');
    const derived = crypto.scryptSync(String(password), salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Constant-time string comparison that tolerates differing lengths. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still do a comparison so timing does not leak length.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/* --------------------------------------------------------- signed cookies */

function hmac(value) {
  return crypto.createHmac('sha256', config.server.sessionSecret).update(value).digest('base64url');
}

/** Serialise a payload into a tamper-evident token: base64url(json).signature */
export function signToken(payload, ttlSeconds = 60 * 60 * 12) {
  const body = { ...payload, exp: Date.now() + ttlSeconds * 1000, nonce: crypto.randomBytes(8).toString('hex') };
  const encoded = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url');
  return `${encoded}.${hmac(encoded)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  if (!safeEqual(signature, hmac(encoded))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------- CSRF */

export function newCsrfToken() {
  return crypto.randomBytes(24).toString('base64url');
}

/** Double-submit check: cookie value must equal the submitted value. */
export function csrfValid(cookieToken, submittedToken) {
  if (!cookieToken || !submittedToken) return false;
  return safeEqual(cookieToken, submittedToken);
}

/* ------------------------------------------------------------- escaping */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* -------------------------------------------------------- rate limiting */

/** @type {Map<string, {count:number, resetAt:number}>} */
const buckets = new Map();

/**
 * Fixed-window rate limiter.
 * @returns {{allowed:boolean, remaining:number, retryAfterSeconds:number}}
 */
export function rateLimit(key, { limit = 30, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Periodically drop expired buckets so memory does not grow without bound. */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 60_000).unref();

/* ----------------------------------------------------- request utilities */

/** Best-effort client IP that respects TRUST_PROXY. */
export function clientIp(req) {
  if (config.server.trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Pick only the browser fields the 3DS2 SDK needs, from a client-supplied object.
 * Never trust anything else from the client into the OTT Pay payload.
 */
export function collectBrowserFingerprint(input = {}, req = null) {
  const num = (v, fallback = '') => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? String(n) : fallback;
  };
  return {
    userAgent: String(input.userAgent || req?.headers['user-agent'] || '').slice(0, 512),
    acceptHeader: String(input.acceptHeader || req?.headers.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8').slice(0, 512),
    language: String(input.language || req?.headers['accept-language'] || 'en-CA').split(',')[0].slice(0, 35),
    javaScriptEnabled: input.javaScriptEnabled !== false,
    javaEnabled: false,
    screenHeight: num(input.screenHeight),
    screenWidth: num(input.screenWidth),
    timezoneOffset: num(input.timezoneOffset),
    colorDepth: num(input.colorDepth, '24'),
  };
}

/* -------------------------------------------------- card input validation */

/** Luhn check. */
export function luhn(number) {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Validate a card year/month pair and reject past dates. */
export function expiryValid(month, year) {
  const m = Number.parseInt(month, 10);
  let y = Number.parseInt(year, 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) return false;
  if (!Number.isFinite(y)) return false;
  if (y < 100) y += 2000;
  const now = new Date();
  const end = new Date(y, m, 0, 23, 59, 59);
  return end >= now && y <= now.getFullYear() + 20;
}

/** Validate UK/CA/US-style and international postal codes loosely. */
export function postalValid(value, country = 'CA') {
  const v = String(value || '').trim().toUpperCase();
  if (v.length < 3 || v.length > 10) return false;
  if (country === 'CA') return /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/.test(v);
  if (country === 'US') return /^\d{5}(-\d{4})?$/.test(v);
  return /^[A-Z0-9][A-Z0-9 -]{2,9}$/.test(v);
}

export function emailValid(value) {
  const v = String(value || '').trim();
  return v.length >= 5 && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v);
}

export default {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  newCsrfToken,
  csrfValid,
  escapeHtml,
  rateLimit,
  clientIp,
  collectBrowserFingerprint,
  luhn,
  expiryValid,
  postalValid,
  emailValid,
  safeEqual,
};
