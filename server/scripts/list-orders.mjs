/** Print the most recent orders, to aim a browser at a real confirmation page. */
import { getDb } from '../db.mjs';

const db = getDb();
const rows = db.prepare(
  `SELECT order_number, status, payment_status, shipping_method, shipping_country,
          total_cents, created_at, paid_at
     FROM orders ORDER BY id DESC LIMIT 8`,
).all();
for (const r of rows) {
  console.log([
    r.order_number.padEnd(20),
    String(r.status).padEnd(11),
    String(r.payment_status).padEnd(10),
    String(r.shipping_method).padEnd(9),
    String(r.shipping_country).padEnd(3),
    String(r.total_cents).padStart(8),
    r.created_at,
    r.paid_at || '-',
  ].join('  '));
}
