/**
 * Asset integrity check.
 *
 * Crawls every storefront page, extracts every image reference, and reports any
 * that a request would 404 on. Catches the class of bug that only shows up as a
 * broken image in a corner of a page nobody looked at.
 *
 *   node server/scripts/check-assets.mjs [baseUrl]
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const PAGES = [
  '/',
  '/shop',
  '/shop?category=oolong-tea',
  '/shop?category=teaware',
  '/shop?category=gift-sets',
  '/shop?q=tea&sort=price-asc',
  '/tea/lion-peak-longjing',
  '/tea/yixing-zisha-shi-piao-pot',
  '/tea/bamboo-tea-tray',
  '/tea/the-tea-voyage-gift-box',
  '/tea/aged-white-2019-shoumei',
  '/tea/porcelain-gaiwan-set',
  '/cart',
  '/checkout',
  '/guides',
  '/guides/how-to-brew-gongfu',
  '/about',
  '/shipping',
  '/refund',
  '/terms',
  '/privacy',
  '/contact',
  '/credits',
  '/order',
];

/** Collect src/href image references plus CSS url(...) targets. */
function extractRefs(html) {
  const refs = new Set();
  for (const match of html.matchAll(/<img[^>]+src="([^"]+)"/g)) refs.add(match[1]);
  for (const match of html.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) refs.add(match[2]);
  return [...refs].filter((r) => r && !r.startsWith('data:') && !r.startsWith('http'));
}

async function main() {
  console.log(`\nAsset check against ${BASE}\n`);

  const seen = new Map(); // ref -> first page that used it
  let pageErrors = 0;

  for (const page of PAGES) {
    let html = '';
    try {
      const res = await fetch(`${BASE}${page}`);
      html = await res.text();
      if (!res.ok) {
        pageErrors += 1;
        console.log(`  \u001b[31mFAIL\u001b[0m  ${page} — HTTP ${res.status}`);
        continue;
      }
      if (html.includes('Something went wrong') || html.includes('Error 500')) {
        pageErrors += 1;
        console.log(`  \u001b[31mFAIL\u001b[0m  ${page} — rendered the error page`);
        continue;
      }
    } catch (err) {
      pageErrors += 1;
      console.log(`  \u001b[31mFAIL\u001b[0m  ${page} — ${err.message}`);
      continue;
    }
    for (const ref of extractRefs(html)) {
      if (!seen.has(ref)) seen.set(ref, page);
    }
  }

  console.log(`  ${PAGES.length - pageErrors}/${PAGES.length} pages rendered`);
  console.log(`  ${seen.size} distinct asset references\n`);

  const broken = [];
  const checked = [...seen.entries()];
  // Small concurrency window; enough to be quick without hammering the server.
  const workers = Array.from({ length: 8 }, async (_, w) => {
    for (let i = w; i < checked.length; i += 8) {
      const [ref, page] = checked[i];
      try {
        const res = await fetch(`${BASE}${ref}`, { method: 'HEAD' });
        if (!res.ok) broken.push({ ref, page, status: res.status });
      } catch (err) {
        broken.push({ ref, page, status: err.message });
      }
    }
  });
  await Promise.all(workers);

  if (broken.length) {
    console.log(`  \u001b[31m${broken.length} broken asset(s):\u001b[0m`);
    for (const b of broken.slice(0, 40)) {
      console.log(`    ${String(b.status).padEnd(6)} ${b.ref}   (first seen on ${b.page})`);
    }
  } else {
    console.log('  \u001b[32mEvery referenced asset resolved.\u001b[0m');
  }

  /*
   * Every photograph URL must carry the asset version.
   *
   * A photograph is replaced in place, under the same filename, so its URL has
   * to change for the browser to notice. When it does not, the corrected image
   * sits on the server and the customer keeps seeing the old one — which is what
   * happened, and which no other check here can see, because a stale image is a
   * perfectly valid 200.
   */
  const unversioned = [...seen.entries()].filter(
    ([ref]) => /^\/img\/photos\/[^?]+\.(jpe?g|png|webp)$/i.test(ref),
  );
  if (unversioned.length) {
    console.log(`  \u001b[31m${unversioned.length} photograph URL(s) without a cache-busting version:\u001b[0m`);
    for (const [ref, page] of unversioned.slice(0, 20)) {
      console.log(`    ${ref}   (first seen on ${page})`);
    }
  } else {
    console.log('  \u001b[32mEvery photograph URL carries the asset version.\u001b[0m');
  }

  const failed = broken.length + pageErrors + unversioned.length;
  console.log(`\n${'-'.repeat(58)}`);
  console.log(`  ${failed === 0 ? 'PASS' : 'FAIL'}  ${failed} problem(s)\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
