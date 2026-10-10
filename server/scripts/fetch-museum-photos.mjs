/**
 * Fetch jade and jewellery candidates from the Cleveland Museum of Art.
 *
 * Why here: Openverse answers every request with a Cloudflare challenge, the Met
 * retired its search endpoint in October 2026, and Wikimedia Commons holds
 * almost nothing usable for these two departments. Cleveland publishes its
 * open-access collection over a keyless API with `cc0=1`, and the photographs are
 * studio shots on neutral backgrounds rather than vitrine snapshots.
 *
 * What these images are matters and is recorded in the index: each is a museum
 * object of the right *kind* — a jadeite bangle, a gold necklace, a pearl strand
 * — not the shop's own stock. If they are used, the product page has to say so.
 *
 *   node server/scripts/fetch-museum-photos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const RAW_DIR = path.join(ROOT, 'data', 'photos', 'museum-raw');
const INDEX = path.join(ROOT, 'data', 'photos', 'museum-index.json');

const UA = 'ChaYuanTeaShopAssetSourcing/1.0 (dev@chayuan.test)';
const API = 'https://openaccess-api.clevelandart.org/api/artworks/';

const QUERIES = {
  jade: ['jade bangle', 'jade pendant', 'jade carving', 'jadeite', 'nephrite', 'jade disc', 'jade cup', 'jade figure'],
  jewellery: ['gold necklace', 'pearl necklace', 'gold ring', 'earrings gold', 'bracelet gold', 'gold brooch', 'hair ornament', 'jewelry silver'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(q, skip = 0) {
  const url = `${API}?q=${encodeURIComponent(q)}&has_image=1&cc0=1&limit=60&skip=${skip}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function download(url, dest, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 8000) throw new Error('too small');
    fs.writeFileSync(dest, buf);
    return buf.length;
  } catch (err) {
    if (attempt >= 3) throw err;
    await sleep(600 * attempt);
    return download(url, dest, attempt + 1);
  }
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const groups = {};
  let downloaded = 0;

  for (const [group, queries] of Object.entries(QUERIES)) {
    const seen = new Map();
    for (const q of queries) {
      try {
        const j = await search(q);
        for (const w of j.data || []) {
          if (seen.has(w.id)) continue;
          if (String(w.share_license_status || '').toUpperCase() !== 'CC0') continue;
          const img = w.images && (w.images.web || w.images.print);
          if (!img || !img.url) continue;
          seen.set(w.id, {
            id: w.id,
            title: String(w.title || '').slice(0, 120),
            date: String(w.creation_date || '').slice(0, 40),
            technique: String(w.technique || '').slice(0, 80),
            url: img.url,
            page: w.url || '',
            query: q,
          });
        }
        console.log(`  ${group.padEnd(10)} ${q.padEnd(22)} ${(j.data || []).length} returned, ${seen.size} unique so far`);
      } catch (err) {
        console.log(`  ${group.padEnd(10)} ${q.padEnd(22)} FAILED ${err.message}`);
      }
      await sleep(300);
    }
    groups[group] = [...seen.values()];
  }

  const index = {};
  for (const [group, entries] of Object.entries(groups)) {
    index[group] = [];
    for (const entry of entries) {
      const n = index[group].length + 1;
      const dest = path.join(RAW_DIR, `${group}-${String(n).padStart(3, '0')}.jpg`);
      try {
        const bytes = fs.existsSync(dest) ? fs.statSync(dest).size : await download(entry.url, dest);
        index[group].push({ ...entry, n, file: path.relative(ROOT, dest).replace(/\\/g, '/'), bytes });
        downloaded += 1;
      } catch {
        /* skip the ones whose host will not serve us */
      }
      await sleep(120);
    }
    console.log(`  downloaded ${index[group].length} for ${group}`);
  }

  fs.writeFileSync(INDEX, `${JSON.stringify({ source: 'Cleveland Museum of Art, CC0', groups: index }, null, 2)}\n`, 'utf8');
  console.log(`\n  ${downloaded} images downloaded`);
  console.log(`  index → data/photos/museum-index.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
