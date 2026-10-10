/** Dump the customer and fulfilment fields for one order number. */
import { getDb } from '../db.mjs';
import { fulfilment } from '../fulfilment.mjs';

const number = process.argv[2];
const db = getDb();
const row = number
  ? db.prepare('SELECT * FROM orders WHERE order_number = ?').get(number)
  : db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();

if (!row) {
  console.log('no such order');
  process.exitCode = 1;
} else {
  for (const key of [
    'order_number', 'status', 'payment_status', 'shipping_method', 'shipping_country',
    'customer_name', 'customer_email', 'shipping_name', 'shipping_city', 'shipping_province',
    'created_at', 'paid_at',
  ]) {
    console.log(`  ${key.padEnd(18)} ${JSON.stringify(row[key])}`);
  }
  const f = fulfilment(row);
  console.log('\n  fulfilment');
  console.log(`    method        ${f.methodLabel}`);
  console.log(`    packSameDay   ${f.packSameDay}`);
  console.log(`    dispatchBy    ${f.dispatchBy?.toISOString()} (${f.dispatchBy && f.dispatchBy.toUTCString()})`);
  console.log(`    eta           ${f.etaLabel}`);
  for (const s of f.stages) console.log(`    ${s.state.padEnd(8)} ${s.title.padEnd(24)} ${s.promise}`);
}
