/**
 * Fetch a URL and report where needles appear, so a failing assertion can be
 * traced without a browser.
 *
 *   node server/scripts/grep-page.mjs "/order/CY-x?email=a@b.c" "Smoke Tester" "Order received"
 */
const [target, ...needles] = process.argv.slice(2);
const base = process.env.BASE_URL || 'http://127.0.0.1:3080';
if (!target) {
  console.error('usage: node server/scripts/grep-page.mjs <path> [needle ...]');
  process.exitCode = 2;
} else {
  const res = await fetch(new URL(target, base), { redirect: 'manual' });
  const body = await res.text();
  console.log(`status ${res.status}  length ${body.length}\n`);
  for (const needle of needles) {
    const at = body.indexOf(needle);
    console.log(`  ${at >= 0 ? 'FOUND    ' : 'MISSING  '} ${JSON.stringify(needle)}${at >= 0 ? ` @${at}` : ''}`);
  }
  const plain = body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  console.log('\n--- visible text ---');
  console.log(plain.slice(0, 2600));
}
