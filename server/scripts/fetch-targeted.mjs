/**
 * Targeted Commons searches for slots that need better photography.
 *
 * Broader surveys return a lot of noise; this narrows to specific teas and
 * teaware with several query spellings each, then builds one contact sheet per
 * target so the result can be judged directly.
 *
 *   node server/scripts/fetch-targeted.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const RAW_DIR = path.join(ROOT, 'data', 'photos', 'targeted-raw');
const SHEET_DIR = path.join(ROOT, 'data', 'photos', 'sheets');
const OUT_INDEX = path.join(ROOT, 'data', 'photos', 'targeted-index.json');

const UA = 'ChaYuanTeaShopAssetSourcing/1.0 (https://github.com/local/cha-yuan; dev@chayuan.test)';
const API = 'https://commons.wikimedia.org/w/api.php';

/**
 * Every targeted group, kept together.
 *
 * This list is additive on purpose: `main()` rewrites targeted-index.json from
 * scratch, so removing a group here would drop its tiles from the index and
 * break any pick in photo-selection.mjs that quotes it. Already-downloaded files
 * are skipped, so re-running is cheap.
 */
const TARGETS = {
  'silver-needle': ['Baihao Yinzhen', 'Silver Needle white tea', 'white tea buds', 'Yinzhen tea'],
  lapsang: ['Lapsang souchong tea leaves', 'Lapsang souchong', 'smoked black tea China', 'Tongmu tea'],
  jinjunmei: ['Jin Jun Mei tea', 'Junjunmei black tea', 'Tongmu black tea'],
  dianhong: ['Dianhong black tea', 'Yunnan golden tips tea', 'Yunnan black tea leaves', 'golden bud tea'],
  'bamboo-tray': ['Chinese tea tray', 'tea tray bamboo', 'tea board Chinese'],
  yixing: ['Yixing zisha teapot', 'purple clay teapot', 'Zisha teapot', 'Yixing clay teapot'],
  dancong: ['Dancong tea', 'Phoenix oolong tea', 'single bush oolong', 'Guangdong oolong tea'],
  shoumei: ['Shoumei white tea', 'white tea cake', 'aged white tea', 'white tea brick'],
  'gaiwan-good': ['gaiwan porcelain', 'Chinese gaiwan tea bowl', 'celadon gaiwan'],
  // English queries only: a Chinese-language query for "tea tray" returned
  // street furniture, and it also has no place in an English-only codebase.
  'tea-tray': ['Chinese tea tray', 'tea tray bamboo', 'tea board gongfu', 'tea table bamboo'],
  teaware: ['gaiwan and cups', 'Chinese tea set porcelain', 'tea utensils Chinese', 'tea caddy Chinese'],
  // Jade: nephrite and jadeite, carved objects and rough stone.
  'jade-nephrite': ['Hetian jade', 'nephrite carving', 'Chinese jade pendant', 'white jade China'],
  'jade-jadeite': ['jadeite bangle', 'jade bangle', 'jadeite jewellery', 'icy jadeite'],
  'jade-carving': ['Chinese jade carving', 'jade figurine China', 'jade Buddha', 'jade ruyi'],
  'jade-raw': ['jade stone rough', 'nephrite pebble', 'jadeite rough stone'],
  // Jewellery
  jewellery: ['Chinese gold jewellery', 'filigree silver bracelet', 'jade jewellery gold'],
  pearls: ['South Sea pearl necklace', 'golden pearl strand', 'freshwater pearl jewellery'],
  earrings: ['jade earrings', 'gold drop earrings', 'Chinese earrings gold'],
  rings: ['jade ring gold', 'gemstone ring jade', 'Chinese gold ring'],
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
  if (res.status === 429 && attempt <= 4) {
    await new Promise((r) => setTimeout(r, 2200 * attempt));
    return api(params, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function search(query, limit = 10) {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata|mime',
    iiurlwidth: '1600',
  });
  const pages = data?.query?.pages;
  if (!pages) return [];
  return Object.values(pages)
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info) return null;
      const meta = info.extmetadata || {};
      return {
        title: page.title.replace(/^File:/, ''),
        mime: info.mime,
        width: Number(info.width),
        height: Number(info.height),
        downloadUrl: info.thumburl || info.url,
        originalUrl: info.url,
        descriptionUrl: info.descriptionurl,
        licence: strip(meta.LicenseShortName?.value),
        licenceUrl: strip(meta.LicenseUrl?.value),
        author: strip(meta.Artist?.value).slice(0, 160),
      };
    })
    .filter(Boolean);
}

async function download(url, dest, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' } });
    if (!res.ok || res.status === 403) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) throw new Error('too small');
    fs.writeFileSync(dest, buf);
  } catch (err) {
    if (attempt >= 5) throw err;
    await new Promise((r) => setTimeout(r, 900 * attempt));
    return download(url, dest, attempt + 1);
  }
}

async function sheet(entries, out) {
  const cols = 5;
  const cell = 300;
  const labelH = 26;
  const rows = Math.ceil(entries.length / cols);
  const composites = [];
  for (let i = 0; i < entries.length; i += 1) {
    const left = (i % cols) * cell;
    const top = Math.floor(i / cols) * cell;
    try {
      composites.push({
        input: await sharp(entries[i].file).resize(cell - 6, cell - 6 - labelH, { fit: 'cover' }).toBuffer(),
        left: left + 3,
        top: top + 3,
      });
    } catch {
      /* skip */
    }
    composites.push({
      input: Buffer.from(
        `<svg width="${cell - 6}" height="${labelH}"><rect width="100%" height="100%" fill="#0b1c13"/><text x="6" y="18" font-family="monospace" font-size="14" fill="#dcc07a">#${i + 1}</text></svg>`,
      ),
      left: left + 3,
      top: top + cell - labelH,
    });
  }
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: { r: 6, g: 16, b: 11 } } })
    .composite(composites)
    .jpeg({ quality: 84 })
    .toFile(out);
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });
  const index = {};

  for (const [target, queries] of Object.entries(TARGETS)) {
    const seen = new Set();
    const entries = [];

    for (const query of queries) {
      let found = [];
      try {
        found = await search(query, 10);
      } catch (err) {
        console.log(`  ${target} / ${query}: ${err.message}`);
        continue;
      }

      for (const item of found) {
        if (seen.has(item.title)) continue;
        seen.add(item.title);
        if (!/^image\/(jpeg|png|webp)$/.test(item.mime)) continue;
        if (!licenceOk(item.licence)) continue;
        if (item.width < 800 || item.height < 600) continue;
        const ratio = item.width / item.height;
        if (ratio < 0.6 || ratio > 2.2) continue;

        const ext = item.mime === 'image/png' ? 'png' : item.mime === 'image/webp' ? 'webp' : 'jpg';
        const slug = item.title.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').slice(0, 50);
        const dest = path.join(RAW_DIR, `${target}__${slug}.${ext}`);
        try {
          await download(item.downloadUrl, dest);
          entries.push({ n: entries.length + 1, target, query, ...item, file: dest });
        } catch {
          /* skip failed downloads */
        }
      }
      await new Promise((r) => setTimeout(r, 900));
    }

    if (entries.length) {
      await sheet(entries, path.join(SHEET_DIR, `target-${target}.jpg`));
      index[target] = entries.map((e) => ({
        n: e.n,
        file: path.relative(ROOT, e.file).replace(/\\/g, '/'),
        title: e.title,
        licence: e.licence,
        licenceUrl: e.licenceUrl,
        author: e.author,
        descriptionUrl: e.descriptionUrl,
        width: e.width,
        height: e.height,
      }));
    }
    console.log(`${target.padEnd(16)} ${entries.length} candidates`);
  }

  fs.writeFileSync(OUT_INDEX, JSON.stringify(index, null, 2));
  console.log(`\nindex → ${path.relative(ROOT, OUT_INDEX)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
