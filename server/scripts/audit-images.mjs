/**
 * Check every product's imagery, end to end, against a running site.
 *
 * Reports, per product: the hero image URL, whether it resolves, whether it is a
 * photograph or generated artwork, and whether two products share the same
 * image. Run it against localhost or the deployed URL.
 *
 *   node server/scripts/audit-images.mjs [baseUrl]
 */
const BASE = (process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const health = await (await fetch(`${BASE}/healthz`)).json();
console.log(`${BASE}  —  ${health.products} products\n`);

/** Product links, via the shop listing pages. /shop is the department chooser
 *  now, so the scrape has to start from a listing. */
async function collectSlugs() {
  const unique = [];
  const seen = new Set();
  for (const base of ['/shop?department=tea', '/shop?category=jade', '/shop?category=jewellery', '/shop?department=also']) {
    for (let page = 1; page <= 30; page += 1) {
      const html = await (await fetch(`${BASE}${base}&page=${page}`)).text();
      const more = [...new Set([...html.matchAll(/href="\/tea\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
      if (!more.length) break;
      for (const s of more) if (!seen.has(s)) { seen.add(s); unique.push(s); }
    }
  }
  return unique;
}

const unique = await collectSlugs();
console.log(`total unique products discovered: ${unique.length}\n`);

const byImage = new Map();
let missing = 0;
let nonOk = 0;
const rows = [];

for (const slug of unique) {
  const html = await (await fetch(`${BASE}/tea/${slug}`)).text();
  const main = html.match(/class="pdp-main"[^>]*>\s*<img src="([^"]+)"/)
    || html.match(/<img src="(\/img\/[^"]+)"[^>]*class="pdp-main/);
  const firstImg = main ? main[1] : (html.match(/<img src="(\/img\/[^"]+)"\s+alt="[^"]*"/) || [])[1] || '';
  const isIllus = html.includes('This is a house illustration');

  let status = 0;
  if (firstImg) {
    try {
      const res = await fetch(new URL(firstImg, BASE), { method: 'GET' });
      status = res.status;
    } catch { status = -1; }
  }
  if (!firstImg) missing += 1;
  if (status !== 200) nonOk += 1;

  if (firstImg) {
    if (!byImage.has(firstImg)) byImage.set(firstImg, []);
    byImage.get(firstImg).push(slug);
  }
  rows.push({ slug, img: firstImg, status, illus: isIllus });
}

console.log('--- per product ---');
for (const r of rows) {
  const flag = r.status === 200 ? '  ' : '!!';
  console.log(`  ${flag} ${String(r.status).padStart(3)} ${r.illus ? 'ILLUS' : 'PHOTO'}  ${r.slug.padEnd(42)} ${r.img}`);
}

const shared = [...byImage.entries()].filter(([, list]) => list.length > 1);
console.log(`\n  products with no image : ${missing}`);
console.log(`  images not returning 200: ${nonOk}`);
console.log(`  distinct image URLs     : ${byImage.size} for ${unique.length} products`);
console.log(`  images shared by 2+ products: ${shared.length}`);
for (const [img, list] of shared.slice(0, 20)) {
  console.log(`    ${img}`);
  console.log(`      used by ${list.length}: ${list.join(', ')}`);
}
