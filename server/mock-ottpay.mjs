/**
 * Mock OTT Pay acquirer.
 *
 * Active when PAYMENT_MODE=mock. It speaks the *same* response shape as the real
 * gateway (`{ status, result: { paymentStatus, paymentId, ccType, ... } }`) and
 * implements the same 3-D Secure 2 state machine, so the checkout code, the
 * challenge page, the callback handler and the status/refund paths are the very
 * same code paths that run against OTT Pay. Switching to the sandbox is purely
 * a configuration change.
 *
 * Outcome is driven by the card number scheme, deliberately mirroring the real
 * test-card behaviour documented by OTT Pay:
 *
 *   4000 0200 0000 0000   Visa          -> frictionless, captured immediately
 *   5454 5454 5454 5454   Mastercard    -> 3DS challenge, password: password
 *   4917 6100 0000 0000   Visa          -> 3DS challenge
 *   6011 1111 1111 1117   Discover      -> 3DS challenge
 *   5201 2812 6243 5268   Mastercard    -> challenge, issuer rejects (transStatus=N)
 *   5201 2829 9900 5515   Mastercard    -> timeout error (50002)
 *   4000 0000 0000 0002   Visa          -> declined (20030)
 *   4000 0000 0000 0007   Visa          -> insufficient funds (20007)
 *   4000 0000 0000 0009   Visa          -> unsupported card (20008)
 *
 * Any other Luhn-valid card behaves as a frictionless approval.
 */
import crypto from 'node:crypto';
import { OttPayError, PAID_STATUSES } from './ottpay.mjs';

/** transaction store: reference -> transaction */
const TXNS = new Map();
/** paymentId -> reference */
const BY_PAYMENT_ID = new Map();
/** challengeId -> reference */
const BY_CHALLENGE = new Map();

let sequence = 1000;

function nextPaymentId() {
  sequence += 1;
  return `${Date.now()}${String(sequence).slice(-4)}`;
}

function nowStamp() {
  const d = new Date();
  const p = (n, w = 2) => String(n).padStart(w, '0');
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${sign}${p(Math.floor(abs / 60))}${p(abs % 60)}`;
}

const digitsOnly = (n) => String(n || '').replace(/\D/g, '');
const normalised = (n) => digitsOnly(n).replace(/^(\d{4})(\d{4})(\d{4})(\d+)$/, '$1 $2 $3 $4');

const CHALLENGE_CARDS = new Set([
  '5454545454545454',
  '4917610000000000',
  '6011111111111117',
  '5201281262435268',
  '416667666766 6746'.replace(/\s/g, ''),
  '2222400010000008',
]);

const SCENARIOS = new Map([
  ['4000000000000002', { kind: 'decline', code: '20030', message: 'Payment failed — declined by the issuer.' }],
  ['4000000000000007', { kind: 'decline', code: '20007', message: 'Insufficient balance.' }],
  ['4000000000000009', { kind: 'decline', code: '20008', message: 'Unsupported card.' }],
  ['5201282999005515', { kind: 'error', code: '50002', message: 'Timeout — the issuer did not respond in time.' }],
  ['5201288695315843', { kind: 'error', code: '50003', message: 'System error — no response received.' }],
  ['5201281262435268', { kind: 'challenge_reject' }],
  ['5201281505129736', { kind: 'challenge_approve' }],
  ['374101012180018', { kind: 'frictionless' }],
]);

function scenarioFor(cardNumber) {
  const n = digitsOnly(cardNumber);
  if (SCENARIOS.has(n)) return SCENARIOS.get(n);
  if (CHALLENGE_CARDS.has(n)) return { kind: 'challenge' };
  return { kind: 'frictionless' };
}

function brandOf(cardNumber) {
  const n = digitsOnly(cardNumber);
  if (/^4/.test(n)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'MASTERCARD';
  if (/^3[47]/.test(n)) return 'AMEX';
  if (/^6(?:011|5)/.test(n)) return 'DISCOVER';
  if (/^3(?:0[0-5]|[68])/.test(n)) return 'DINERS';
  if (/^35/.test(n)) return 'JCB';
  if (/^62/.test(n)) return 'UNIONPAY';
  return 'VISA';
}

/** The HTML that stands in for the issuer's ACS challenge page. */
function challengeForm(txn) {
  const action = `${txn.origin}/mock-3ds/challenge`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Issuer authentication</title></head><body>
<form id="challenge" name="challenge" action="${action}" method="post">
  <input type="hidden" name="MD" value="${txn.challengeId}" />
  <input type="hidden" name="creq" value="${crypto.randomBytes(24).toString('base64url')}" />
  <input type="hidden" name="threeDSServerTransID" value="${crypto.randomUUID().replace(/-/g, '')}" />
</form>
<script>document.challenge.submit();</script>
<noscript><button type="submit" form="challenge">Continue to authentication</button></noscript>
</body></html>`;
}

/**
 * Mirror of POST /api/v1/payment/local-card/payment3dsV2
 */
export function mockPay3ds({
  amountCents,
  card,
  avs,
  reference,
  email,
  kountSessionId,
  callbackUrl,
  frontUrl,
  origin,
}) {
  const number = digitsOnly(card.number);
  const scenario = scenarioFor(number);
  const paymentId = nextPaymentId();
  const txn = {
    reference,
    paymentId,
    amountCents: Math.round(amountCents),
    ccType: brandOf(number),
    last4: number.slice(-4),
    email,
    avs,
    kountSessionId,
    callbackUrl,
    frontUrl,
    origin,
    createdAt: new Date().toISOString(),
    challengeId: crypto.randomBytes(14).toString('hex'),
    scenario: scenario.kind,
    paymentStatus: 'init',
  };
  TXNS.set(reference, txn);
  BY_PAYMENT_ID.set(paymentId, reference);

  if (scenario.kind === 'decline' || scenario.kind === 'error') {
    txn.paymentStatus = 'orderclosed';
    return {
      throws: new OttPayError(`OTT Pay error from payment/local-card/payment3dsV2: ${scenario.message}`, {
        code: scenario.code,
        endpoint: 'payment/local-card/payment3dsV2',
      }),
      requestPayload: { amount: txn.amountCents, reference, ccType: txn.ccType },
    };
  }

  if (scenario.kind === 'challenge' || scenario.kind === 'challenge_reject' || scenario.kind === 'challenge_approve') {
    txn.paymentStatus = 'THREEDS_AUTH_CHALLENGE';
    BY_CHALLENGE.set(txn.challengeId, reference);
    return {
      status: 'SUCCESS',
      paymentStatus: 'THREEDS_AUTH_CHALLENGE',
      paymentId: '',
      reference,
      ccType: null,
      amount: null,
      receiptAmount: null,
      totalAmount: null,
      tradeTime: null,
      escape3DSChallengeForm: challengeForm(txn),
      requestPayload: { amount: txn.amountCents, reference, ccType: txn.ccType, sessionId: kountSessionId },
      responsePayload: { status: 'SUCCESS', result: { paymentStatus: 'THREEDS_AUTH_CHALLENGE' } },
      _txn: txn,
    };
  }

  // Frictionless approval.
  txn.paymentStatus = 'authorised';
  return {
    status: 'SUCCESS',
    paymentStatus: 'authorised',
    paymentId,
    reference,
    ccType: txn.ccType,
    amount: String(txn.amountCents),
    receiptAmount: String(txn.amountCents),
    totalAmount: String(txn.amountCents),
    tradeTime: nowStamp(),
    escape3DSChallengeForm: '',
    requestPayload: { amount: txn.amountCents, reference, ccType: txn.ccType, sessionId: kountSessionId },
    responsePayload: { status: 'SUCCESS', result: { paymentStatus: 'authorised', paymentId } },
    _txn: txn,
  };
}

/** Resolve a mock 3DS challenge. `password` must be "password" to authenticate. */
export function mockResolveChallenge(challengeId, password) {
  const reference = BY_CHALLENGE.get(challengeId);
  if (!reference) return { ok: false, error: 'Unknown or expired authentication session.' };
  const txn = TXNS.get(reference);
  if (!txn) return { ok: false, error: 'Transaction no longer available.' };

  const wantsReject = txn.scenario === 'challenge_reject';
  const authenticated = !wantsReject && password === 'password';

  if (!authenticated) {
    txn.paymentStatus = 'orderclosed';
    txn.transStatus = wantsReject ? 'N' : 'N';
    return { ok: true, authenticated: false, txn };
  }

  txn.paymentStatus = 'authorised';
  txn.transStatus = 'Y';
  txn.eci = '05';
  return { ok: true, authenticated: true, txn };
}

/** Mirror of POST /api/v1/payment/status-query */
export function mockQueryStatus({ paymentId, reference }) {
  let txn = reference ? TXNS.get(reference) : null;
  if (!txn && paymentId) txn = TXNS.get(BY_PAYMENT_ID.get(paymentId));
  if (!txn) {
    throw new OttPayError('OTT Pay error from payment/status-query: Original payment does not exist (20019).', {
      code: '20019',
      endpoint: 'payment/status-query',
    });
  }
  const paid = PAID_STATUSES.has(txn.paymentStatus) || txn.paymentStatus === 'captured';
  return {
    paymentId: txn.paymentId,
    totalAmount: String(txn.amountCents),
    receiptAmount: String(txn.amountCents - (txn.refundedCents || 0)),
    payAmount: String(txn.amountCents),
    refundAmount: String(txn.refundedCents || 0),
    paymentStatus: txn.refundedCents >= txn.amountCents ? 'fully_refunded' : txn.refundedCents > 0 ? 'partial_refund' : paid ? 'success' : txn.paymentStatus,
    stateCode: txn.refundedCents >= txn.amountCents ? 'P00004' : txn.refundedCents > 0 ? 'P00005' : paid ? 'P00003' : 'P00006',
    tradeTime: nowStamp(),
    reference: txn.reference,
    responsePayload: { status: 'SUCCESS', result: { paymentId: txn.paymentId } },
  };
}

/** Mirror of POST /api/v1/payment/local-card/refund */
export function mockRefund({ oriPaymentId, refundAmountCents }) {
  const reference = BY_PAYMENT_ID.get(oriPaymentId);
  const txn = reference ? TXNS.get(reference) : null;
  if (!txn) {
    throw new OttPayError('OTT Pay error from payment/local-card/refund: Original payment does not exist (20019).', {
      code: '20019',
      endpoint: 'payment/local-card/refund',
    });
  }
  const remaining = txn.amountCents - (txn.refundedCents || 0);
  if (refundAmountCents > remaining) {
    throw new OttPayError('OTT Pay error from payment/local-card/refund: Refund amount greater than the amount paid (20014).', {
      code: '20014',
      endpoint: 'payment/local-card/refund',
    });
  }
  txn.refundedCents = (txn.refundedCents || 0) + refundAmountCents;
  txn.paymentStatus = txn.refundedCents >= txn.amountCents ? 'fully_refunded' : 'partial_refund';
  return {
    refundId: `REF${Date.now()}${Math.floor(Math.random() * 90 + 10)}`,
    refundAmount: String(refundAmountCents),
    refundStatus: 'success',
    tradeTime: nowStamp(),
    responsePayload: { status: 'SUCCESS', result: { refundStatus: 'success' } },
  };
}

export function mockTxn(reference) {
  return TXNS.get(reference) || null;
}

export function resetMock() {
  TXNS.clear();
  BY_PAYMENT_ID.clear();
  BY_CHALLENGE.clear();
  sequence = 1000;
}

export { brandOf as mockBrandOf, scenarioFor as mockScenarioFor, normalised as mockFormattedCard };
