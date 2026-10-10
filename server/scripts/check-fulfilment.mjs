/**
 * Deterministic checks on the fulfilment date arithmetic.
 *
 * The order-confirmation promises are the only place the shop commits to a date
 * the customer will hold it to, so they are pinned to fixtures rather than to
 * whatever the clock happens to say. Each case fixes `now` and the order's
 * timestamps and asserts the resulting stage states and deadlines.
 *
 *   node server/scripts/check-fulfilment.mjs
 */
import { fulfilment, shortDate } from '../fulfilment.mjs';

let pass = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`  \x1b[32mPASS\x1b[0m  ${label}`);
  } else {
    failures.push(label);
    console.log(`  \x1b[31mFAIL\x1b[0m  ${label}${detail ? `  — ${detail}` : ''}`);
  }
}

function eq(label, actual, expected) {
  check(label, actual === expected, `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

function order(overrides = {}) {
  return {
    status: 'paid',
    shipping_method: 'standard',
    shipping_country: 'CA',
    created_at: '2026-10-12 09:00:00',   // Monday
    paid_at: '2026-10-12 09:00:30',
    ...overrides,
  };
}

const noonMonday = new Date(Date.UTC(2026, 9, 12, 12, 0, 0));

console.log('\nFulfilment deadlines\n');

/* ------------------------------------------------------- the 2pm cut-off */
{
  // 09:00 UTC on a Monday is comfortably before the cut-off.
  const f = fulfilment(order(), { now: noonMonday });
  check('a Monday morning order packs the same day', f.packSameDay);
  eq('same-day packing is stated to the customer', f.stages[2].promise.startsWith('Same business day'), true);
  // pack Monday, dispatch within two business days -> Tuesday 13th.
  eq('dispatch deadline is the next business day', shortDate(f.dispatchBy), 'Tue 13 Oct');
  // Canada standard is 2-5 business days in transit from dispatch.
  eq('arrival window opens two business days after dispatch', shortDate(f.etaFrom), 'Thu 15 Oct');
  eq('arrival window closes five business days after dispatch', shortDate(f.etaTo), 'Tue 20 Oct');
}

{
  // 21:00 UTC is past the 2pm Eastern cut-off in either offset.
  const late = order({ created_at: '2026-10-12 21:00:00' });
  const f = fulfilment(late, { now: noonMonday });
  check('an order past the cut-off does not pack the same day', !f.packSameDay);
  check('it is promised the next business day instead', f.stages[2].promise.includes('next business day'));
}

{
  // 18:30 UTC is 14:30 EDT — past the cut-off in summer. The shop uses the
  // summer offset all year, so this must be held back rather than promised
  // same-day packing.
  const boundary = order({ created_at: '2026-10-12 18:30:00' });
  const f = fulfilment(boundary, { now: noonMonday });
  check('the cut-off is read conservatively across DST', !f.packSameDay);
}

{
  const boundary = order({ created_at: '2026-10-12 17:59:00' });
  const f = fulfilment(boundary, { now: noonMonday });
  check('an order just before the cut-off still packs the same day', f.packSameDay);
}

/* -------------------------------------------------------------- weekends */
{
  // Saturday 10 October 2026.
  const saturday = order({ created_at: '2026-10-10 14:54:58', paid_at: '2026-10-10 14:54:58' });
  const f = fulfilment(saturday, { now: noonMonday });
  check('a Saturday order never packs the same day', !f.packSameDay);
  eq('it packs on the Monday', f.packDayLabel, 'Mon 12 Oct');
  eq('dispatch is pushed to the Tuesday', shortDate(f.dispatchBy), 'Tue 13 Oct');
  eq('the order weekend is reported as Saturday', shortDate(new Date(Date.UTC(2026, 9, 10))), 'Sat 10 Oct');
}

{
  // Sunday 11 October 2026, and the arrival window must skip the next weekend.
  const sunday = order({ created_at: '2026-10-11 12:00:00', paid_at: '2026-10-11 12:00:00' });
  const f = fulfilment(sunday, { now: noonMonday });
  eq('a Sunday order packs on the Monday', f.packDayLabel, 'Mon 12 Oct');
  // Monday 12 dispatch-eligible, dispatch by Tuesday 13, +5 business days
  // crosses the 17-18 Oct weekend, so arrival closes on Tuesday 20 Oct.
  eq('the arrival window skips the intervening weekend', shortDate(f.etaTo), 'Tue 20 Oct');
}

/* --------------------------------------------------------------- express */
{
  const f = fulfilment(order({ shipping_method: 'express' }), { now: noonMonday });
  check('express is labelled as express', f.express);
  eq('express is named in the service line', f.methodLabel, 'Express');
  eq('express arrives one business day after dispatch', shortDate(f.etaFrom), 'Wed 14 Oct');
  eq('express arrives two business days after dispatch', shortDate(f.etaTo), 'Thu 15 Oct');
}

/* -------------------------------------------------------- international */
{
  const f = fulfilment(order({ shipping_country: 'US' }), { now: noonMonday });
  check('a non-Canadian address is treated as international', f.international);
  eq('international standard is named in the service line', f.methodLabel, 'International standard');
  eq('international transit opens after seven business days', shortDate(f.etaFrom), 'Thu 22 Oct');
  // Fourteen business days from Tue 13 Oct: 14-16 Oct (3), 19-23 Oct (8),
  // 26-30 Oct (13), then Mon 2 Nov is the fourteenth — the weekend intervenes.
  eq('international transit closes after fourteen business days', shortDate(f.etaTo), 'Mon 2 Nov');
  check('the stage copy warns about customs', f.stages[4].body.includes('customs'));
}

/* ------------------------------------------------------- stage progress */
{
  const f = fulfilment(order({ status: 'shipped' }), { now: noonMonday });
  const byKey = Object.fromEntries(f.stages.map((s) => [s.key, s.state]));
  eq('received is done once shipped', byKey.received, 'done');
  eq('payment is done once shipped', byKey.confirmed, 'done');
  eq('packing is done once shipped', byKey.packed, 'done');
  eq('transit is current once shipped', byKey.transit, 'current');
  eq('delivery is still pending once shipped', byKey.delivered, 'pending');
}

{
  const f = fulfilment(order({ status: 'delivered' }), { now: noonMonday });
  check('a delivered order completes every stage', f.isComplete && f.stages.every((s) => s.state === 'done'));
}

{
  const f = fulfilment(order({ status: 'pending', paid_at: null }), { now: noonMonday });
  const byKey = Object.fromEntries(f.stages.map((s) => [s.key, s.state]));
  eq('an unpaid order is still at received', byKey.received, 'current');
  eq('an unpaid order has not confirmed payment', byKey.confirmed, 'pending');
}

/* --------------------------------------------- terminal bad statuses */
{
  // Refunded: payment genuinely happened, everything after it does not.
  const f = fulfilment(order({ status: 'refunded' }), { now: noonMonday });
  check('a refunded order is flagged as terminal', f.isBad);
  const byKey = Object.fromEntries(f.stages.map((s) => [s.key, s.state]));
  eq('a refunded order keeps the payment stage truthful', byKey.confirmed, 'done');
  eq('a refunded order strikes out packing', byKey.packed, 'void');
  eq('a refunded order strikes out transit', byKey.transit, 'void');
  check('nothing is left looking like the next step', !f.stages.some((s) => s.state === 'pending'));
}

{
  // Cancelled before payment: not even the payment stage is true.
  const f = fulfilment(order({ status: 'cancelled', paid_at: null }), { now: noonMonday });
  const byKey = Object.fromEntries(f.stages.map((s) => [s.key, s.state]));
  eq('a cancelled unpaid order keeps only receipt as done', byKey.received, 'done');
  eq('a cancelled unpaid order does not claim payment', byKey.confirmed, 'void');
}

/* ------------------------------------------------ department-aware copy */
{
  const tea = fulfilment(order({ items: [{ category_kind: 'tea' }] }), { now: noonMonday });
  check('a tea order is packed as tea', tea.stages[2].body.includes('weighed to the gram'), tea.stages[2].body);
  check('a tea order gets tea storage advice', tea.stages[5].body.includes('tin'), tea.stages[5].body);

  const jade = fulfilment(order({ items: [{ category_kind: 'jade' }] }), { now: noonMonday });
  check('a jade order is never "weighed to the gram"', !jade.stages[2].body.includes('weighed to the gram'), jade.stages[2].body);
  check('a jade order is checked against its listing photograph', jade.stages[2].body.includes('listing photograph'), jade.stages[2].body);
  check('a jade order is not given tea storage advice', !jade.stages[5].body.includes('tin'), jade.stages[5].body);
  check('the packing stage is titled for stone, not for tea', jade.stages[2].title === 'Inspected and boxed', jade.stages[2].title);

  const ring = fulfilment(order({ items: [{ category_kind: 'jewellery' }] }), { now: noonMonday });
  check('a jewellery order is polished before packing', ring.stages[2].body.includes('polished'), ring.stages[2].body);
  check('the packing stage is titled for jewellery', ring.stages[2].title === 'Polished and boxed', ring.stages[2].title);

  const mixed = fulfilment(order({ items: [{ category_kind: 'tea' }, { category_kind: 'jewellery' }] }), { now: noonMonday });
  check('a mixed order mentions both tea and stone handling',
    mixed.stages[2].body.includes('weighed to the gram') && mixed.stages[2].body.includes('loupe'),
    mixed.stages[2].body);
  check('a mixed order combines the aftercare advice',
    mixed.stages[5].body.includes('tin') && mixed.stages[5].body.includes('certificate'),
    mixed.stages[5].body);

  const teaware = fulfilment(order({ items: [{ category_kind: 'teaware' }] }), { now: noonMonday });
  check('teaware is packed like tea', teaware.stages[2].body.includes('weighed to the gram'));
  check('teaware keeps the tea packing title', teaware.stages[2].title === 'Weighed and packed', teaware.stages[2].title);

  // An order whose product has since been deleted has no kind at all, and must
  // still read as a true sentence rather than a tea claim.
  const orphan = fulfilment(order({ items: [{ category_kind: '' }] }), { now: noonMonday });
  check('an order with no known department gets neutral packing copy',
    !orphan.stages[2].body.includes('weighed to the gram') && !orphan.stages[2].body.includes('loupe'),
    orphan.stages[2].body);
  check('an order with no known department gets a neutral packing title',
    orphan.stages[2].title === 'Checked and packed', orphan.stages[2].title);
  check('an order with no items gets neutral copy',
    !fulfilment(order(), { now: noonMonday }).stages[2].body.includes('weighed to the gram'));
}

/* ----------------------------------------------------------- robustness */
{
  const f = fulfilment(order({ created_at: null, paid_at: null, status: 'paid' }), { now: noonMonday });
  check('a missing timestamp does not throw', f.stages.length === 6);
  check('a missing timestamp still yields a dispatch deadline', Boolean(f.dispatchByLabel));
}

{
  const f = fulfilment({}, { now: noonMonday });
  check('an empty order does not throw', f.stages.length === 6);
}

{
  // Non-ISO input must not silently produce Invalid Date output.
  const f = fulfilment(order({ created_at: 'not a date' }), { now: noonMonday });
  check('unparseable input falls back rather than printing NaN', !f.etaLabel.includes('NaN'));
}

/* -------------------------------------------------- business-day safety */
{
  // Ten consecutive dispatch deadlines must never land on a weekend.
  let weekendHit = null;
  for (let day = 1; day <= 28; day += 1) {
    const created = `2026-10-${String(day).padStart(2, '0')} 09:00:00`;
    const f = fulfilment(order({ created_at: created, paid_at: created }), { now: noonMonday });
    if ([0, 6].includes(f.dispatchBy.getUTCDay())) weekendHit = shortDate(f.dispatchBy);
    if ([0, 6].includes(f.etaFrom.getUTCDay())) weekendHit = `etaFrom ${shortDate(f.etaFrom)}`;
    if ([0, 6].includes(f.etaTo.getUTCDay())) weekendHit = `etaTo ${shortDate(f.etaTo)}`;
  }
  check('no promised date ever falls on a weekend', weekendHit === null, String(weekendHit));
}

console.log(`\n  ${pass} passed, ${failures.length} failed\n`);
if (failures.length) {
  console.log('  Failures:');
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
