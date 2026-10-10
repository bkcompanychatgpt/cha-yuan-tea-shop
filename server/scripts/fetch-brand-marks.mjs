/**
 * Fetch the payment-network marks shown at checkout.
 *
 * A shop that settles Visa and Mastercard through its acquirer is entitled to
 * display those networks' marks, and the marks themselves exist as vector files
 * on Wikimedia Commons. What this script deliberately does NOT do is copy the
 * badge sprite off another shop's site: those files are that shop's assets, the
 * URLs are hotlink-fragile, and the copies there are frequently cropped,
 * recoloured or outdated relative to the networks' current artwork.
 *
 * Files land in public/img/badge/<slug>.svg and are served from that path. Any
 * brand whose vector file cannot be resolved keeps the generated fallback drawn
 * by server/imagery.mjs, so the checkout never renders a broken image.
 *
 *   node server/scripts/fetch-brand-marks.mjs
 *   node server/scripts/fetch-brand-marks.mjs --force   (re-download)
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT_DIR = path.join(ROOT, 'public', 'img', 'badge');

const UA = 'ChaYuanTeaShopAssetSourcing/1.0 (https://github.com/local/cha-yuan; dev@chayuan.test)';
const API = 'https://commons.wikimedia.org/w/api.php';

/**
 * Candidate Commons file titles per brand, most-preferred first. The first
 * title that resolves to a real SVG wins.
 */
const BRANDS = {
  visa: ['Visa Inc. logo.svg', 'Visa 2021.svg', 'Visa.svg'],
  mastercard: ['Mastercard-logo.svg', 'Mastercard 2019 logo.svg', 'Mastercard logo.svg'],
  amex: ['American Express logo (2018).svg', 'American Express logo.svg'],
  discover: ['Discover Card logo.svg', 'Discover Financial logo.svg'],
  jcb: ['JCB logo.svg', 'JCB Co., Ltd. logo.svg'],
  diners: ['Diners Club Logo.svg', 'Diners Club International Logo.svg', 'Diners Club logo.svg'],
  unionpay: ['UnionPay logo.svg', 'China UnionPay logo.svg'],
  paypal: ['PayPal.svg', 'PayPal logo.svg'],
  applepay: ['Apple Pay logo.svg', 'Apple Pay.svg'],
};

const args = process.argv.slice(2);
const FORCE = args.includes('--force');

async function api(params, attempt = 1) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (res.status === 429 && attempt <= 4) {
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return api(params, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Resolve one Commons file title to its direct SVG url, or null. */
async function resolve(title) {
  const data = await api({
    action: 'query',
    titles: `File:${title}`,
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
  });
  const pages = data?.query?.pages || {};
  for (const entry of Object.values(pages)) {
    if (entry.missing !== undefined) continue;
    const info = entry.imageinfo?.[0];
    if (!info?.url) continue;
    return info;
  }
  return null;
}

/** Commons SVGs can carry an XML prolog and comments; strip to a clean root. */
function tidy(svg) {
  let out = svg.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/g, '');
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  return out.trim();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const report = [];
  for (const [slug, titles] of Object.entries(BRANDS)) {
    const dest = path.join(OUT_DIR, `${slug}.svg`);
    if (existsSync(dest) && !FORCE) {
      report.push({ slug, status: 'kept', size: (await readFile(dest)).length });
      console.log(`  ${slug.padEnd(11)} kept (already present)`);
      continue;
    }
    let done = false;
    for (const title of titles) {
      try {
        const info = await resolve(title);
        if (!info) continue;
        if (!/svg/i.test(info.mime || '')) continue;
        const res = await fetch(info.url, { headers: { 'User-Agent': UA } });
        if (!res.ok) continue;
        const svg = tidy(await res.text());
        if (!/<svg[\s>]/i.test(svg)) continue;
        await writeFile(dest, svg.endsWith('\n') ? svg : `${svg}\n`, 'utf8');
        report.push({ slug, status: 'fetched', from: title, bytes: Buffer.byteLength(svg) });
        console.log(`  ${slug.padEnd(11)} fetched  ${title}  (${Buffer.byteLength(svg)} bytes)`);
        done = true;
        break;
      } catch (err) {
        console.log(`  ${slug.padEnd(11)} miss     ${title}  ${err.message}`);
      }
    }
    if (!done) {
      report.push({ slug, status: 'fallback' });
      console.log(`  ${slug.padEnd(11)} FALLBACK (generated mark will be used)`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify({ fetchedAt: new Date().toISOString(), marks: report }, null, 2)}\n`,
    'utf8',
  );

  const ok = report.filter((r) => r.status !== 'fallback').length;
  console.log(`\n  ${ok}/${report.length} brand marks present in public/img/badge/`);
  const missing = report.filter((r) => r.status === 'fallback').map((r) => r.slug);
  if (missing.length) console.log(`  using generated fallback for: ${missing.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
