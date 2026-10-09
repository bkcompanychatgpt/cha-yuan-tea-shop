/**
 * Source openly-licensed tea photography from Wikimedia Commons.
 *
 * Commons is the primary source because it carries genuinely high-resolution
 * photographs with machine-readable licence and author metadata, which is what
 * we need to use them lawfully and to attribute them properly.
 *
 *   node server/scripts/fetch-photos.mjs              # download candidates
 *   node server/scripts/fetch-photos.mjs --contact    # also build contact sheets
 *
 * Downloads land in data/photos/raw, metadata in data/photos/candidates.json,
 * and contact sheets in data/photos/sheets for human review.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PHOTO_DIR = path.join(ROOT, 'data', 'photos');
const RAW_DIR = path.join(PHOTO_DIR, 'raw');
const SHEET_DIR = path.join(PHOTO_DIR, 'sheets');
const MANIFEST = path.join(PHOTO_DIR, 'candidates.json');

const UA = 'ChaYuanTeaShopAssetSourcing/1.0 (https://github.com/local/cha-yuan; dev@chayuan.test)';
const API = 'https://commons.wikimedia.org/w/api.php';

/**
 * Search terms grouped by what they are for. `key` becomes the candidate's
 * category so curation can pick the right photo for the right product.
 */
const GROUPS = {
  'green-flat': ['Longjing tea', 'Dragon Well tea leaves', 'flat green tea leaves China'],
  'green-curly': ['Biluochun tea', 'green tea rolled leaves', 'Chinese green tea dry leaves'],
  'green-leafy': ['Huangshan Maofeng', 'Taiping Houkui tea', 'Chinese green tea leaves loose'],
  'green-matcha': ['matcha powder bowl', 'green tea powder'],
  white: ['white tea leaves', 'Bai Mudan', 'Silver Needle tea', 'white tea cake'],
  oolong: ['Tieguanyin tea', 'oolong tea leaves', 'Anxi oolong', 'Dong Ding oolong'],
  'rock-oolong': ['Da Hong Pao tea', 'Wuyi rock tea', 'yancha oolong'],
  'dan-cong': ['Dancong oolong', 'Phoenix Dan Cong tea', 'Guangdong oolong'],
  black: ['black tea leaves China', 'Keemun tea', 'Dianhong tea', 'Jin Jun Mei'],
  puerh: ['Pu-erh tea cake', 'puerh tea pressed', 'ripe puerh tea', 'raw puerh cake'],
  floral: ['jasmine tea', 'jasmine pearls tea', 'osmanthus tea', 'chrysanthemum tea dried', 'rose tea buds'],
  teaware: ['gaiwan', 'yixing teapot', 'Chinese teacup', 'glass teapot', 'bamboo tea tray', 'porcelain tea set'],
  ambiance: ['tea plantation China', 'tea harvesting', 'tea ceremony', 'brewing tea gongfu', 'tea leaves macro'],
};

/** Licences that permit commercial use (with attribution) or impose no condition. */
const OK_LICENCES = ['CC0', 'Public domain', 'CC BY', 'CC BY-SA', 'CC BY 2.0', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 2.0', 'CC BY-SA 3.0', 'CC BY-SA 4.0', 'PDM'];

function licenceOk(shortName) {
  if (!shortName) return false;
  const value = String(shortName);
  if (/NC|ND|-NC|-ND/i.test(value)) return false; // non-commercial or no-derivatives
  return OK_LICENCES.some((l) => value.startsWith(l)) || /^CC BY/.test(value) || /public domain/i.test(value);
}

async function api(params, { attempt = 1 } = {}) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (res.status === 429 && attempt <= 4) {
    const wait = 2000 * attempt;
    console.log(`    rate limited, waiting ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
    return api(params, { attempt: attempt + 1 });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function search(query, limit = 12) {
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
  return Object.values(pages).map((page) => {
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
      licence: stripHtml(meta.LicenseShortName?.value),
      licenceUrl: stripHtml(meta.LicenseUrl?.value),
      author: stripHtml(meta.Artist?.value).slice(0, 160),
      credit: stripHtml(meta.Credit?.value).slice(0, 160),
      categories: stripHtml(meta.Categories?.value).slice(0, 200),
    };
  }).filter(Boolean);
}

/**
 * Download with backoff.
 *
 * upload.wikimedia.org intermittently answers 403/429 under load — the same URL
 * succeeds a moment later — so a failed request is retried rather than dropped.
 * Where the requested thumbnail width exceeds the original, Commons refuses to
 * upscale, so we fall back to the original file URL.
 */
async function downloadOnce(url, dest, attempt = 1, { maxAttempts = 5 } = {}) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' } });
    if (res.status === 403 || res.status === 429 || res.status >= 500) {
      throw new Error(`HTTP ${res.status}`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 4000) throw new Error(`suspiciously small (${buf.length} bytes)`);
    fs.writeFileSync(dest, buf);
    return buf.length;
  } catch (err) {
    if (attempt >= maxAttempts) throw err;
    await new Promise((r) => setTimeout(r, 900 * attempt));
    return downloadOnce(url, dest, attempt + 1, { maxAttempts });
  }
}

async function download(item, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 8000) return { status: 'cached', bytes: fs.statSync(dest).size };
  // Never ask Commons to upscale beyond the original.
  const width = Math.min(1600, item.width);
  let url = item.downloadUrl;
  if (item.width && item.width < 1600) url = item.originalUrl;

  try {
    const bytes = await downloadOnce(url, dest);
    return { status: 'ok', bytes };
  } catch (err) {
    if (url !== item.originalUrl) {
      const bytes = await downloadOnce(item.originalUrl, dest);
      return { status: 'ok (original)', bytes };
    }
    throw err;
  }
}

/** Contact sheet: thumbnails in a grid with an index number burned in. */
async function contactSheet(entries, outFile, { cols = 6, cell = 240 } = {}) {
  const rows = Math.ceil(entries.length / cols);
  const label = 22;
  const composites = [];

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    try {
      const img = await sharp(entry.file)
        .resize(cell - 8, cell - 8 - label, { fit: 'cover', position: 'centre' })
        .toBuffer();
      composites.push({
        input: img,
        left: (i % cols) * cell + 4,
        top: Math.floor(i / cols) * cell + 4,
      });
      // Numbers only — source titles contain characters that break the SVG
      // parser, and the title is recoverable from sheets-index.json anyway.
      const svg = Buffer.from(
        `<svg width="${cell - 8}" height="${label}"><rect width="100%" height="100%" fill="#0b1c13"/>` +
          `<text x="4" y="15" font-family="monospace" font-size="13" fill="#dcc07a">#${i + 1}</text></svg>`,
      );
      composites.push({
        input: svg,
        left: (i % cols) * cell + 4,
        top: Math.floor(i / cols) * cell + cell - label,
      });
    } catch {
      /* skip unreadable files */
    }
  }

  await sharp({
    create: { width: cols * cell, height: rows * cell, channels: 3, background: { r: 6, g: 16, b: 11 } },
  })
    .composite(composites)
    .jpeg({ quality: 82 })
    .toFile(outFile);
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(SHEET_DIR, { recursive: true });

  const candidates = [];

  for (const [group, queries] of Object.entries(GROUPS)) {
    console.log(`\n${group}`);
    const seen = new Set();
    for (const query of queries) {
      let found = [];
      try {
        found = await search(query, 12);
      } catch (err) {
        console.log(`  ${query.padEnd(34)} FAILED — ${err.message}`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      let kept = 0;
      for (const item of found) {
        if (seen.has(item.title)) continue;
        seen.add(item.title);
        if (!/^image\/(jpeg|png|webp)$/.test(item.mime)) continue;
        if (!licenceOk(item.licence)) continue;
        if (item.width < 900 || item.height < 600) continue;
        const ratio = item.width / item.height;
        if (ratio < 0.55 || ratio > 2.6) continue;

        const ext = item.mime === 'image/png' ? 'png' : item.mime === 'image/webp' ? 'webp' : 'jpg';
        const slug = item.title
          .toLowerCase()
          .replace(/\.[a-z0-9]+$/, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60);
        const file = path.join(RAW_DIR, `${group}__${slug}.${ext}`);

        try {
          const result = await download(item, file);
          if (result.status.startsWith('ok')) kept += 1;
        } catch (err) {
          console.log(`    ! download failed: ${item.title} — ${err.message}`);
          continue;
        }

        candidates.push({ group, query, ...item, file: path.relative(ROOT, file).replace(/\\/g, '/') });
      }
      console.log(`  ${query.padEnd(34)} ${found.length} found, ${kept} kept`);
      await new Promise((r) => setTimeout(r, 900));
    }
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(candidates, null, 2));
  console.log(`\n${candidates.length} candidates → ${path.relative(ROOT, MANIFEST)}`);

  if (process.argv.includes('--contact')) {
    console.log('\nbuilding contact sheets');
    for (const group of Object.keys(GROUPS)) {
      const entries = candidates.filter((c) => c.group === group).map((c) => ({
        ...c,
        shortTitle: c.title,
      }));
      if (!entries.length) continue;
      const out = path.join(SHEET_DIR, `${group}.jpg`);
      await contactSheet(entries, out);
      console.log(`  ${group}: ${entries.length} → ${path.relative(ROOT, out)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
