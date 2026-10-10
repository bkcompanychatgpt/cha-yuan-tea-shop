/**
 * How many usable, openly-licensed product photographs actually exist?
 *
 * A catalogue of a given size needs one credible photograph per product, and the
 * only honest source for a shop that has not commissioned its own photography is
 * a licence that permits commercial use. This counts how many such images exist
 * for a category across a wide sweep of Wikimedia Commons, after the same filters
 * the storefront's pipeline uses: commercial-use licence only, minimum size,
 * usable aspect ratio, image MIME.
 *
 *   node server/scripts/photobank-survey.mjs
 *
 * The point is to replace guesswork about "how many products can I add" with a
 * number that was measured.
 */
const UA = 'ChaYuanTeaShopAssetSourcing/1.0 (https://github.com/local/cha-yuan; dev@chayuan.test)';
const API = 'https://commons.wikimedia.org/w/api.php';

/** Broad query sets per category. Deliberately generous: this is an upper bound. */
const CATEGORIES = {
  tea: [
    'Chinese tea', 'green tea leaves', 'oolong tea', 'black tea China', 'puerh tea',
    'white tea China', 'jasmine tea', 'tea ceremony China', 'loose leaf tea',
    'tea tin', 'tea cup Chinese', 'gaiwan', 'yixing teapot', 'tea plantation',
    'dragon well tea', 'tieguanyin', 'da hong pao', 'keemun', 'dianhong', 'tea brick',
    'tea canister', 'tea caddy', 'tea scoop', 'tea strainer', 'tea pet',
    'chrysanthemum tea', 'osmanthus tea', 'rose tea', 'taiwan oolong', 'matcha',
  ],
  jade: [
    'jade China', 'nephrite', 'jadeite', 'jade carving', 'jade pendant',
    'jade bangle', 'jade figurine', 'jade ruyi', 'jade bi disc', 'jade dragon',
    'jade Buddha', 'jade cup', 'jade ornament', 'Chinese jade museum',
    'white jade', 'green jade', 'jade sculpture', 'jade amulet', 'jade plaque',
    'jade seal', 'jade horse', 'jade vessel', 'jade jewellery',
  ],
  jewellery: [
    'Chinese jewellery', 'gold jewellery China', 'silver filigree', 'pearl necklace',
    'jade jewellery', 'Chinese earrings', 'Chinese ring', 'bracelet China',
    'hair ornament China', 'Chinese hairpin', 'gold ornament China', 'cloisonne',
    'enamel jewellery China', 'silver bracelet China', 'amber jewellery',
    'coral jewellery China', 'agate jewellery', 'crystal jewellery China',
    'gold necklace China', 'jade ring', 'pearl earrings', 'Chinese brooch',
    'Chinese necklace', 'antique Chinese jewellery',
  ],
};

function licenceOk(shortName) {
  if (!shortName) return false;
  const v = String(shortName);
  if (/NC|ND|-NC|-ND/i.test(v)) return false;
  return /^CC BY/i.test(v) || /^CC0/i.test(v) || /public domain/i.test(v) || /^PDM/i.test(v);
}

const strip = (v) => String(v ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

async function api(params, attempt = 1) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (res.status === 429 && attempt <= 5) {
    await new Promise((r) => setTimeout(r, 2500 * attempt));
    return api(params, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Walk one search term, collecting every qualifying file it can reach. */
async function search(query, { pages = 2, limit = 50 } = {}) {
  const found = [];
  for (let page = 1; page <= pages; page += 1) {
    let data;
    try {
      data = await api({
        action: 'query',
        generator: 'search',
        gsrsearch: query,
        gsrnamespace: '6',
        gsrlimit: String(limit),
        gsroffset: String((page - 1) * limit),
        prop: 'imageinfo',
        iiprop: 'url|size|extmetadata|mime',
        iiurlwidth: '1600',
      });
    } catch {
      break;
    }
    const pagesObj = data?.query?.pages;
    if (!pagesObj) break;
    for (const entry of Object.values(pagesObj)) {
      const info = entry.imageinfo?.[0];
      if (!info) continue;
      const meta = info.extmetadata || {};
      const licence = strip(meta.LicenseShortName?.value);
      if (!licenceOk(licence)) continue;
      if (!/^image\/(jpeg|png|webp)$/.test(info.mime)) continue;
      const w = Number(info.width);
      const h = Number(info.height);
      if (w < 800 || h < 600) continue;
      const ratio = w / h;
      if (ratio < 0.55 || ratio > 2.4) continue;
      found.push({
        title: entry.title.replace(/^File:/, ''),
        width: w,
        height: h,
        licence,
        author: strip(meta.Artist?.value).slice(0, 60),
      });
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return found;
}

const report = {};

for (const [category, queries] of Object.entries(CATEGORIES)) {
  console.log(`\n${category}`);
  const seen = new Map();
  for (const query of queries) {
    const hits = await search(query);
    let fresh = 0;
    for (const hit of hits) {
      if (seen.has(hit.title)) continue;
      seen.set(hit.title, { ...hit, query });
      fresh += 1;
    }
    console.log(`  ${query.padEnd(28)} ${String(hits.length).padStart(4)} results, ${String(fresh).padStart(4)} new`);
    await new Promise((r) => setTimeout(r, 700));
  }
  report[category] = { unique: seen.size, images: [...seen.values()] };
  console.log(`  -> ${seen.size} unique qualifying images`);
}

console.log(`\n${'='.repeat(64)}`);
console.log('Summary — unique commercial-use images found\n');
for (const [category, data] of Object.entries(report)) {
  console.log(`  ${category.padEnd(12)} ${String(data.unique).padStart(5)}`);
  const licences = {};
  for (const img of data.images) licences[img.licence] = (licences[img.licence] || 0) + 1;
  const top = Object.entries(licences).sort((a, b) => b[1] - a[1]).slice(0, 4);
  console.log(`  ${''.padEnd(12)} ${top.map(([l, n]) => `${l}:${n}`).join('  ')}`);
}
console.log('\n  Each product needs its own credible photograph. A catalogue of 100 per');
console.log('  category therefore needs 100 per category that also depicts the right object.\n');
