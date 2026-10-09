/**
 * Payment service facade.
 *
 * The rest of the application (checkout, callback handler, admin refunds) only
 * ever talks to this module. It dispatches to either the real OTT Pay client or
 * the in-process mock acquirer, so switching PAYMENT_MODE never changes calling
 * code.
 */
import config from './config.mjs';
import * as ott from './ottpay.mjs';
import * as mock from './mock-ottpay.mjs';

export const paymentMode = () => config.payment.mode;
export const isMock = () => config.payment.isMock;

/**
 * Start a card payment.
 * @returns {Promise<{ok:boolean, data?:object, error?:{code:string,message:string}}>}
 */
export async function startCardPayment(args) {
  try {
    if (isMock()) {
      const res = mock.mockPay3ds(args);
      if (res.throws) {
        return { ok: false, error: { code: res.throws.code, message: res.throws.message } };
      }
      return { ok: true, data: res };
    }
    const data = await ott.pay3ds(args);
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: err.code || 'ERROR',
        message: err.message,
        detail: ott.OTT_ERROR_CODES[err.code] || undefined,
      },
    };
  }
}

/** Query the authoritative status of a payment. */
export async function fetchPaymentStatus({ paymentId, reference }) {
  try {
    if (isMock()) return { ok: true, data: mock.mockQueryStatus({ paymentId, reference }) };
    return { ok: true, data: await ott.queryStatus({ paymentId }) };
  } catch (err) {
    return { ok: false, error: { code: err.code || 'ERROR', message: err.message } };
  }
}

/** Refund a captured payment, in whole or in part. */
export async function refundPayment({ oriPaymentId, refundAmountCents }) {
  try {
    if (isMock()) return { ok: true, data: mock.mockRefund({ oriPaymentId, refundAmountCents }) };
    return { ok: true, data: await ott.refund({ oriPaymentId, refundAmountCents }) };
  } catch (err) {
    return { ok: false, error: { code: err.code || 'ERROR', message: err.message } };
  }
}

/** Resolve a mock 3-D Secure challenge (no-op against the real gateway). */
export function resolveMockChallenge(challengeId, password) {
  return mock.mockResolveChallenge(challengeId, password);
}

export const decryptCallback = ott.decryptCallback;
export const encryptCallbackPayload = ott.encryptCallbackPayload;
export const deriveCallbackKey = ott.deriveCallbackKey;
export const detectBrand = ott.detectBrand;
export const luhnValid = ott.luhnValid;
export const cardLast4 = ott.cardLast4;
export const clearTokenCache = ott.clearTokenCache;
export const OttPayError = ott.OttPayError;
export const OTT_ERROR_CODES = ott.OTT_ERROR_CODES;
export const PAYMENT_STATES = ott.PAYMENT_STATES;
export const PAID_STATUSES = ott.PAID_STATUSES;
export const mockTxn = mock.mockTxn;
export const resetMock = mock.resetMock;
export const assertCredentials = ott.assertCredentials;

export default {
  paymentMode,
  isMock,
  startCardPayment,
  fetchPaymentStatus,
  refundPayment,
  resolveMockChallenge,
  decryptCallback,
  encryptCallbackPayload,
  detectBrand,
  luhnValid,
  cardLast4,
  clearTokenCache,
  OTT_ERROR_CODES,
  PAYMENT_STATES,
  PAID_STATUSES,
  mockTxn,
  resetMock,
};
