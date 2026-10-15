/**
 * Fulfilment promises, in one place.
 *
 * Every deadline the shop shows a customer about their own order is computed
 * here, so the confirmation page, the order record, the checkout and the
 * shipping policy cannot drift apart. Two rules govern all of it:
 *
 *   1. **Dispatch within 48 hours.** Not a cut-off time, not a business-day
 *      calculation, not a same-day promise that depends on which timezone the
 *      customer is reading it in. Forty-eight hours, stated once, true of every
 *      order. A promise that simple cannot be misread and cannot be missed by
 *      accident.
 *
 *   2. **No arrival estimates.** The shop ships from China, and how long a
 *      parcel then takes is the carrier's business and the customs officer's
 *      business, not ours. Transit time is not something we control or can
 *      forecast honestly, and an estimate we cannot keep is worse than no
 *      estimate at all — it is the single most common reason a customer feels
 *      misled. So the timeline stops at "dispatched with tracking" and the
 *      tracking number carries the rest.
 *
 * Both rules are deliberately conservative. The shop would rather a customer be
 * pleasantly surprised than be owed an apology.
 */

const MS_PER_HOUR = 3600000;

/** SQLite stores `datetime('now')` as `YYYY-MM-DD HH:MM:SS` in UTC. */
function parseUtc(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) {
    const fallback = new Date(text);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(Date.UTC(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    Number(m[4]), Number(m[5]), Number(m[6] || 0),
  ));
}

/** The dispatch deadline: 48 hours from the moment the order was placed. */
export const DISPATCH_HOURS = 48;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mon 9 Mar" — no year, because these are always days away. */
export function shortDate(date) {
  if (!date) return '';
  return `${DAY_LABELS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTH_LABELS[date.getUTCMonth()]}`;
}

/** "Monday 9 March 2026" for a single unambiguous date. */
const LONG_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LONG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export function longDate(date) {
  if (!date) return '';
  return `${LONG_DAYS[date.getUTCDay()]} ${date.getUTCDate()} ${LONG_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Order of the stages a paid order moves through. `cancelled` and `refunded`
 * orders do not follow it and get told so instead.
 *
 * `delivered` stays even though we promise no date for it: the status exists,
 * and a customer who has had a parcel needs to see the order finish.
 */
export const STAGE_KEYS = ['received', 'confirmed', 'packed', 'dispatched', 'transit', 'delivered'];

/** Which stage each order status has reached. */
const STATUS_STAGE = {
  pending: 'received',
  awaiting_payment: 'received',
  paid: 'confirmed',
  processing: 'packed',
  shipped: 'transit',
  delivered: 'delivered',
  cancelled: 'received',
  refunded: 'received',
};

const TERMINAL_BAD = new Set(['cancelled', 'refunded']);
const TERMINAL_GOOD = new Set(['delivered']);

/**
 * Which departments an order actually draws from.
 *
 * The shop sells tea, jade and jewellery, and the handling copy is not
 * interchangeable: a bangle is not "weighed to the gram", and a tea cake is not
 * "inspected under a loupe". The department comes from the category kind joined
 * onto each order line. When nothing is known — an old order whose product has
 * been removed, or a fixture with no items — the wording falls back to a form
 * that is true for anything.
 */
function departments(order) {
  const kinds = new Set(
    (order?.items || []).map((item) => String(item.category_kind || '')).filter(Boolean),
  );
  // Teaware and gift sets travel and are packed like tea.
  const tea = kinds.has('tea') || kinds.has('teaware') || kinds.has('gift');
  const stone = kinds.has('jade');
  const jewellery = kinds.has('jewellery');
  const mixed = [tea, stone, jewellery].filter(Boolean).length > 1;
  return { tea, stone, jewellery, mixed, known: kinds.size > 0 };
}

const PACK_COPY = {
  tea: 'Your tea is weighed to the gram, sealed in a lined tin, and the parcel is checked line by line against the order.',
  stone: 'Your piece is checked against its listing photograph under a loupe, then wrapped in acid-free tissue inside a sealed box.',
  jewellery: 'Your piece is polished, checked against its listing photograph, and wrapped in acid-free tissue inside a sealed box.',
  mixed: 'Every line is checked against the order before anything is sealed: tea weighed to the gram, stone and metal inspected under a loupe.',
  unknown: 'Your order is checked line by line against what you bought, packed, and sealed.',
};

/** The stage title has to match the work, not just the body copy. */
const PACK_TITLE = {
  tea: 'Weighed and packed',
  stone: 'Inspected and boxed',
  jewellery: 'Polished and boxed',
  mixed: 'Weighed, inspected and packed',
  unknown: 'Checked and packed',
};

const ARRIVED_COPY = {
  tea: 'Tea is best fresh: move it out of the parcel and into the tin as soon as it arrives, away from light and strong smells.',
  stone: 'Keep the box and any certificate with the piece. Stone is happiest away from perfume, chlorine and direct sun.',
  jewellery: 'Keep the box and any certificate with the piece. Metal and stone are happiest away from perfume, chlorine and direct sun.',
  mixed: 'Move the tea into its tin as soon as it arrives, away from light and strong smells, and keep the box and any certificate with the stone and metal.',
  unknown: 'Keep the packing slip and any certificate with the order until you are sure you are keeping everything.',
};

function copyFor(table, dept) {
  if (dept.mixed) return table.mixed;
  if (!dept.known) return table.unknown;
  if (dept.jewellery) return table.jewellery;
  if (dept.stone) return table.stone;
  return table.tea;
}

/** The one promise, written once so no surface can reword it. */
export const DISPATCH_PROMISE = 'Within 48 hours of your order';

/**
 * Build the customer-facing fulfilment picture for one order.
 *
 * Returns `{ isBad, isComplete, stages, dispatchBy, dispatchByLabel,
 * dispatchPromise, methodLabel, overseas, departments }`. `stages` is an ordered
 * array of `{ key, title, body, promise, state }` where state is one of `done`,
 * `current`, `pending`, `void`.
 */
export function fulfilment(order, { now = new Date() } = {}) {
  const method = String(order?.shipping_method || 'standard').toLowerCase();
  const express = method === 'express';
  const country = String(order?.shipping_country || '').toUpperCase();
  /*
   * The shop ships from China, so anything leaving the country is an overseas
   * order and carries customs. An empty country is treated as overseas: it is
   * the common case here, and it is the one that warns the customer about duty
   * rather than the one that hides it.
   */
  const overseas = country !== 'CN';

  const dept = departments(order);
  const packCopy = copyFor(PACK_COPY, dept);
  const arrivedCopy = copyFor(ARRIVED_COPY, dept);

  const received = parseUtc(order?.created_at) || now;
  const paid = parseUtc(order?.paid_at);

  const dispatchBy = new Date(received.getTime() + DISPATCH_HOURS * MS_PER_HOUR);

  const stages = [
    {
      key: 'received',
      title: 'Order received',
      body: 'Your order is in our system with the address and items you chose. Nothing further is needed from you.',
      promise: received ? `Placed ${shortDate(received)}` : 'Placed',
    },
    {
      key: 'confirmed',
      title: 'Payment confirmed',
      body: 'Your bank authorised the card through 3-D Secure 2 and the payment was captured. A receipt is on its way to your email.',
      promise: paid ? `Paid ${shortDate(paid)}` : 'Usually within a minute of ordering',
    },
    {
      key: 'packed',
      title: copyFor(PACK_TITLE, dept),
      body: packCopy,
      promise: DISPATCH_PROMISE,
    },
    {
      key: 'dispatched',
      title: 'Dispatched with tracking',
      body: 'The parcel is scanned by the carrier and a tracking number is emailed to you the moment it leaves our warehouse in China.',
      promise: DISPATCH_PROMISE,
    },
    {
      key: 'transit',
      title: 'On its way to you',
      body: overseas
        ? 'The tracking number shows every scan. Customs clearance is outside our control and is the one part of the journey that can add time without warning; duties and import taxes are payable by the recipient.'
        : 'The tracking number shows every scan, from our warehouse to the delivery address.',
      // Deliberately not a date. See the note at the top of this file.
      promise: 'Tracked door to door',
    },
    {
      key: 'delivered',
      title: 'Delivered',
      body: arrivedCopy,
      promise: 'Signature not required',
    },
  ];

  const reached = STATUS_STAGE[order?.status] || 'received';
  const reachedIndex = STAGE_KEYS.indexOf(reached);
  const isBad = TERMINAL_BAD.has(order?.status);
  const isComplete = TERMINAL_GOOD.has(order?.status);

  const withState = stages.map((stage, index) => {
    let state;
    if (isBad) {
      // A refunded order genuinely passed payment before it was reversed, so
      // that stage stays truthful. A cancelled one may never have been paid.
      // Everything after that is struck out rather than shown as "Next",
      // because nothing further will happen to this order.
      const lastTrueStage = paid ? 1 : 0;
      state = index <= lastTrueStage ? 'done' : 'void';
    } else if (isComplete) state = 'done';
    else if (index < reachedIndex) state = 'done';
    else if (index === reachedIndex) state = 'current';
    else state = 'pending';
    return { ...stage, state };
  });

  return {
    stages: withState,
    isBad,
    isComplete,
    express,
    overseas,
    departments: dept,
    dispatchBy,
    // Preformatted so a template never has to reach for a module property:
    // app.locals.fulfilment is the bare function, not the namespace.
    dispatchByLabel: shortDate(dispatchBy),
    dispatchPromise: DISPATCH_PROMISE,
    methodLabel: express ? 'Express' : 'Standard',
  };
}

/**
 * A one-line promise for the top of a confirmation page.
 *
 * It says when the parcel leaves us and stops there. No arrival date is offered,
 * because the shop cannot keep one.
 */
export function etaSentence(order, opts) {
  const f = fulfilment(order, opts);
  if (f.isBad) return 'This order was not completed, so nothing will be shipped.';
  if (f.isComplete) return 'Delivered. We would love to know how the tea tasted.';
  return 'We dispatch within 48 hours and email you the tracking number the moment it leaves us.';
}
