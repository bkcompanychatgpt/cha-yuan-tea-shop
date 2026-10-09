/**
 * Download the Openverse candidate photographs and index them for curation.
 *
 * Openverse images are served from their origin hosts (Flickr, museums, …) and
 * are typically capped around 1024–1600 px, which is ample for product tiles.
 *
 *   node server/scripts/download-openverse.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PHOTO_DIR = path.join(ROOT, 'data', 'photos');
const RAW_DIR = path.join(PHOTO_DIR, 'openverse-raw');
const MANIFEST = path.join(PHOTO_DIR, 'openverse-candidates.json');
const INDEX = path.join(PHOTO_DIR, 'openverse-index.json');

const UA = 'ChaYuanTeaShopAssetSourcing/1.0 (https://github.com/local/cha-yuan; dev@chayuan.test)';

async function downloadOnce(url, dest, attempt = 1, maxAttempts = 4) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' } });
    if (res.status === 403 || res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 6000) throw new Error(`too small (${buf.length} bytes)`);
    fs.writeFileSync(dest, buf);
    return buf.length;
  } catch (err) {
    if (attempt >= maxAttempts) throw err;
    await new Promise((r) => setTimeout(r, 700 * attempt));
    return downloadOnce(url, dest, attempt + 1, maxAttempts);
  }
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 52);
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const candidates = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

  const index = [];
  let ok = 0;
  let failed = 0;

  for (const item of candidates) {
    const ext = /\.png(\?|$)/i.test(item.url) ? 'png' : 'jpg';
    const name = `ov__${slugify(item.query)}__${slugify(item.title || 'x')}.${ext}`;
    const dest = path.join(RAW_DIR, name);

    try {
      if (fs.existsSync(dest) && fs.statSync(dest).size > 6000) {
        ok += 1;
      } else {
        await downloadOnce(item.url, dest);
        ok += 1;
      }
      index.push({
        ...item,
        file: path.relative(ROOT, dest).replace(/\\/g, '/'),
      });
    } catch (err) {
      failed += 1;
      if (failed <= 12) console.log(`  ! ${item.title} — ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  fs.writeFileSync(INDEX, JSON.stringify(index, null, 2));
  console.log(`\n${ok} downloaded, ${failed} failed → ${path.relative(ROOT, INDEX)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
