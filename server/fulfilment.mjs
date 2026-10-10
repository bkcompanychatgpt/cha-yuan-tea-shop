/**
 * Fulfilment promises, in one place.
 *
 * Every date or deadline the shop shows a customer about their own order is
 * computed here, so the confirmation page, the order record and the shipping
 * policy cannot drift apart. The numbers deliberately match views/shipping.ejs:
 * packing before 2:00pm Eastern on a business day, dispatch within two business
 * days, then 2-5 business days domestic standard, 1-2 express, 7-14
 * international. If a promise changes, change it here.
 *
 * Business days exclude Saturdays and Sundays. Statutory holidays are not
 * modelled, so every date is presented as a target rather than a guarantee.
 */

const MS_PER_DAY = 86400000;

/**
 * 2:00pm Eastern expressed in UTC.
 *
 * Eastern is UTC-5 in winter and UTC-4 in summer, so the cut-off lands at 19:00
 * UTC in winter and 18:00 UTC in summer. This uses 18:00, the summer value,
 * because it is the conservative one: an order that beat 14:00 EDT but not
 * 14:00 EST is told it goes out the next business day rather than being promised
 * same-day packing it may not get. DST is deliberately not tracked — the shop
 * under-promises for part of the year instead of ever over-promising.
 */
const CUTOFF_UTC_HOUR = 18;

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

function isWeekend(date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** Add whole calendar days, then step forward to the next weekday. */
function addBusinessDays(date, days) {
  const out = new Date(date.getTime());
  let remaining = Math.max(0, Math.round(days));
  while (remaining > 0) {
    out.setUTCDate(out.getUTCDate() + 1);
    if (!isWeekend(out)) remaining -= 1;
  }
  while (isWeekend(out)) out.setUTCDate(out.getUTCDate() + 1);
  return out;
}

/** The next weekday on or after `date`. */
function toBusinessDay(date) {
  const out = new Date(date.getTime());
  while (isWeekend(out)) out.setUTCDate(out.getUTCDate() + 1);
  return out;
}

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

/**
 * Build the customer-facing fulfilment picture for one order.
 *
 * Returns `{ isBad, isComplete, stages, dispatchBy, etaFrom, etaTo, etaLabel,
 * express, international, packSameDay, cutoffLabel, departments }`. `stages` is
 * an ordered array of `{ key, title, body, promise, state }` where state is one
 * of `done`, `current`, `pending`, `void`.
 */
export function fulfilment(order, { now = new Date() } = {}) {
  const method = String(order?.shipping_method || 'standard').toLowerCase();
  const express = method === 'express';
  const country = String(order?.shipping_country || 'CA').toUpperCase();
  const international = country !== 'CA';

  const dept = departments(order);
  const packCopy = copyFor(PACK_COPY, dept);
  const arrivedCopy = copyFor(ARRIVED_COPY, dept);

  const received = parseUtc(order?.created_at) || now;
  const paid = parseUtc(order?.paid_at);

  const packSameDay = !isWeekend(received) && received.getUTCHours() < CUTOFF_UTC_HOUR;
  const packDay = packSameDay ? received : addBusinessDays(received, 1);
  // "Dispatched within two business days" is the outer bound we publish.
  const dispatchBy = addBusinessDays(packDay, 1);

  const transitFrom = addBusinessDays(dispatchBy, express ? 1 : international ? 7 : 2);
  const transitTo = addBusinessDays(dispatchBy, express ? 2 : international ? 14 : 5);

  const transitBody = express
    ? 'Express is 1 to 2 business days once the parcel is with the carrier.'
    : international
      ? 'International standard is 7 to 14 business days in transit, and customs can hold a parcel beyond that.'
      : 'Standard delivery in Canada is 2 to 5 business days in transit.';

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
      body: 'Your bank authorised the card through 3-D Secure 2 and OTT Pay captured the payment. A receipt is on its way to your email.',
      promise: paid ? `Paid ${shortDate(paid)}` : 'Usually within a minute of ordering',
    },
    {
      key: 'packed',
      title: copyFor(PACK_TITLE, dept),
      body: packCopy,
      promise: packSameDay
        ? 'Same business day — you ordered before the 2:00pm Eastern cut-off'
        : `By ${shortDate(packDay)} — the next business day`,
    },
    {
      key: 'dispatched',
      title: 'Dispatched with tracking',
      body: 'The parcel is scanned by the carrier and a tracking number is emailed to you the moment it leaves us.',
      promise: `Within 2 business days, by ${shortDate(dispatchBy)}`,
    },
    {
      key: 'transit',
      title: 'In transit',
      body: transitBody,
      promise: `Expected ${shortDate(transitFrom)} to ${shortDate(transitTo)}`,
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
    international,
    packSameDay,
    departments: dept,
    dispatchBy,
    // Preformatted so a template never has to reach for a module property:
    // app.locals.fulfilment is the bare function, not the namespace.
    dispatchByLabel: shortDate(dispatchBy),
    packDayLabel: shortDate(packDay),
    etaFrom: transitFrom,
    etaTo: transitTo,
    etaLabel: `${shortDate(transitFrom)} to ${shortDate(transitTo)}`,
    cutoffLabel: '2:00pm Eastern on a business day',
    methodLabel: express ? 'Express' : international ? 'International standard' : 'Standard',
  };
}

/** A one-line promise for the top of a confirmation page. */
export function etaSentence(order, opts) {
  const f = fulfilment(order, opts);
  if (f.isBad) return 'This order was not completed, so nothing will be shipped.';
  if (f.isComplete) return 'Delivered. We would love to know how the tea tasted.';
  if (f.express) return `Expected ${f.etaLabel} with Express delivery.`;
  return `Expected ${f.etaLabel}${f.international ? ', customs permitting' : ''}.`;
}
