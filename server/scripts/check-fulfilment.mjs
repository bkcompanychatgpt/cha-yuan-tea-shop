/**
 * Deterministic checks on the fulfilment promises.
 *
 * The order-confirmation promises are the only place the shop commits to
 * something the customer will hold it to, so they are pinned to fixtures rather
 * than to whatever the clock happens to say.
 *
 * Two rules are tested here, and the second one matters as much as the first:
 *
 *   1. Every promise is "within 48 hours of your order", computed from the order
 *      timestamp and nothing else — not from a cut-off, not from business days,
 *      not from the timezone the page happens to be read in.
 *   2. **No arrival date is ever produced.** The shop ships from China, so
 *      transit and customs are not ours to forecast, and an estimate that
 *      appears anywhere is a regression. Several of these checks exist purely to
 *      fail if one comes back.
 *
 *   node server/scripts/check-fulfilment.mjs
 */
import { fulfilment, shortDate, DISPATCH_HOURS } from '../fulfilment.mjs';

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
    shipping_country: 'US',
    created_at: '2026-10-12 09:00:00',   // Monday
    paid_at: '2026-10-12 09:00:30',
    ...overrides,
  };
}

const noonMonday = new Date(Date.UTC(2026, 9, 12, 12, 0, 0));

/** Any promise that names a weekday is a date, and a date is a delivery promise. */
const DAY_WORDS = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/;

console.log('\nFulfilment promises\n');

/* ------------------------------------------------- the 48-hour promise */
{
  const f = fulfilment(order(), { now: noonMonday });
  eq('dispatch is 48 hours after the order', shortDate(f.dispatchBy), 'Wed 14 Oct');
  eq('the packing stage quotes the promise', f.stages[2].promise, 'Within 48 hours of your order');
  eq('the dispatch stage quotes the same promise', f.stages[3].promise, 'Within 48 hours of your order');
  eq('the promise is exported for reuse', f.dispatchPromise, 'Within 48 hours of your order');
  eq('the constant matches the wording', DISPATCH_HOURS, 48);
}

{
  /*
   * The whole point of dropping the cut-off is that the answer no longer
   * depends on the hour of day the order landed. 23:59 and 00:01 are two
   * minutes apart and must produce promises two minutes apart, not a day.
   */
  const late = fulfilment(order({ created_at: '2026-10-12 23:59:00' }), { now: noonMonday });
  const early = fulfilment(order({ created_at: '2026-10-13 00:01:00' }), { now: noonMonday });
  const gapHours = (late.dispatchBy - early.dispatchBy) / 3600000;
  check('two minutes apart in the day are not a day apart in the promise', Math.abs(gapHours) < 0.1, `${gapHours}h`);
  eq('a late-evening order is still promised 48 hours', late.stages[3].promise, 'Within 48 hours of your order');
}

{
  // A weekend order gets the same promise as a weekday one: 48 hours is 48
  // hours, and the shop is not making a claim about which staff are in on
  // Saturday. Saturday 14:54 plus 48 hours is Monday 14:54.
  const saturday = order({ created_at: '2026-10-10 14:54:58', paid_at: '2026-10-10 14:54:58' });
  const f = fulfilment(saturday, { now: noonMonday });
  eq('a Saturday order is promised the same 48 hours', f.stages[3].promise, 'Within 48 hours of your order');
  eq('and its deadline is the Monday', shortDate(f.dispatchBy), 'Mon 12 Oct');
}

/* ------------------------------------------------- no arrival estimate */
{
  const f = fulfilment(order(), { now: noonMonday });
  eq('no arrival window is exposed', f.etaFrom, undefined);
  eq('no arrival window is exposed (end)', f.etaTo, undefined);
  eq('no arrival label is exposed', f.etaLabel, undefined);
  eq('no cut-off label is exposed', f.cutoffLabel, undefined);
  eq('no same-day flag is exposed', f.packSameDay, undefined);

  const dated = f.stages.filter((s) => s.key !== 'received' && s.key !== 'confirmed' && DAY_WORDS.test(s.promise));
  eq('no stage after payment names a weekday', dated.map((s) => `${s.key}: ${s.promise}`).join(' | '), '');
  check('the transit stage promises tracking rather than a date',
    !DAY_WORDS.test(f.stages[4].promise), f.stages[4].promise);
}

/* ----------------------------------------------------- overseas copy */
{
  const overseas = fulfilment(order({ shipping_country: 'US' }), { now: noonMonday });
  check('a non-Chinese address is treated as overseas', overseas.overseas);
  check('the transit copy warns about customs',
    /customs/i.test(overseas.stages[4].body), overseas.stages[4].body);
  check('the transit copy names duty as the recipient\'s',
    /recipient/i.test(overseas.stages[4].body), overseas.stages[4].body);

  const domestic = fulfilment(order({ shipping_country: 'CN' }), { now: noonMonday });
  check('a Chinese address is not overseas', !domestic.overseas);
  check('domestic transit copy does not mention customs',
    !/customs/i.test(domestic.stages[4].body), domestic.stages[4].body);

  // An order with no country recorded is treated as overseas: that is the
  // common case here and the one that warns the customer about duty.
  check('an unknown country is treated as overseas', fulfilment(order({ shipping_country: '' }), { now: noonMonday }).overseas);
}

/* --------------------------------------------------------- service line */
{
  eq('standard is named', fulfilment(order(), { now: noonMonday }).methodLabel, 'Standard');
  eq('express is named', fulfilment(order({ shipping_method: 'express' }), { now: noonMonday }).methodLabel, 'Express');
  const f = fulfilment(order({ shipping_method: 'express' }), { now: noonMonday });
  check('express is flagged', f.express);
  eq('express gets the same 48-hour promise', f.stages[3].promise, 'Within 48 hours of your order');
  eq('express gets the same deadline', shortDate(f.dispatchBy), 'Wed 14 Oct');
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
  check('unparseable input falls back rather than printing NaN', !f.dispatchByLabel.includes('NaN'));
  check('and still promises 48 hours', f.stages[3].promise === 'Within 48 hours of your order');
}

/* ------------------------------------------------ clock independence */
{
  /*
   * The promise is a property of the order, not of when the page is read. Read
   * the same order a week later and every word must be identical — otherwise a
   * customer who reloads their confirmation sees a different promise.
   */
  const o = order();
  const first = fulfilment(o, { now: new Date(Date.UTC(2026, 9, 12, 12)) });
  const later = fulfilment(o, { now: new Date(Date.UTC(2026, 9, 19, 3)) });
  eq('the dispatch deadline does not move', shortDate(later.dispatchBy), shortDate(first.dispatchBy));
  eq('the promise text does not change',
    later.stages.map((s) => s.promise).join('|'),
    first.stages.map((s) => s.promise).join('|'));
}

/* -------------------------------------------------- wording safety net */
{
  /*
   * A blunt guard on the exact strings this shop must never publish again. If
   * someone reintroduces a transit estimate, one of these fails.
   */
  const banned = /\b(delivery takes|arrives in|in transit for|business days? (?:in transit|domestically)|Expected \w{3} \d)/i;
  const offenders = [];
  for (let day = 1; day <= 28; day += 1) {
    for (const country of ['US', 'CN', 'GB']) {
      for (const method of ['standard', 'express']) {
        const created = `2026-10-${String(day).padStart(2, '0')} 09:00:00`;
        const f = fulfilment(
          order({ created_at: created, paid_at: created, shipping_country: country, shipping_method: method }),
          { now: noonMonday },
        );
        for (const stage of f.stages) {
          if (banned.test(stage.promise) || banned.test(stage.body)) {
            offenders.push(`${created} ${country} ${method} ${stage.key}: ${stage.promise}`);
          }
        }
      }
    }
  }
  check('no combination of date, country and service produces a delivery estimate',
    offenders.length === 0, offenders.slice(0, 3).join(' | '));
}

console.log(`\n  ${pass} passed, ${failures.length} failed\n`);
if (failures.length) {
  console.log('  Failures:');
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
