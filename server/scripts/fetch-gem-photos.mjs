/**
 * Hunt for jade and jewellery product photography on Openverse.
 *
 * Wikimedia Commons turned out to hold almost nothing usable for these two
 * departments: its jade is museum artefacts, and its jewellery is shop fronts,
 * hallmarks and, in one case, a bookshelf. Openverse aggregates Flickr, museums
 * and other hosts, and Flickr in particular carries a great deal of amateur and
 * semi-professional jewellery photography under Creative Commons.
 *
 * The owner wants a real photograph on every product, so this is the honest
 * attempt to find them rather than another round of explaining why there are
 * none. Whatever it finds is reviewed on a contact sheet before anything is used:
 * a mismatch between the photograph and the piece is worse than an illustration.
 *
 *   node server/scripts/fetch-gem-photos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PHOTO_DIR = path.join(ROOT, 'data', 'photos');
const RAW_DIR = path.join(PHOTO_DIR, 'gem-raw');
const SHEET_DIR = path.join(PHOTO_DIR, 'sheets');
const MANIFEST = path.join(PHOTO_DIR, 'gem-candidates.json');
const INDEX = path.join(PHOTO_DIR, 'gem-index.json');

const UA = 'ChaYuanTeaShopAssetSourcing/1.0 (https://github.com/local/cha-yuan; dev@chayuan.test)';

/**
 * Queries aimed at photographs of an *object for sale* rather than at a museum
 * record. Words like "product", "studio" and "handmade" are doing real work here:
 * the same search without them returns vitrine shots and excavation records.
 */
const QUERIES = {
  jade: [
    'jade bangle product', 'jadeite bangle studio', 'nephrite pendant handmade',
    'jade jewellery product photography', 'jade ring handmade', 'jade carving studio',
    'jade bead necklace', 'jade cabochon', 'jade pendant gold', 'jade earrings handmade',
    'greenstone pendant', 'pounamu carving', 'jade stone polished', 'jade bracelet',
    'nephrite bangle', 'jade figurine handmade', 'jade seal stone', 'jade disc bi',
    'burmese jadeite jewellery', 'jadeite pendant gold',
  ],
  jewellery: [
    'handmade gold ring studio', 'gold necklace product photography', 'pearl necklace studio',
    'filigree jewellery handmade', 'silver bracelet handmade', 'gold earrings product',
    'gemstone ring studio', 'handmade necklace etsy', 'amber pendant handmade',
    'turquoise ring silver', 'coral necklace handmade', 'gemstone pendant gold',
    'gold bangle handmade', 'handmade brooch jewellery', 'silver ring gemstone',
    'pearl earrings studio', 'gold chain necklace product', 'gemstone earrings handmade',
    'locket necklace gold', 'handmade cuff bracelet',
  ],
};

const LICENCE_OK = new Set(['cc0', 'pdm', 'by', 'by-sa', 'by-nd', 'by-nc', 'by-nc-sa']);

async function api(url, attempt = 1) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (res.status === 429 && attempt <= 5) {
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return api(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(query, pages = 2) {
  const found = [];
  for (let page = 1; page <= pages; page += 1) {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}`
      + `&page=${page}&page_size=50&license_type=commercial&size=large`;
    let data;
    try {
      data = await api(url);
    } catch {
      break;
    }
    for (const r of data.results || []) {
      if (!r.url) continue;
      if (!LICENCE_OK.has(String(r.license || '').toLowerCase())) continue;
      if ((r.width || 0) < 800 || (r.height || 0) < 600) continue;
      const ratio = (r.width || 0) / (r.height || 1);
      if (ratio < 0.6 || ratio > 1.9) continue;
      found.push({
        query,
        title: String(r.title || '').slice(0, 120),
        url: r.url,
        creator: String(r.creator || '').slice(0, 80),
        licence: String(r.license || '').toUpperCase(),
        licenceUrl: r.license_url || '',
        source: r.foreign_landing_url || r.url,
      });
    }
    await sleep(350);
  }
  return found;
}

async function download(url, dest, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 8000) throw new Error(`too small (${buf.length})`);
    fs.writeFileSync(dest, buf);
    return buf.length;
  } catch (err) {
    if (attempt >= 3) throw err;
    await sleep(700 * attempt);
    return download(url, dest, attempt + 1);
  }
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });

  const groups = {};
  let total = 0;

  for (const [group, queries] of Object.entries(QUERIES)) {
    const seen = new Map();
    for (const q of queries) {
      const hits = await search(q);
      let fresh = 0;
      for (const hit of hits) {
        if (seen.has(hit.url)) continue;
        seen.set(hit.url, hit);
        fresh += 1;
      }
      console.log(`  ${group.padEnd(10)} ${q.padEnd(38)} ${String(hits.length).padStart(3)} hits, ${String(fresh).padStart(3)} new`);
      await sleep(250);
    }
    groups[group] = [...seen.values()];
    total += groups[group].length;
    console.log(`  -> ${group}: ${groups[group].length} unique candidates\n`);
  }

  fs.writeFileSync(MANIFEST, `${JSON.stringify(groups, null, 2)}\n`, 'utf8');

  /* ------------------------------------------------------------- download */
  const index = {};
  for (const [group, entries] of Object.entries(groups)) {
    index[group] = [];
    let n = 0;
    for (const entry of entries) {
      n += 1;
      const safe = `${group}-${String(n).padStart(3, '0')}.jpg`;
      const dest = path.join(RAW_DIR, safe);
      try {
        const bytes = fs.existsSync(dest) ? fs.statSync(dest).size : await download(entry.url, dest);
        index[group].push({
          n: index[group].length + 1,
          file: path.relative(ROOT, dest).replace(/\\/g, '/'),
          title: entry.title,
          author: entry.creator,
          licence: entry.licence,
          licenceUrl: entry.licenceUrl,
          source: entry.source,
          query: entry.query,
          bytes,
        });
      } catch (err) {
        console.log(`  skip ${safe} — ${err.message}`);
      }
      await sleep(120);
    }
    console.log(`  downloaded ${index[group].length} for ${group}`);
  }

  fs.writeFileSync(INDEX, `${JSON.stringify({ groups: index }, null, 2)}\n`, 'utf8');
  console.log(`\n  ${total} candidates found, ${Object.values(index).reduce((a, b) => a + b.length, 0)} downloaded`);
  console.log(`  index → data/photos/gem-index.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
