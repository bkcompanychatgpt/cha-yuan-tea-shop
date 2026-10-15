/**
 * The four things the shop must not say.
 *
 * Each of these was a deliberate instruction from the operator, and each is the
 * kind of thing that reappears by accident — a new page, a reworded paragraph, a
 * cached template someone copied. So they are asserted against the rendered
 * HTML of every customer-facing page rather than against the source, because the
 * rendered page is what a customer reads and it is the only place a partial, a
 * layout or a locale could reintroduce one.
 *
 *   1. **No payment processor name.** The acquiring institution is not to be
 *      disclosed to customers. Naming a gateway is not required by the card
 *      schemes and the operator does not want it published. (Admin pages, the
 *      code and docs/payment-methods.md still name it — those are operational,
 *      not customer-facing, and removing it there would make the integration
 *      unmaintainable.)
 *
 *   2. **No Canadian shipping origin.** All orders ship from China. There is no
 *      overseas warehouse, and a page claiming one is a page a customer can hold
 *      the shop to.
 *
 *   3. **No delivery estimate of any kind.** Dispatch is promised within 48
 *      hours; arrival is not promised at all. "2 to 5 business days", "delivery
 *      takes", "7–14" and any variant of them are failures.
 *
 *   4. **The 48-hour dispatch promise is present** where an order promise
 *      belongs, so rule 3 cannot be satisfied by simply deleting the promises.
 *
 *   node server/scripts/check-copy.mjs
 */
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const PAGES = [
  '/', '/shop', '/shop?department=tea', '/shop?department=jade', '/shop?department=jewellery',
  '/tea/lion-peak-longjing', '/tea/jade-carved-pendant-tiger', '/guides', '/guides/how-to-brew-gongfu',
  '/cart', '/checkout', '/about', '/shipping', '/refund', '/terms', '/privacy', '/contact', '/credits', '/order',
];

/** Phrases that must never reach a customer, with why. */
const BANNED = [
  { pattern: /OTT[ -]?Pay/i, why: 'names the payment processor' },
  { pattern: /\b(?:shipped|shipping|dispatched|packed)[^.<]{0,30}\bfrom Canada\b/i, why: 'claims a Canadian shipping origin' },
  { pattern: /\b(?:tea room|warehouse|warehouses?|fulfilment centre)[^.<]{0,30}\bin Canada\b/i, why: 'claims a Canadian warehouse' },
  { pattern: /\bCanada\b[^.<]{0,30}\b(?:warehouse|fulfilment)\b/i, why: 'claims a Canadian warehouse' },
  { pattern: /\bdelivery takes\b/i, why: 'quotes a delivery time' },
  { pattern: /\barrives? in \d/i, why: 'quotes a delivery time' },
  { pattern: /\bbusiness days? (?:in transit|domestically|internationally|\d)/i, why: 'quotes a transit time' },
  /*
   * A day range is only banned when it is about the journey. "Refunds appear
   * within 5 to 10 business days" is a promise about our own refund desk, which
   * the customer is entitled to and which no carrier can change — that is not a
   * delivery estimate and must not be flagged as one.
   */
  {
    pattern: /\d+\s*(?:to|–|-|—)\s*\d+\s*business days[^.]{0,50}\b(?:delivery|transit|arrive|arrival|shipping|ship|customs)\b/i,
    why: 'quotes a transit time',
  },
  {
    pattern: /\b(?:delivery|transit|arrive|arrival|shipping|ship)\w*\b[^.]{0,60}\d+\s*(?:to|–|-|—)\s*\d+\s*business days/i,
    why: 'quotes a transit time',
  },
  { pattern: /\bExpected (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/, why: 'quotes an arrival date' },
];

/** Pages that must carry the dispatch promise, and what proves it. */
const MUST_PROMISE = [
  '/', '/shop', '/tea/lion-peak-longjing', '/cart', '/checkout', '/about', '/shipping', '/contact',
];

console.log(`\nCustomer copy audit against ${BASE}\n`);

let problems = 0;
const found = new Map();

for (const page of PAGES) {
  let html;
  try {
    const res = await fetch(`${BASE}${page}`);
    if (!res.ok) {
      console.log(`  \u001b[31mFAIL\u001b[0m  ${page} — HTTP ${res.status}`);
      problems += 1;
      continue;
    }
    html = await res.text();
  } catch (err) {
    console.log(`  \u001b[31mFAIL\u001b[0m  ${page} — ${err.message}`);
    problems += 1;
    continue;
  }

  // Strip markup so a phrase split across tags is judged as the reader sees it.
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

  const hits = [];
  for (const rule of BANNED) {
    const m = text.match(rule.pattern);
    if (m) hits.push({ why: rule.why, sample: m[0], index: m.index });
  }

  if (hits.length) {
    problems += hits.length;
    console.log(`  \u001b[31mFAIL\u001b[0m  ${page}`);
    for (const h of hits) {
      const around = text.slice(Math.max(0, h.index - 60), h.index + h.sample.length + 60);
      console.log(`          ${h.why}: "${h.sample}"`);
      console.log(`            …${around.trim()}…`);
      found.set(h.sample.toLowerCase(), h.why);
    }
  } else {
    console.log(`  \u001b[32mPASS\u001b[0m  ${page} — clean`);
  }
}

/* ------------------------------------------------- the promise must exist */
console.log('\n  Dispatch promise\n');
for (const page of MUST_PROMISE) {
  let text = '';
  try {
    const res = await fetch(`${BASE}${page}`);
    text = (await res.text()).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  } catch {
    text = '';
  }
  const ok = /48 hours/.test(text);
  if (!ok) problems += 1;
  console.log(`  ${ok ? '\u001b[32mPASS\u001b[0m' : '\u001b[31mFAIL\u001b[0m'}  ${page} — states the 48-hour dispatch promise`);
}

console.log(`\n${'-'.repeat(58)}`);
console.log(`  ${problems === 0 ? 'PASS' : 'FAIL'}  ${problems} problem(s)\n`);
process.exit(problems ? 1 : 0);
