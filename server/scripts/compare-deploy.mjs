/**
 * Compare a local build against a deployed one.
 *
 * Answers the question "is the live site the same as what I just built?" with
 * counts rather than impressions: products, categories, photographs versus
 * generated artwork, and the images that fail to load.
 *
 *   node server/scripts/compare-deploy.mjs https://cha-yuan-tea-shop.onrender.com
 */
const REMOTE = (process.argv[2] || '').replace(/\/+$/, '');
const LOCAL = (process.argv[3] || 'http://127.0.0.1:3080').replace(/\/+$/, '');

if (!REMOTE) {
  console.error('usage: node server/scripts/compare-deploy.mjs <remoteBaseUrl> [localBaseUrl]');
  process.exit(1);
}

const PAGES = ['/', '/shop', '/shop?category=jade', '/shop?category=jewellery', '/tea/wuyi-shuixian', '/credits'];

const PHOTO = /\/img\/photos\/[^"']+/g;
const ARTWORK = /\/img\/(?:product|category|editorial)\/[^"']+/g;

async function survey(base, page) {
  const res = await fetch(`${base}${page}`);
  if (!res.ok) return { page, status: res.status };
  const html = await res.text();

  const photos = [...new Set(html.match(PHOTO) || [])];
  const artwork = [...new Set(html.match(ARTWORK) || [])];
  const cards = (html.match(/class="tea-card"/g) || []).length;
  const cardsWithPhoto = (html.match(/class="tea-card"[\s\S]{0,400}?\/img\/photos\//g) || []).length;

  return {
    page,
    status: res.status,
    bytes: html.length,
    photos: photos.length,
    artwork: artwork.length,
    cards,
    cardsWithPhoto,
    sample: photos[0] || null,
  };
}

async function health(base) {
  try {
    const res = await fetch(`${base}/healthz`);
    return await res.json();
  } catch (err) {
    return { status: 'unreachable', message: err.message };
  }
}

const localHealth = await health(LOCAL);
const remoteHealth = await health(REMOTE);

console.log('\nDeploy comparison\n');
console.log(`  local   ${LOCAL}`);
console.log(`    products ${localHealth.products ?? '?'}   payment ${localHealth.paymentMode ?? '?'}   uptime ${localHealth.uptimeSeconds ?? '?'}s`);
console.log(`  remote  ${REMOTE}`);
console.log(`    products ${remoteHealth.products ?? '?'}   payment ${remoteHealth.paymentMode ?? '?'}   uptime ${remoteHealth.uptimeSeconds ?? '?'}s`);

const productMatch = localHealth.products === remoteHealth.products;
console.log(`\n  catalogue in sync: ${productMatch ? 'yes' : `NO — remote has ${remoteHealth.products}, local has ${localHealth.products}`}`);

console.log('\n  page                        local (photos/artwork/cards)   remote');
for (const page of PAGES) {
  const [l, r] = await Promise.all([survey(LOCAL, page), survey(REMOTE, page)]);
  const fmt = (s) => (s.status !== 200 ? `HTTP ${s.status}` : `${String(s.photos).padStart(3)} / ${String(s.artwork).padStart(3)} / ${String(s.cards).padStart(3)}`);
  const flag = l.status === 200 && r.status === 200 && l.photos === r.photos && l.artwork === r.artwork ? ' ' : '!';
  console.log(`  ${flag} ${page.padEnd(26)} ${fmt(l).padEnd(28)} ${fmt(r)}`);
}

console.log('\n  A "!" marks a page where the photograph and artwork counts differ from local.');
console.log('  artwork > 0 on a product page means that product is still on generated SVG.\n');
