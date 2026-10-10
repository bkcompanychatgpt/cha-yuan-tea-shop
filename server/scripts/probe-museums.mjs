/**
 * Which museum open-access APIs are reachable, and how much jade and jewellery
 * they hold?
 *
 * Openverse now answers every request with a Cloudflare challenge, and Wikimedia
 * Commons holds almost nothing usable for these two departments. The Met, the
 * Art Institute of Chicago and the Cleveland Museum of Art all publish open
 * access collections over keyless APIs, and their photographs are studio shots
 * on neutral backgrounds rather than vitrine snapshots or excavation records.
 *
 *   node server/scripts/probe-museums.mjs
 */
const UA = 'ChaYuanTeaShopAssetSourcing/1.0 (dev@chayuan.test)';

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
  return JSON.parse(text);
}

async function check(label, fn) {
  try {
    const out = await fn();
    console.log(`  OK    ${label.padEnd(46)} ${out}`);
  } catch (err) {
    console.log(`  FAIL  ${label.padEnd(46)} ${err.message}`);
  }
}

console.log('Museum open-access APIs\n');

await check('Met: search "jade"', async () => {
  const j = await get('https://collectionapi.metmuseum.org/public/collection/v1/search?q=jade&hasImages=true');
  return `${j.total} objects`;
});

await check('Met: search "jadeite bangle"', async () => {
  const j = await get('https://collectionapi.metmuseum.org/public/collection/v1/search?q=jadeite%20bangle&hasImages=true');
  return `${j.total} objects`;
});

await check('Met: search "gold necklace"', async () => {
  const j = await get('https://collectionapi.metmuseum.org/public/collection/v1/search?q=gold%20necklace&hasImages=true');
  return `${j.total} objects`;
});

await check('Met: one object detail', async () => {
  const j = await get('https://collectionapi.metmuseum.org/public/collection/v1/search?q=jadeite&hasImages=true');
  const id = (j.objectIDs || [])[0];
  if (!id) return 'no ids';
  const o = await get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
  return `${o.objectID} "${String(o.title).slice(0, 40)}" publicDomain=${o.isPublicDomain} img=${o.primaryImage ? 'yes' : 'no'}`;
});

await check('AIC: search "jade"', async () => {
  const j = await get('https://api.artic.edu/api/v1/artworks/search?q=jade&limit=5&fields=id,title,image_id,is_public_domain');
  return `${j.pagination ? j.pagination.total : '?'} works`;
});

await check('AIC: search "necklace gold"', async () => {
  const j = await get('https://api.artic.edu/api/v1/artworks/search?q=necklace%20gold&limit=5&fields=id,title,image_id,is_public_domain');
  return `${j.pagination ? j.pagination.total : '?'} works`;
});

await check('Cleveland: search "jade"', async () => {
  const j = await get('https://openaccess-api.clevelandart.org/api/artworks/?q=jade&limit=5&has_image=1');
  return `${j.info ? j.info.total : '?'} works`;
});

await check('Cleveland: search "jewelry"', async () => {
  const j = await get('https://openaccess-api.clevelandart.org/api/artworks/?q=jewelry&limit=5&has_image=1');
  return `${j.info ? j.info.total : '?'} works`;
});
