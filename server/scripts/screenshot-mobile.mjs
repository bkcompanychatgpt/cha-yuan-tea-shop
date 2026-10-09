/**
 * Mobile viewport screenshots.
 *
 * The desktop captures use a 1440px window; problems that only appear at phone
 * widths — collapsed grids, images pushed out of view, content hidden by a media
 * query — are invisible there. This renders the same pages at common device
 * widths with the matching device pixel ratio and mobile user agent.
 *
 *   node server/scripts/screenshot-mobile.mjs [baseUrl] [outDir]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const BASE = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/+$/, '');
const OUT_DIR = process.argv[3] || path.join(ROOT, '_shots', 'mobile');

/** Widths worth checking: small Android, iPhone, large phone, small tablet. */
const VIEWPORTS = [
  { name: 'android-360', width: 360, height: 780, dpr: 3 },
  { name: 'iphone-390', width: 390, height: 844, dpr: 3 },
  { name: 'large-430', width: 430, height: 932, dpr: 3 },
  { name: 'tablet-768', width: 768, height: 1024, dpr: 2 },
];

const PAGES = [
  ['home', '/'],
  ['shop', '/shop'],
  ['product', '/tea/wuyi-shuixian'],
];

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function shot(browser, url, file, vp, fullPage) {
  return new Promise((resolve) => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cy-mob-'));
    const args = [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--user-agent=${MOBILE_UA}`,
      `--force-device-scale-factor=${vp.dpr}`,
      `--window-size=${vp.width},${vp.height}`,
      `--screenshot=${file}`,
      '--virtual-time-budget=9000',
      url,
    ];
    if (fullPage) args.splice(args.length - 1, 0, '--screenshot-full-page');

    execFile(browser, args, { timeout: 90_000 }, () => {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
      resolve(fs.existsSync(file) ? fs.statSync(file).size : 0);
    });
  });
}

async function main() {
  const browser = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!browser) {
    console.error('No Chrome/Edge found.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Mobile captures into ${OUT_DIR}\n`);

  for (const vp of VIEWPORTS) {
    for (const [name, route] of PAGES) {
      const file = path.join(OUT_DIR, `${name}-${vp.name}.png`);
      const bytes = await shot(browser, `${BASE}${route}`, file, vp, false);
      console.log(`  ${vp.name.padEnd(12)} ${name.padEnd(9)} ${bytes ? `${(bytes / 1024).toFixed(0)} KB` : 'FAILED'}`);
    }
  }
  console.log(`\nOpen them in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
