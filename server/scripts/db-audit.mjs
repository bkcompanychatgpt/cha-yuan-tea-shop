/**
 * Post-run database audit.
 *
 * Confirms what the storefront actually persisted after a payment: that callbacks
 * decrypted, that orders reconciled, and — most importantly — that no card data
 * reached the database.
 *
 *   node server/scripts/db-audit.mjs
 */
import { all, get } from '../db.mjs';

console.log('\nCha Yuan database audit\n');

console.log('--- payment callbacks (decrypted with AES-128-ECB) ---');
const events = all(
  'SELECT id, order_id, rsp_code, processed, error, substr(decrypted, 1, 160) AS payload FROM webhook_events ORDER BY id DESC LIMIT 4',
);
if (!events.length) console.log('  (none yet — run npm run demo)');
for (const e of events) {
  console.log(`  #${e.id}  order ${e.order_id || '—'}  rsp ${e.rsp_code}  processed ${e.processed ? 'yes' : 'no'}`);
  if (e.payload) console.log(`      ${e.payload}`);
  if (e.error) console.log(`      ERROR: ${e.error}`);
}

console.log('\n--- payment attempts ---');
const attempts = all(
  'SELECT reference, status, ott_payment_status, ott_payment_id, cc_type, card_last4, kount_session_id FROM payment_attempts ORDER BY id DESC LIMIT 5',
);
if (!attempts.length) console.log('  (none yet)');
for (const a of attempts) {
  console.log(
    `  ${a.reference}  ${a.status}/${a.ott_payment_status}  ${a.cc_type || '—'} ····${a.card_last4 || '----'}  kount:${a.kount_session_id || '—'}  id:${a.ott_payment_id || '—'}`,
  );
}

console.log('\n--- card-data leak check ---');
const suspicious = [
  ['full PAN in request_payload', get("SELECT COUNT(*) AS n FROM payment_attempts WHERE request_payload LIKE '%5454545454545454%' OR request_payload LIKE '%accountNumber%'")],
  ['full PAN in response_payload', get("SELECT COUNT(*) AS n FROM payment_attempts WHERE response_payload LIKE '%5454545454545454%' OR response_payload LIKE '%accountNumber%'")],
  ['CVV anywhere in attempts', get("SELECT COUNT(*) AS n FROM payment_attempts WHERE request_payload LIKE '%cvn2%' OR response_payload LIKE '%cvn2%' OR request_payload LIKE '%737%'")],
  ['card fields in webhook rows', get("SELECT COUNT(*) AS n FROM webhook_events WHERE decrypted LIKE '%accountNumber%' OR raw_body LIKE '%accountNumber%'")],
  // The stored fragment must be nothing at all, or exactly four digits — never longer.
  [
    'a stored card fragment longer than 4 digits',
    get("SELECT COUNT(*) AS n FROM orders WHERE ott_card_last4 <> '' AND (length(ott_card_last4) <> 4 OR ott_card_last4 GLOB '*[^0-9]*')"),
  ],
  [
    'a stored fragment longer than 4 digits (attempts)',
    get("SELECT COUNT(*) AS n FROM payment_attempts WHERE card_last4 <> '' AND (length(card_last4) <> 4 OR card_last4 GLOB '*[^0-9]*')"),
  ],
];
let leaks = 0;
for (const [label, row] of suspicious) {
  const ok = (row?.n ?? 0) === 0;
  if (!ok) leaks += 1;
  console.log(`  ${ok ? 'CLEAN' : 'LEAK '}  ${label}: ${row?.n ?? 0}`);
}

console.log('\n--- orders ---');
const stats = get(`
  SELECT
    (SELECT COUNT(*) FROM orders) AS total,
    (SELECT COUNT(*) FROM orders WHERE status = 'paid') AS paid,
    (SELECT COUNT(*) FROM orders WHERE payment_status IN ('failed','challenge')) AS unpaid,
    (SELECT COALESCE(SUM(total_cents),0) FROM orders WHERE status = 'paid') AS revenue
`);
console.log(`  ${stats.total} orders, ${stats.paid} paid, ${stats.unpaid} unpaid/failed, revenue $${(stats.revenue / 100).toFixed(2)}`);

const masked = get(
  "SELECT order_number, status, payment_status, ott_cc_type, ott_card_last4, ott_payment_id FROM orders WHERE ott_payment_id <> '' ORDER BY id DESC LIMIT 1",
);
if (masked) {
  console.log(`  latest paid: ${masked.order_number} ${masked.status}/${masked.payment_status} ${masked.ott_cc_type} ····${masked.ott_card_last4} id ${masked.ott_payment_id}`);
}

console.log(`\n  ${leaks === 0 ? 'PASS' : 'FAIL'}  no card data persisted\n`);
process.exit(leaks === 0 ? 0 : 1);
