/**
 * OTT Pay — Local Card 3-D Secure (3DS2) payment client.
 *
 * Implements exactly the calls documented at https://apidocs.ottpay.com/api/
 *
 *   1. POST /api/v1/auth/token                          -> JWT bearer (lives 15 min)
 *   2. POST /api/v1/payment/local-card/payment3dsV2     -> authorise, or a 3DS challenge form
 *   3. POST /api/v1/payment/status-query                -> authoritative status
 *   4. POST /api/v1/payment/local-card/refund           -> refund
 *   5. Callback (webhook) POST to our callBackURL, AES-128-ECB encrypted with a
 *      key derived from  MD5_16( md5_from_callback + signKey )  (uppercase).
 *
 * Security notes that this module deliberately enforces:
 *   - appKey / signKey never leave the server.
 *   - The PAN and CVV2 are used to build the request and then discarded; they are
 *     written to no log, no database column and no error message.
 *   - Only the card brand and the last four digits are ever persisted.
 */
import crypto from 'node:crypto';
import config from './config.mjs';

export class OttPayError extends Error {
  constructor(message, { code = '', httpStatus = 0, payload = null, endpoint = '' } = {}) {
    super(message);
    this.name = 'OttPayError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.payload = payload;
    this.endpoint = endpoint;
  }
}

/** Human-readable meaning for the documented API response codes. */
export const OTT_ERROR_CODES = {
  10001: 'Transaction processing — user is processing the payment.',
  10002: 'Password is incorrect / authorisation failed.',
  10003: 'API authorisation failed — the appId and appKey pair was not found.',
  10005: 'Invalid parameter — a parameter is the wrong format.',
  10006: 'Parameter error — an input parameter is incorrect.',
  10200: 'Gateway error — OTT gateway error response.',
  20003: 'Not a pre-authorised payment.',
  20004: 'Database error at OTT Pay.',
  20005: 'No permission for the merchant — account not found, disabled, or not configured for this transaction type.',
  20007: 'Insufficient balance — the card does not cover the payment, or there are not enough funds to refund.',
  20008: 'Unsupported card — the card type was not recognised, or the read was interrupted.',
  20009: 'Payment closed — the payment is already closed.',
  20014: 'Refund amount greater than the amount paid.',
  20019: 'Original payment does not exist — the payment id was not found.',
  20020: 'Original payment has been finished.',
  20021: 'Original payment does not support revocation.',
  20030: 'Payment failed — declined with no financial impact.',
  20031: 'No channel supported.',
  20034: 'Other case — an error not covered by the list.',
  20041: 'The payment cannot be refunded — it has already been fully refunded.',
  50001: 'Failure — the payment failed.',
  50002: 'Timeout — declined by timeout, or approved then reversed.',
  50003: 'System error — no response received for the request.',
  90000: 'Unauthorized — the access token is invalid.',
};

/** Payment state codes from the status-query API. */
export const PAYMENT_STATES = {
  P00001: { status: 'init', label: 'Payment initiated' },
  P00002: { status: 'authorized', label: 'Payment authorised' },
  P00003: { status: 'success', label: 'Payment captured successfully' },
  P00004: { status: 'fully_refunded', label: 'Payment fully refunded' },
  P00005: { status: 'partial_refunded', label: 'Payment partially refunded' },
  P00006: { status: 'orderclosed', label: 'Payment refused' },
  P00007: { status: 'orderclosed', label: 'Payment voided' },
  P00008: { status: 'orderclosed', label: 'Payment failed' },
  P00009: { status: 'fully_reversal', label: 'Payment fully reversed' },
  P00010: { status: 'orderclosed', label: 'Payment expired' },
  P00011: { status: 'orderclosed', label: 'Payment capture failed' },
  P00012: { status: 'success', label: 'Refund successful' },
  P00013: { status: 'init', label: 'Refund initiated' },
  P00014: { status: 'failure', label: 'Refund failed' },
  P00015: { status: 'init', label: 'Void initiated' },
  P00016: { status: 'success', label: 'Void successful' },
  P00017: { status: 'failure', label: 'Void failed' },
};

/** Statuses that mean the money is captured / the order may be fulfilled. */
export const PAID_STATUSES = new Set(['authorised', 'authorized', 'captured', 'success', 'settled']);

/* -------------------------------------------------------------------------- */
/*  Token cache                                                                */
/* -------------------------------------------------------------------------- */

/** @type {{ token: string, expiresAtMs: number } | null} */
let cachedToken = null;
/** In-flight token request, so concurrent checkouts reuse one call. */
let tokenInFlight = null;

export function clearTokenCache() {
  cachedToken = null;
  tokenInFlight = null;
}

function tokenIsFresh() {
  if (!cachedToken?.token) return false;
  const skewMs = config.payment.tokenRefreshSkewSeconds * 1000;
  return Date.now() < cachedToken.expiresAtMs - skewMs;
}

/**
 * Obtain a bearer token: POST /api/v1/auth/token
 * Cached in memory and refreshed before its 15 minute lifetime expires.
 */
export async function getToken({ force = false } = {}) {
  if (!force && tokenIsFresh()) return cachedToken.token;
  if (tokenInFlight) return tokenInFlight;

  tokenInFlight = (async () => {
    const body = { appId: config.payment.appId, appKey: config.payment.appKey };
    const json = await ottFetch('/api/v1/auth/token', body, { auth: false, endpoint: 'auth/token' });
    const token = json?.result?.token;
    if (!token) {
      throw new OttPayError('OTT Pay did not return a bearer token', {
        code: json?.result?.code ?? '',
        payload: safePayload(json),
        endpoint: 'auth/token',
      });
    }
    const expired = Number(json.result.expired);
    cachedToken = {
      token,
      expiresAtMs: Number.isFinite(expired) && expired > 0 ? expired : Date.now() + config.payment.tokenTtlSeconds * 1000,
    };
    return token;
  })().finally(() => {
    tokenInFlight = null;
  });

  return tokenInFlight;
}

/* -------------------------------------------------------------------------- */
/*  Low-level transport                                                        */
/* -------------------------------------------------------------------------- */

function redactForLog(value) {
  if (!value || typeof value !== 'object') return value;
  const copy = Array.isArray(value) ? [...value] : { ...value };
  for (const key of ['accountNumber', 'cvn2', 'appKey', 'accountExpire']) {
    if (key in copy) copy[key] = '***';
  }
  return copy;
}

export const safePayload = redactForLog;

async function ottFetch(pathname, body, { auth = true, endpoint = pathname, method = 'POST' } = {}) {
  const url = `${config.payment.baseUrl}${pathname}`;
  const headers = { 'Content-Type': 'application/json; charset=UTF-8', Accept: 'application/json' };
  if (auth) headers.Authorization = `Bearer ${await getToken()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.payment.httpTimeoutMs);

  let response;
  let text = '';
  try {
    response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    text = await response.text();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new OttPayError(`OTT Pay request to ${endpoint} timed out after ${config.payment.httpTimeoutMs} ms`, {
        code: '50002',
        endpoint,
      });
    }
    throw new OttPayError(`Could not reach OTT Pay (${endpoint}): ${err.message}`, { code: '50003', endpoint });
  }
  clearTimeout(timer);

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new OttPayError(`OTT Pay returned a non-JSON response from ${endpoint}`, {
      httpStatus: response.status,
      endpoint,
      payload: { raw: text.slice(0, 400) },
    });
  }

  if (!response.ok) {
    throw new OttPayError(
      `OTT Pay HTTP ${response.status} from ${endpoint}${json?.result?.message ? `: ${json.result.message}` : ''}`,
      { httpStatus: response.status, code: json?.result?.code ?? '', payload: safePayload(json), endpoint },
    );
  }

  if (json && json.status && json.status !== 'SUCCESS') {
    const code = json.result?.code ?? '';
    throw new OttPayError(
      `OTT Pay error from ${endpoint}: ${json.result?.message || 'unknown'}${OTT_ERROR_CODES[code] ? ` (${OTT_ERROR_CODES[code]})` : ''}`,
      { code, payload: safePayload(json), endpoint },
    );
  }

  return json;
}

/* -------------------------------------------------------------------------- */
/*  1. Local card 3DS payment                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Pay by local card with 3-D Secure 2.
 * POST /api/v1/payment/local-card/payment3dsV2
 *
 * @param {object} args
 * @param {number} args.amountCents       Total in cents. 100 == one dollar.
 * @param {object} args.card              { number, holder, expiry (MMYY), cvv }
 * @param {object} args.avs               { address, city, province, country (ISO2), zip }
 * @param {object} args.browser           Browser/device fields for the 3DS2 SDK.
 * @param {string} args.kountSessionId    KOUNT DDC session id (<=32 alnum/-/_ chars).
 * @param {string} args.email             Shopper email.
 * @param {string} args.reference         Our order reference (also returned in the callback).
 * @param {string} args.callbackUrl       Server-to-server result notification.
 * @param {string} args.frontUrl          Where the cardholder returns to.
 * @returns {Promise<object>} { status, paymentStatus, paymentId, reference, ... }
 */
export async function pay3ds({
  amountCents,
  card,
  avs,
  browser = {},
  kountSessionId = '',
  email = '',
  reference,
  callbackUrl,
  frontUrl,
}) {
  if (!config.payment.isMock) {
    assertCredentials();
  }

  // 3DS2 wants a session id for the challenge; derive a deterministic one from
  // the KOUNT session id when we have one (per OTT Pay's specification).
  const challengeSessionId = (kountSessionId || `${reference}`).replace(/[^0-9A-Za-z]/g, '').slice(0, 32).toUpperCase();

  const payload = {
    accountNumber: String(card.number).replace(/[\s-]/g, ''),
    accountName: String(card.holder || '').trim(),
    accountExpire: String(card.expiry).replace(/[^0-9]/g, '').slice(0, 4),
    cvn2: String(card.cvv).replace(/[^0-9]/g, '').slice(0, 4),
    sslAvsAddress: String(avs.address || '').slice(0, 50),
    sslAvsCity: String(avs.city || '').slice(0, 40),
    sslAvsProvince: String(avs.province || '').slice(0, 40),
    sslAvsCountry: String(avs.country || 'CA').slice(0, 2).toUpperCase(),
    sslAvsZip: String(avs.zip || '').slice(0, 10),
    amount: Math.round(amountCents),
    callBackURL: callbackUrl,
    frontURL: frontUrl,
    sslEciInd: '',
    ssl3dsecureValue: '',
    sslDirServerTranId: '',
    reference: String(reference),
    sessionId: kountSessionId || '',
    email: String(email || ''),
    purchase3DSAddition: {
      version: '2.1.0',
      sessionID: challengeSessionId,
      browserUserAgent: String(browser.userAgent || '').slice(0, 512),
      browserAcceptHeader: String(browser.acceptHeader || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8').slice(0, 512),
      browserLanguage: String(browser.language || 'en-CA').slice(0, 35),
      browserJavaScriptEnabledVal: browser.javaScriptEnabled === false ? '0' : '1',
      browserJavaEnabledVal: '2',
      browserScreenHeight: String(browser.screenHeight ?? ''),
      browserScreenWidth: String(browser.screenWidth ?? ''),
      browserTimezone: String(browser.timezoneOffset ?? ''),
      browserScreenColorDepth: String(browser.colorDepth ?? '24'),
    },
  };

  const label = safePayload(payload);
  const json = await ottFetch('/api/v1/payment/local-card/payment3dsV2', payload, {
    endpoint: 'payment/local-card/payment3dsV2',
  });

  const result = json?.result ?? {};
  return {
    status: json?.status ?? 'ERROR',
    paymentStatus: result.paymentStatus ?? '',
    paymentId: result.paymentId ?? '',
    reference: result.reference ?? reference,
    ccType: result.ccType ?? '',
    amount: result.amount ?? '',
    receiptAmount: result.receiptAmount ?? '',
    totalAmount: result.totalAmount ?? '',
    tradeTime: result.tradeTime ?? '',
    escape3DSChallengeForm: result.escape3DSChallengeForm ?? '',
    requestPayload: label,
    responsePayload: safePayload(json),
  };
}

/** POST /api/v1/payment/status-query */
export async function queryStatus({ paymentId }) {
  if (!config.payment.isMock) assertCredentials();
  const json = await ottFetch('/api/v1/payment/status-query', { paymentId }, { endpoint: 'payment/status-query' });
  const r = json?.result ?? {};
  return {
    paymentId: r.paymentId ?? paymentId,
    totalAmount: r.totalAmount ?? '',
    receiptAmount: r.receiptAmount ?? '',
    payAmount: r.payAmount ?? '',
    refundAmount: r.refundAmount ?? '',
    paymentStatus: r.paymentStatus ?? '',
    stateCode: r.stateCode ?? '',
    tradeTime: r.tradeTime ?? '',
    reference: r.reference ?? '',
    responsePayload: safePayload(json),
  };
}

/** POST /api/v1/payment/local-card/refund */
export async function refund({ oriPaymentId, refundAmountCents }) {
  if (!config.payment.isMock) assertCredentials();
  const json = await ottFetch(
    '/api/v1/payment/local-card/refund',
    { oriPaymentId, refundAmount: Math.round(refundAmountCents) },
    { endpoint: 'payment/local-card/refund' },
  );
  const r = json?.result ?? {};
  return {
    refundId: r.refundId ?? '',
    refundAmount: r.refundAmount ?? '',
    refundStatus: r.refundStatus ?? '',
    tradeTime: r.tradeTime ?? '',
    responsePayload: safePayload(json),
  };
}

/* -------------------------------------------------------------------------- */
/*  2. Callback decryption                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Derive the AES-128 decryption key from the callback `md5` field and our signKey.
 *
 * OTT Pay's documented steps:
 *   1. concatenate  md5 + signKey
 *   2. MD5 the result, uppercase — the "16 bit" MD5 form
 *   3. use that as the AES-128 key (ECB mode)
 *
 * Their worked example pins down exactly which 16 characters "16 bit MD5" means.
 * With md5 = 5A917182659DE14DCB3022CA6518F34F and signKey = A8B5FE540E38A5A9 the
 * 32-character digest is
 *
 *     38315225 BFE59D83C221F217 27E31BE4
 *     └──────┘ └──────────────┘ └──────┘
 *              documented key
 *
 * so the key is the MIDDLE 16 hex characters (slice 8..24), not the leading
 * ones. `decryptCallback` still tries the other two framings so no real callback
 * can be lost to a documentation ambiguity.
 */
export function deriveCallbackKey(md5FromCallback, signKey = config.payment.signKey) {
  if (!signKey) throw new OttPayError('OTT_SIGN_KEY is not configured — cannot verify payment callbacks');
  const digest = crypto.createHash('md5').update(`${md5FromCallback}${signKey}`, 'utf8').digest('hex').toUpperCase();
  return digest.slice(8, 24);
}

/** Every key framing OTT Pay has been observed to use, documented first. */
export function candidateCallbackKeys(md5FromCallback, signKey = config.payment.signKey) {
  if (!signKey) throw new OttPayError('OTT_SIGN_KEY is not configured — cannot verify payment callbacks');
  const digest = crypto.createHash('md5').update(`${md5FromCallback}${signKey}`, 'utf8').digest('hex').toUpperCase();
  return [
    digest.slice(8, 24), // middle 16 — matches OTT Pay's documented example
    digest.slice(0, 16), // leading 16
    digest.slice(16, 32), // trailing 16
  ];
}

/**
 * Decrypt an OTT Pay callback body.
 * @param {object} body     The parsed POST body: { data, md5, rsp_code, rsp_msg, merchant_id }
 * @param {string} [signKey] Override for tests; defaults to OTT_SIGN_KEY.
 * @returns {{ ok: boolean, payload: object|null, key: string, error?: string }}
 */
export function decryptCallback(body, signKey = config.payment.signKey) {
  const md5 = body?.md5 ?? '';
  const data = body?.data ?? '';
  if (!md5 || !data) return { ok: false, payload: null, key: '', error: 'Callback is missing `md5` or `data`' };

  let keys;
  try {
    keys = candidateCallbackKeys(md5, signKey);
  } catch (err) {
    return { ok: false, payload: null, key: '', error: err.message };
  }

  const raw = Buffer.from(data, 'base64');
  let lastError = '';
  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv('aes-128-ecb', Buffer.from(key, 'utf8'), null);
      decipher.setAutoPadding(true);
      const decrypted = Buffer.concat([decipher.update(raw), decipher.final()]).toString('utf8');
      return { ok: true, payload: JSON.parse(decrypted), key };
    } catch (err) {
      lastError = err.message;
    }
  }
  return { ok: false, payload: null, key: keys[0], error: `AES decryption failed with every key framing: ${lastError}` };
}

/** Encrypt a payload the way OTT Pay does — used by the mock acquirer and tests. */
export function encryptCallbackPayload(payload, md5Seed, signKey = config.payment.signKey || 'MOCKSIGNKEY0000') {
  const key = deriveCallbackKey(md5Seed, signKey);
  const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(key, 'utf8'), null);
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]).toString('base64');
  return { data, md5: md5Seed };
}
/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export function assertCredentials() {
  const missing = [];
  if (!config.payment.appId) missing.push('OTT_APP_ID');
  if (!config.payment.appKey) missing.push('OTT_APP_KEY');
  if (!config.payment.signKey) missing.push('OTT_SIGN_KEY');
  if (missing.length) {
    throw new OttPayError(
      `OTT Pay is not configured: ${missing.join(', ')} missing. Set PAYMENT_MODE=mock to demo without credentials.`,
      { code: 'CONFIG' },
    );
  }
}

/** Last four digits only — the single card fragment we are willing to persist. */
export function cardLast4(number) {
  const digits = String(number || '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : '';
}

/** Luhn check, so we can reject a mistyped card before calling OTT Pay. */
export function luhnValid(number) {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Brand detection from the leading digits, for display only. */
export function detectBrand(number) {
  const n = String(number || '').replace(/\D/g, '');
  if (/^4/.test(n)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'MASTERCARD';
  if (/^3[47]/.test(n)) return 'AMEX';
  if (/^6(?:011|5)/.test(n)) return 'DISCOVER';
  if (/^3(?:0[0-5]|[68])/.test(n)) return 'DINERS';
  if (/^35/.test(n)) return 'JCB';
  if (/^62/.test(n)) return 'UNIONPAY';
  return 'CARD';
}

export default {
  getToken,
  pay3ds,
  queryStatus,
  refund,
  decryptCallback,
  deriveCallbackKey,
  encryptCallbackPayload,
  detectBrand,
  luhnValid,
  cardLast4,
  clearTokenCache,
  OttPayError,
  OTT_ERROR_CODES,
  PAYMENT_STATES,
  PAID_STATUSES,
};
