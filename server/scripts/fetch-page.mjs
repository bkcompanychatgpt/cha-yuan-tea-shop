/**
 * Fetch a page and print the status plus a slice of the body, so a 500 from an
 * EJS render can be read without a browser.
 *
 *   node server/scripts/fetch-page.mjs "/order/CY-20261010-0028?email=x@y.z"
 */
const target = process.argv[2];
const base = process.env.BASE_URL || 'http://127.0.0.1:3080';
if (!target) {
  console.error('usage: node server/scripts/fetch-page.mjs <path> [needle]');
  process.exitCode = 2;
} else {
  const needle = process.argv[3];
  const res = await fetch(new URL(target, base), { redirect: 'manual' });
  const body = await res.text();
  console.log(`status   ${res.status} ${res.statusText}`);
  console.log(`length   ${body.length}`);
  console.log(`type     ${res.headers.get('content-type')}`);
  if (needle) {
    const at = body.indexOf(needle);
    console.log(`needle   ${at >= 0 ? `found at ${at}` : 'NOT FOUND'} (${JSON.stringify(needle)})`);
  }
  if (res.status >= 400) {
    console.log('\n--- body ---');
    const text = body.replace(/<script[\s\S]*?<\/script>/g, '');
    const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(plain.slice(0, 1800));
  } else if (process.argv.includes('--head')) {
    console.log('\n--- first 1200 chars ---');
    console.log(body.slice(0, 1200));
  }
}
