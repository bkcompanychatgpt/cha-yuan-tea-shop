/**
 * Survey Openverse for openly-licensed tea photography.
 *
 * Openverse aggregates CC-licensed and public-domain images and exposes licence,
 * creator and source metadata, which is what we need to use them lawfully.
 *
 *   node server/scripts/survey-images.mjs [--out candidates.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : path.resolve(__dirname, '..', '..', 'data', 'image-candidates.json');

const QUERIES = [
  'chinese tea',
  'green tea leaves',
  'loose leaf green tea',
  'dragon well longjing tea',
  'white tea leaves',
  'silver needle tea',
  'oolong tea',
  'tieguanyin',
  'pu erh tea',
  'puerh tea cake',
  'black tea leaves',
  'keemun black tea',
  'jasmine tea',
  'jasmine pearls',
  'osmanthus tea',
  'chrysanthemum tea',
  'rose tea',
  'gaiwan tea',
  'yixing clay teapot',
  'chinese teapot',
  'tea cup porcelain',
  'tea plantation china',
  'tea picking harvest',
  'gongfu tea ceremony',
  'dried tea leaves macro',
  'matcha green tea powder',
  'tea tin canister',
  'bamboo tea tray',
  'glass teapot brewing',
  'herbal tea dried flowers',
];

const UA = 'ChaYuanTeaShopAssetSourcing/1.0 (https://github.com/local/cha-yuan; dev@chayuan.test)';

async function search(query, page = 1, pageSize = 20) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Openverse ${res.status} for "${query}"`);
  return res.json();
}

const seen = new Set();
const results = [];

for (const query of QUERIES) {
  try {
    const pages = await Promise.all([search(query, 1, 20), search(query, 2, 20)]);
    let kept = 0;
    for (const data of pages) {
      for (const item of data.results || []) {
        if (!item.url || seen.has(item.url)) continue;
        const licence = String(item.license || '').toLowerCase();
        // Commercial use only: reject NonCommercial and NoDerivatives outright.
        if (!['cc0', 'pdm', 'by', 'by-sa'].includes(licence)) continue;
        if (!item.width || item.width < 1000) continue;
        if (!item.height || item.height < 700) continue;
        const ratio = item.width / item.height;
        if (ratio < 0.6 || ratio > 2.4) continue;

        seen.add(item.url);
        results.push({
          query,
          title: item.title,
          url: item.url,
          thumbnail: item.thumbnail,
          width: item.width,
          height: item.height,
          license: item.license,
          licenseVersion: item.license_version,
          licenseUrl: item.license_url,
          creator: item.creator,
          creatorUrl: item.creator_url,
          source: item.source,
          landingUrl: item.foreign_landing_url,
          tags: (item.tags || []).map((t) => t.name).slice(0, 12),
        });
        kept += 1;
      }
    }
    console.log(`${query.padEnd(30)} ${kept} kept`);
  } catch (err) {
    console.warn(`${query.padEnd(30)} FAILED — ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 300));
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`\n${results.length} candidates written to ${OUT}`);
