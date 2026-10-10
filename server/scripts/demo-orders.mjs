/**
 * Create a handful of representative orders for visual review.
 *
 * The confirmation page has six stages and four terminal states, and the smoke
 * suite only ever produces refunded orders. Reviewing the design therefore needs
 * orders sitting at each point in the lifecycle. These are real orders created
 * through the same orders module the storefront uses, not hand-written rows, and
 * they are marked with a customer name that makes their origin obvious.
 *
 *   node server/scripts/demo-orders.mjs
 *
 * Idempotent per run in the sense that each run adds new orders; delete the
 * database if you want a clean slate. Nothing here runs in production.
 */
import { getDb } from '../db.mjs';
import { priceCart, createOrder, updateOrderStatus } from '../orders.mjs';

const db = getDb();

/** A couple of real product variants, so the orders carry real line items. */
function pickLines({ kind = '', limit = 3 } = {}) {
  const rows = db.prepare(
    `SELECT v.id AS variant_id, v.product_id, v.price_cents, v.label, p.name
       FROM variants v
       JOIN products p ON p.id = v.product_id
       JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1 AND (? = '' OR c.kind = ?)
      ORDER BY v.id LIMIT ?`,
  ).all(kind, kind, limit);
  if (!rows.length) throw new Error(`no variants in the catalogue for kind ${kind || '(any)'}`);
  return rows.map((r, i) => ({ variantId: r.variant_id, quantity: i === 0 ? 2 : 1 }));
}

const SCENARIOS = [
  {
    label: 'processing, domestic standard, before the cut-off',
    customer: { name: 'Review Processing', email: 'review-processing@chayuan.test', phone: '+1 416 555 0101' },
    shipping: { name: 'Review Processing', line1: '88 Spadina Avenue', line2: 'Unit 400', city: 'Toronto', province: 'ON', postalCode: 'M5V 2J4', country: 'CA' },
    shippingMethod: 'standard',
    status: 'processing',
  },
  {
    label: 'shipped, domestic express',
    customer: { name: 'Review Express', email: 'review-express@chayuan.test', phone: '+1 604 555 0144' },
    shipping: { name: 'Review Express', line1: '1200 Robson Street', line2: '', city: 'Vancouver', province: 'BC', postalCode: 'V6E 1B5', country: 'CA' },
    shippingMethod: 'express',
    status: 'shipped',
  },
  {
    label: 'shipped, international standard',
    customer: { name: 'Review Overseas', email: 'review-overseas@chayuan.test', phone: '+44 20 7946 0102' },
    shipping: { name: 'Review Overseas', line1: '42 Redchurch Street', line2: 'Flat 3', city: 'London', province: 'England', postalCode: 'E2 7DJ', country: 'GB' },
    shippingMethod: 'standard',
    status: 'shipped',
  },
  {
    label: 'delivered, international standard',
    customer: { name: 'Review Delivered', email: 'review-delivered@chayuan.test', phone: '+1 212 555 0188' },
    shipping: { name: 'Review Delivered', line1: '350 Fifth Avenue', line2: 'Suite 5900', city: 'New York', province: 'NY', postalCode: '10118', country: 'US' },
    shippingMethod: 'standard',
    status: 'delivered',
  },
  {
    // The packing and aftercare copy must differ for stone and metal: an order
    // of jade is not "weighed to the gram" and does not need tin advice.
    label: 'processing, jade and jewellery only',
    kind: 'jewellery',
    customer: { name: 'Review Stone', email: 'review-stone@chayuan.test', phone: '+1 416 555 0177' },
    shipping: { name: 'Review Stone', line1: '25 The West Mall', line2: '', city: 'Etobicoke', province: 'ON', postalCode: 'M9C 1B8', country: 'CA' },
    shippingMethod: 'standard',
    status: 'processing',
  },
];

const created = [];

for (const scenario of SCENARIOS) {
  const lines = pickLines({ kind: scenario.kind || '' });
  const priced = priceCart(lines, { shippingMethod: scenario.shippingMethod });
  const order = createOrder({
    priced,
    customer: scenario.customer,
    shipping: scenario.shipping,
    shippingMethod: scenario.shippingMethod,
    note: 'Design review fixture — not a real order.',
  });

  // Mark it paid, the way a successful callback would.
  db.prepare(
    `UPDATE orders
        SET payment_status = 'success', paid_at = datetime('now'),
            ott_cc_type = 'VISA', ott_card_last4 = '4242',
            ott_payment_id = ?, ott_reference = ?, ott_payment_status = 'SUCCESS'
      WHERE id = ?`,
  ).run(`demo-${order.orderId}`, `DEMO${order.orderNumber.replace(/\D/g, '')}`, order.orderId);

  if (scenario.status !== 'paid') updateOrderStatus(order.orderId, scenario.status);

  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.orderId);
  created.push({ label: scenario.label, number: row.order_number, status: row.status, url: `/order/${row.order_number}?email=${encodeURIComponent(row.customer_email)}` });
}

console.log('Demo orders created for visual review\n');
for (const c of created) {
  console.log(`  ${c.status.padEnd(10)} ${c.number.padEnd(20)} ${c.label}`);
  console.log(`  ${''.padEnd(10)} ${c.url}`);
}
console.log('\n  Each is reachable at /order/<number>?email=<customer email>, or via admin.');
