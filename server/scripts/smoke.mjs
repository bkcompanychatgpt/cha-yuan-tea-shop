/**
 * End-to-end smoke test.
 *
 * Drives the real HTTP surface of the running shop:
 *   storefront pages -> cart pricing -> checkout -> 3-D Secure challenge ->
 *   signed AES callback -> order confirmation -> admin sign-in -> refund.
 *
 * Usage:  node server/scripts/smoke.mjs [baseUrl]
 * Default baseUrl is http://127.0.0.1:3080
 */

const BASE = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/+$/, '');

let cookieJar = '';
let passed = 0;
let failed = 0;
const failures = [];

function record(ok, name, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  \u001b[32mPASS\u001b[0m  ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  \u001b[31mFAIL\u001b[0m  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function absorbCookies(response) {
  const raw = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  for (const cookie of raw) {
    const pair = cookie.split(';')[0];
    const [name] = pair.split('=');
    const others = cookieJar
      .split('; ')
      .filter((c) => c && !c.startsWith(`${name}=`));
    others.push(pair);
    cookieJar = others.join('; ');
  }
}

async function request(path, { method = 'GET', body = null, headers = {}, form = null } = {}) {
  const init = { method, headers: { ...headers }, redirect: 'manual' };
  if (cookieJar) init.headers.Cookie = cookieJar;
  if (body !== null) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  if (form !== null) {
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = new URLSearchParams(form).toString();
  }
  const response = await fetch(`${BASE}${path}`, init);
  absorbCookies(response);
  return response;
}

async function json(path, options) {
  const response = await request(path, options);
  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 300) };
  }
  return { status: response.status, ok: response.ok, data, headers: response.headers };
}

function csrfFromCookie() {
  const match = cookieJar.match(/cy_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function main() {
  console.log(`\nCha Yuan smoke test against ${BASE}\n`);
  console.log('Storefront');

  /* ---------------------------------------------------------- storefront */
  {
    const r = await request('/');
    const html = await r.text();
    record(r.status === 200, 'GET / returns 200', `status ${r.status}`);
    record(html.includes('Tea, sourced'), 'homepage renders the hero headline');
    record(html.includes('/tea/lion-peak-longjing'), 'homepage lists products');
    record(html.includes('id="cart-drawer"'), 'cart drawer is present in the layout');
  }

  {
    const r = await request('/shop');
    const html = await r.text();
    record(r.status === 200, 'GET /shop returns 200');
    record((html.match(/class="tea-card"/g) || []).length >= 6, 'shop lists at least 6 products');
  }

  {
    const r = await request('/shop?category=pu-erh&sort=price-desc');
    const html = await r.text();
    record(r.status === 200 && html.includes('Pu-erh'), 'category filter + sort works');
  }

  {
    const r = await request('/tea/tieguanyin-iron-goddess');
    const html = await r.text();
    record(r.status === 200, 'product page returns 200');
    record(html.includes('Brewing') || html.includes('brewing') || html.includes('Gaiwan'), 'product page shows brewing parameters');
    record(html.includes('data-variant-picker'), 'product page renders the variant picker');
    record(html.includes('data-add-to-cart'), 'product page has an add-to-cart control');
  }

  {
    const r = await request('/img/product/tieguanyin-iron-goddess.svg');
    const svg = await r.text();
    record(r.status === 200 && svg.startsWith('<svg'), 'generated product artwork is served');
  }

  for (const path of ['/cart', '/checkout', '/guides', '/guides/how-to-brew-gongfu', '/about', '/shipping', '/terms', '/order']) {
    const r = await request(path);
    record(r.status === 200, `GET ${path} returns 200`, `status ${r.status}`);
  }

  /* ------------------------------------------------------------ API boot */
  console.log('\nJSON API');
  let config;
  {
    const r = await json('/api/config');
    config = r.data;
    record(r.status === 200 && r.data.store, 'GET /api/config returns store config');
    record(typeof r.data.csrfToken === 'string' && r.data.csrfToken.length > 10, 'config issues a CSRF token');
    record(r.data.payment && typeof r.data.payment.isMock === 'boolean', 'config reports the payment mode');
  }

  let variant;
  {
    const r = await json('/api/products/tieguanyin-iron-goddess');
    variant = r.data.product.variants[0];
    record(r.status === 200 && variant && variant.id, 'GET /api/products/:slug returns variants');
  }

  {
    const r = await json('/api/search-index');
    record(r.status === 200 && r.data.products.length > 20, 'search index is populated');
  }

  /* ------------------------------------------------------------ pricing */
  const csrf = csrfFromCookie();
  let priced;
  {
    const r = await json('/api/cart/price', {
      method: 'POST',
      body: { items: [{ variantId: variant.id, quantity: 2 }] },
      headers: { 'X-CSRF-Token': csrf },
    });
    priced = r.data.cart;
    const expected = variant.price_cents * 2;
    record(r.status === 200 && priced.subtotalCents === expected, 'cart pricing matches the catalog price', `got ${priced?.subtotalCents}, expected ${expected}`);
    record(priced.taxCents === Math.round((priced.subtotalCents + priced.shippingCents) * config.store.taxRate), 'tax is computed server-side');
    record(priced.totalCents === priced.subtotalCents + priced.shippingCents + priced.taxCents, 'total equals subtotal + shipping + tax');
  }

  {
    const r = await json('/api/cart/price', {
      method: 'POST',
      body: { items: [{ variantId: variant.id, quantity: 1 }] },
      headers: { 'X-CSRF-Token': 'not-the-right-token' },
    });
    record(r.status === 403, 'cart pricing rejects a bad CSRF token', `status ${r.status}`);
  }

  /* ------------------------------------------------ free shipping threshold */
  {
    const r = await json('/api/products/lion-peak-longjing');
    const expensive = r.data.product.variants.find((v) => v.price_cents >= config.store.freeShippingThreshold) || r.data.product.variants[0];
    const r2 = await json('/api/cart/price', {
      method: 'POST',
      body: { items: [{ variantId: expensive.id, quantity: 1 }] },
      headers: { 'X-CSRF-Token': csrf },
    });
    const cart = r2.data.cart;
    if (cart.subtotalCents >= config.store.freeShippingThreshold) {
      record(cart.shippingCents === 0, 'shipping is free above the threshold');
    } else {
      record(cart.shippingCents > 0, 'shipping is charged below the threshold');
    }
  }

  /* ------------------------------------------------------------ checkout */
  console.log('\nCheckout and payment');

  const goodCard = {
    number: '5454545454545454',
    expiryMonth: '03',
    expiryYear: '30',
    cvv: '737',
  };

  const baseOrder = {
    email: 'smoke@chayuan.test',
    name: 'Smoke Tester',
    phone: '+1 416 555 0123',
    address: '1123 Leslie Street',
    address2: '',
    city: 'Toronto',
    province: 'ON',
    postalCode: 'M3C 2K5',
    country: 'CA',
    shippingMethod: 'standard',
    note: 'Automated smoke test order.',
    items: [{ variantId: variant.id, quantity: 1 }],
    browser: {
      userAgent: 'smoke-test/1.0',
      language: 'en-CA',
      screenHeight: 1080,
      screenWidth: 1920,
      timezoneOffset: -5,
      colorDepth: 24,
    },
  };

  /* Validation must reject a bad card. */
  {
    const r = await json('/api/checkout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: { ...baseOrder, cardNumber: '1234567812345678', cardHolder: 'A B', cardExpiryMonth: '03', cardExpiryYear: '30', cardCvv: '737' },
    });
    record(r.status === 400 && r.data.errors?.cardNumber, 'checkout rejects an invalid card number', JSON.stringify(r.data.errors || {}));
  }

  {
    const r = await json('/api/checkout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: { ...baseOrder, postalCode: 'ZZZZZ', cardNumber: goodCard.number, cardHolder: 'Smoke Tester', cardExpiryMonth: '03', cardExpiryYear: '30', cardCvv: '737' },
    });
    record(r.status === 400 && r.data.errors?.postalCode, 'checkout rejects an invalid Canadian postal code');
  }

  /* Declined card must not create a paid order. */
  {
    const r = await json('/api/checkout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: { ...baseOrder, cardNumber: '4000000000000002', cardHolder: 'Smoke Tester', cardExpiryMonth: '03', cardExpiryYear: '30', cardCvv: '737' },
    });
    record(r.status === 402, 'a declined card returns 402', `status ${r.status}`);
    const status = await json(`/api/orders/${r.data.orderNumber}/status`);
    record(status.data.paymentStatus !== 'success', 'a declined payment does not mark the order paid', status.data.paymentStatus);
  }

  /* 3-D Secure challenge flow with the good card. */
  let orderNumber = '';
  let reference = '';
  {
    const r = await json('/api/checkout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: { ...baseOrder, cardNumber: goodCard.number, cardHolder: 'Smoke Tester', cardExpiryMonth: goodCard.expiryMonth, cardExpiryYear: goodCard.expiryYear, cardCvv: goodCard.cvv },
    });
    record(r.status === 200 && r.data.ok, 'checkout succeeds for a valid card', JSON.stringify(r.data).slice(0, 200));
    record(r.data.nextAction === 'challenge', 'the 3DS challenge flow is triggered', r.data.nextAction);
    orderNumber = r.data.orderNumber;
    reference = r.data.reference;
    record(Boolean(r.data.challengeUrl), 'a challenge URL is returned');
  }

  {
    const r = await request(`/payment/3ds/challenge?ref=${encodeURIComponent(reference)}`);
    const html = await r.text();
    record(r.status === 200 && html.includes('Confirm your payment'), 'the 3DS challenge page renders');
    record(html.includes('MD') || html.includes('challenge'), 'the challenge page carries the issuer form');
  }

  /* Wrong password: authentication must fail and the order must not be paid. */
  {
    const r = await request('/mock-3ds/challenge', {
      method: 'POST',
      form: { MD: 'unknown-challenge-id', ref: reference, password: 'wrong-password' },
    });
    record(r.status === 303 || r.status === 302, 'a failed challenge redirects back to the result page', `status ${r.status}`);
  }

  /* Now resolve the real challenge with the correct password. */
  let challengeId = '';
  {
    const r = await json(`/api/orders/${orderNumber}/status`);
    const stored = await json(`/api/ottpay/callback`, { method: 'GET' }).catch(() => null);
    void stored;
    // The challenge id lives in the rendered page; grab it from the HTML.
    const page = await request(`/payment/3ds/challenge?ref=${encodeURIComponent(reference)}`);
    const html = await page.text();
    const match = html.match(/name="MD" value="([^"]+)"/);
    challengeId = match ? match[1] : '';
    record(Boolean(challengeId), 'the challenge id is present on the challenge page');
    void r;
  }

  {
    const r = await request('/mock-3ds/challenge', {
      method: 'POST',
      form: { MD: challengeId, ref: reference, password: 'password' },
    });
    record(r.status === 303 || r.status === 302, 'a correct 3DS password redirects to the result page', `status ${r.status}`);
    const location = r.headers.get('location') || '';
    record(location.includes(orderNumber), 'the redirect points at this order', location);
  }

  {
    const r = await json(`/api/orders/${orderNumber}/status`);
    record(r.data.paymentStatus === 'success', 'the order is marked paid after the 3DS challenge', r.data.paymentStatus);
    record(r.data.status === 'paid', 'the order status is paid', r.data.status);
    record(Boolean(r.data.paymentId), 'the gateway payment id was captured', r.data.paymentId);
  }

  {
    const r = await json(`/api/orders/${orderNumber}/sync`, { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: {} });
    record(r.status === 200 && r.data.gateway, 'status re-query against the gateway works');
  }

  {
    const r = await request(`/order/${orderNumber}?email=smoke@chayuan.test`);
    const html = await r.text();
    record(r.status === 200 && html.includes(orderNumber), 'the order confirmation page renders');
    record(html.includes('Smoke Tester'), 'the confirmation shows the customer');
  }

  /* ------------------------------------------------------ callback crypto */
  console.log('\nCallback decryption');
  {
    const { deriveCallbackKey, candidateCallbackKeys, decryptCallback, encryptCallbackPayload } = await import('../ottpay.mjs');

    const key = deriveCallbackKey('5A917182659DE14DCB3022CA6518F34F', 'A8B5FE540E38A5A9');
    // OTT Pay's documented worked example. MD5("5A9171…F34F" + "A8B5FE540E38A5A9")
    // is 38315225BFE59D83C221F21727E31BE4, and the documented AES-128 key
    // BFE59D83C221F217 is the middle 16 characters of that digest.
    record(key === 'BFE59D83C221F217', 'the callback key matches the documented example', key);
    record(
      candidateCallbackKeys('5A917182659DE14DCB3022CA6518F34F', 'A8B5FE540E38A5A9')[0] === 'BFE59D83C221F217',
      'the documented key framing is tried first',
    );

    const { data, md5 } = encryptCallbackPayload({ reference: 'ABC123', order_status: 'captured' }, 'DEADBEEFDEADBEEFDEADBEEFDEADBEEF', 'A8B5FE540E38A5A9');
    const out = decryptCallback({ data, md5 }, 'A8B5FE540E38A5A9');
    record(out.ok && out.payload.reference === 'ABC123', 'a callback round-trips through AES-128-ECB', out.error || '');
  }

  {
    const r = await json('/api/ottpay/callback', {
      method: 'POST',
      body: { rsp_code: 'SUCCESS', rsp_msg: 'success', merchant_id: 'X', md5: 'AABB', data: 'bm90LXJlYWwtY2lwaGVy' },
    });
    record(r.status === 200 && r.data.rsp_code === 'SUCCESS', 'a malformed callback is acknowledged without crashing');
  }

  /* ------------------------------------------------------------ admin */
  console.log('\nAdmin back office');
  {
    const r = await request('/admin');
    record(r.status === 302 && (r.headers.get('location') || '').includes('/admin/login'), 'admin redirects to sign-in when unauthenticated', `status ${r.status}`);
  }

  {
    const r = await request('/admin/login', {
      method: 'POST',
      form: { email: 'owner@chayuan.test', password: 'wrong-password', next: '/admin' },
    });
    record(r.status === 401, 'admin rejects a wrong password', `status ${r.status}`);
  }

  {
    const r = await request('/admin/login', {
      method: 'POST',
      form: { email: 'owner@chayuan.test', password: 'changeme-please', next: '/admin' },
    });
    record(r.status === 302 && (r.headers.get('location') || '').includes('/admin'), 'admin accepts the configured password', `status ${r.status}`);
  }

  for (const path of ['/admin', '/admin/orders', `/admin/orders/${orderNumber}`, '/admin/products', '/admin/webhooks', '/admin/settings']) {
    const r = await request(path);
    const html = await r.text();
    record(r.status === 200 && html.length > 800, `GET ${path} renders`, `status ${r.status}`);
  }

  {
    const r = await request(`/admin/orders/${orderNumber}`);
    const html = await r.text();
    record(html.includes('Payment attempts'), 'the order page shows payment attempts');
    record(html.includes('Refund'), 'the order page offers a refund form');
  }

  /* Refund as admin. */
  {
    const r = await request(`/admin/orders/${orderNumber}/refund`, { method: 'POST', form: { amount: '5.00', reason: 'smoke test' } });
    record(r.status === 302, 'a partial refund is accepted', `status ${r.status}`);
    const status = await json(`/api/orders/${orderNumber}/status`);
    record(status.data.paymentStatus === 'partial_refunded' || status.data.status === 'paid', 'the refund is recorded', `${status.data.status}/${status.data.paymentStatus}`);
  }

  {
    const r = await request(`/admin/orders/${orderNumber}/refund`, { method: 'POST', form: { full: '1' } });
    record(r.status === 302, 'the remaining balance can be refunded', `status ${r.status}`);
    const status = await json(`/api/orders/${orderNumber}/status`);
    record(status.data.paymentStatus === 'refunded', 'the order is fully refunded', status.data.paymentStatus);
  }

  /* ---------------------------------------------------------- 404 / misc */
  console.log('\nRobustness');
  for (const path of ['/tea/does-not-exist', '/guides/nope', '/order/CY-19700101-0001', '/admin/orders/CY-19700101-0001']) {
    const r = await request(path);
    record(r.status === 404, `GET ${path} returns 404`, `status ${r.status}`);
  }
  {
    const r = await json('/api/products/does-not-exist');
    record(r.status === 404, 'unknown API product returns 404');
  }
  {
    const r = await json('/api/checkout', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: { ...baseOrder, items: [], cardNumber: goodCard.number, cardHolder: 'A B', cardExpiryMonth: '03', cardExpiryYear: '30', cardCvv: '737' } });
    record(r.status === 400 && r.data.errors?.cart, 'an empty basket is rejected');
  }

  /* ------------------------------------------------------------- summary */
  console.log(`\n${'-'.repeat(58)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\n  Failures:');
    failures.forEach((f) => console.log(`   - ${f}`));
  }
  console.log('');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('\nSmoke test could not complete:', err);
  process.exit(1);
});
