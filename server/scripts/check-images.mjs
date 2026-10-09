/**
 * Verify that every image the HTML actually references can be served.
 *
 * Broken image references are invisible in server logs and easy to miss, because
 * a missing image does not produce an error — the page just renders without it.
 * This fetches the pages, extracts every local <img src>, and requests each one,
 * reporting the ones that do not come back as an image.
 *
 *   node server/scripts/check-images.mjs [baseUrl]
 *
 * Run it against a deployed URL to tell a broken reference apart from a problem
 * with the deployment itself: a bad path fails here and in the browser, while a
 * storage or build problem fails here with a status the browser cannot show you.
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const PAGES = [
  '/',
  '/shop',
  '/shop?category=green-tea',
  '/shop?category=teaware',
  '/tea/lion-peak-longjing',
  '/tea/wuyi-shuixian',
  '/tea/bamboo-tea-tray',
  '/cart',
  '/checkout',
  '/about',
  '/credits',
];

const IMAGE_EXT = /\.(jpe?g|png|webp|svg|gif|avif)$/i;

async function main() {
  console.log(`\nImage check against ${BASE}\n`);

  const refs = new Map(); // src -> first page that referenced it
  let pagesOk = 0;

  for (const page of PAGES) {
    let html;
    try {
      const res = await fetch(`${BASE}${page}`);
      html = await res.text();
      if (!res.ok) {
        console.log(`  ${page}: HTTP ${res.status}`);
        continue;
      }
      pagesOk += 1;
    } catch (err) {
      console.log(`  ${page}: ${err.message}`);
      continue;
    }

    for (const match of html.matchAll(/<img[^>]*src="([^"]+)"/g)) {
      const src = match[1];
      if (!src.startsWith('/')) continue;
      if (!refs.has(src)) refs.set(src, page);
    }
  }

  console.log(`  ${pagesOk}/${PAGES.length} pages fetched`);
  console.log(`  ${refs.size} distinct local images referenced\n`);

  const broken = [];
  const entries = [...refs.entries()];

  // A small concurrency window: enough to be quick without hammering the host.
  const workers = Array.from({ length: 6 }, async (_, w) => {
    for (let i = w; i < entries.length; i += 6) {
      const [src, page] = entries[i];
      try {
        const res = await fetch(`${BASE}${src}`, { method: 'GET' });
        const type = res.headers.get('content-type') || '';
        if (!res.ok) {
          broken.push({ src, page, problem: `HTTP ${res.status}` });
        } else if (!/^image\//.test(type)) {
          broken.push({ src, page, problem: `content-type "${type}" is not an image` });
        }
      } catch (err) {
        broken.push({ src, page, problem: err.message });
      }
    }
  });
  await Promise.all(workers);

  if (broken.length) {
    console.log(`  \u001b[31m${broken.length} image(s) did not come back as an image:\u001b[0m`);
    for (const b of broken.slice(0, 40)) {
      console.log(`    ${b.problem.padEnd(34)} ${b.src}`);
      console.log(`      first referenced on ${b.page}`);
    }
  } else {
    console.log('  \u001b[32mEvery referenced image is served as an image.\u001b[0m');
  }

  // Note anything referenced but not matching an image extension, since that is
  // usually a typo rather than a genuine asset.
  const odd = [...refs.keys()].filter((s) => !IMAGE_EXT.test(s));
  if (odd.length) {
    console.log(`\n  ${odd.length} reference(s) without an image extension (check these are intentional):`);
    for (const s of odd.slice(0, 10)) console.log(`    ${s}`);
  }

  console.log(`\n${'-'.repeat(58)}`);
  console.log(`  ${broken.length === 0 ? 'PASS' : 'FAIL'}  ${broken.length} broken image(s)\n`);
  process.exit(broken.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
