/**
 * Demonstration script: drives one complete purchase through the running shop.
 *
 *   node server/scripts/demo-order.mjs [baseUrl]
 *
 * Prints the priced basket, the OTT Pay result, the 3-D Secure challenge, the
 * callback reconciliation and the final order record. Mock mode by default.
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/+$/, '');

let jar = '';

async function req(path, { method = 'GET', body = null, form = null, headers = {} } = {}) {
  const h = { ...headers };
  if (jar) h.Cookie = jar;
  let payload;
  if (body !== null) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  if (form !== null) {
    h['Content-Type'] = 'application/x-www-form-urlencoded';
    payload = new URLSearchParams(form).toString();
  }
  const res = await fetch(`${BASE}${path}`, { method, headers: h, body: payload, redirect: 'manual' });
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const cookie of cookies) {
    const name = cookie.split('=')[0];
    jar = [...jar.split('; ').filter((c) => c && !c.startsWith(`${name}=`)), cookie.split(';')[0]].join('; ');
  }
  return res;
}

const money = (c) => `$${(c / 100).toFixed(2)}`;

async function json(path, options) {
  const res = await req(path, options);
  return { status: res.status, data: await res.json() };
}

async function main() {
  console.log(`\nCha Yuan — demonstration order against ${BASE}\n`);

  const config = await json('/api/config');
  const csrf = decodeURIComponent((jar.match(/cy_csrf=([^;]+)/) || [])[1] || '');
  console.log(`payment mode : ${config.data.payment.mode}${config.data.payment.isMock ? ' (simulated acquirer)' : ''}`);
  console.log(`currency     : ${config.data.store.currency}`);

  // 1. Pick a product and a variant.
  const slug = 'aged-white-2019-shoumei';
  const { data: productData } = await json(`/api/products/${slug}`);
  const variant = productData.product.variants[0];
  console.log(`\n1. product   : ${productData.product.name} — ${variant.label} at ${money(variant.price_cents)}`);

  // 2. Server-side pricing.
  const priced = await json('/api/cart/price', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    body: { items: [{ variantId: variant.id, quantity: 2 }], shippingMethod: 'standard' },
  });
  const cart = priced.data.cart;
  console.log(`2. basket    : subtotal ${money(cart.subtotalCents)} + shipping ${money(cart.shippingCents)} + tax ${money(cart.taxCents)} = ${money(cart.totalCents)}`);

  // 3. Checkout with a card that requires a 3-D Secure challenge.
  const checkout = await json('/api/checkout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    body: {
      email: 'buyer@example.com',
      name: 'Mei Lin',
      phone: '+1 416 555 0123',
      address: '88 Spadina Avenue',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5V 2T6',
      country: 'CA',
      shippingMethod: 'standard',
      cardNumber: '5454545454545454',
      cardHolder: 'MEI LIN',
      cardExpiryMonth: '03',
      cardExpiryYear: '30',
      cardCvv: '737',
      items: [{ variantId: variant.id, quantity: 2 }],
      browser: {
        userAgent: 'demo-order/1.0',
        language: 'en-CA',
        screenHeight: 900,
        screenWidth: 1440,
        timezoneOffset: -5,
        colorDepth: 24,
      },
    },
  });

  if (!checkout.data || !checkout.data.ok) {
    console.error('   checkout failed:', JSON.stringify(checkout.data));
    process.exit(1);
  }
  const order = checkout.data;
  console.log(`3. checkout  : HTTP ${checkout.status} → next action "${order.nextAction}"`);
  console.log(`   order     : ${order.orderNumber}`);
  console.log(`   reference : ${order.reference}   (sent to OTT Pay as \`reference\`)`);
  console.log(`   amount    : ${money(order.amountCents)}`);

  // 4. The 3-D Secure challenge relay.
  const challengePage = await req(`/payment/3ds/challenge?ref=${encodeURIComponent(order.reference)}`);
  const challengeHtml = await challengePage.text();
  const challengeId = (challengeHtml.match(/name="MD" value="([^"]+)"/) || [])[1] || '';
  console.log(`4. 3DS page  : HTTP ${challengePage.status}, issuer form present: ${challengeHtml.includes('challenge')}`);
  console.log(`   challenge : ${challengeId ? `${challengeId.slice(0, 16)}…` : '(none)'}`);

  // 5. Authenticate. First with a wrong password, to prove it fails safely.
  const wrong = await req('/mock-3ds/challenge', {
    method: 'POST',
    form: { MD: challengeId, ref: order.reference, password: 'not-the-password' },
  });
  const wrongLocation = wrong.headers.get('location') || '';
  console.log(`5. wrong pwd : HTTP ${wrong.status} → ${wrongLocation}`);

  // A fresh order is needed because the first attempt closed the transaction.
  const retry = await json('/api/checkout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    body: {
      email: 'buyer@example.com',
      name: 'Mei Lin',
      address: '88 Spadina Avenue',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5V 2T6',
      country: 'CA',
      shippingMethod: 'standard',
      cardNumber: '5454545454545454',
      cardHolder: 'MEI LIN',
      cardExpiryMonth: '03',
      cardExpiryYear: '30',
      cardCvv: '737',
      items: [{ variantId: variant.id, quantity: 2 }],
      browser: { userAgent: 'demo-order/1.0', language: 'en-CA', screenHeight: 900, screenWidth: 1440, timezoneOffset: -5, colorDepth: 24 },
    },
  });
  const order2 = retry.data;
  const page2 = await req(`/payment/3ds/challenge?ref=${encodeURIComponent(order2.reference)}`);
  const id2 = ((await page2.text()).match(/name="MD" value="([^"]+)"/) || [])[1] || '';

  const auth = await req('/mock-3ds/challenge', {
    method: 'POST',
    form: { MD: id2, ref: order2.reference, password: 'password' },
  });
  console.log(`6. right pwd : HTTP ${auth.status} → ${auth.headers.get('location')}`);

  // 6. Let the callback land, then read the reconciled order.
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const status = await json(`/api/orders/${order2.orderNumber}/status`);
  console.log(`7. reconciled: ${JSON.stringify(status.data)}`);

  const confirmation = await req(`/order/${order2.orderNumber}?email=buyer@example.com`);
  const confirmationHtml = await confirmation.text();
  console.log(`8. receipt   : HTTP ${confirmation.status}, shows customer: ${confirmationHtml.includes('Mei Lin')}`);
  console.log(`   gateway   : card ${status.data.paymentStatus}, payment id ${status.data.paymentId}\n`);
}

main().catch((err) => {
  console.error('\nDemo failed:', err);
  process.exit(1);
});
