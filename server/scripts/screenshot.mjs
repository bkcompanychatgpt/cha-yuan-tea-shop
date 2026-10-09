/**
 * Capture full-page screenshots of storefront pages for visual review.
 *
 *   node server/scripts/screenshot.mjs [baseUrl] [outDir]
 *
 * Chrome writes the PNG itself, so nothing is piped through a shell (which a
 * confined sandbox can refuse), and each capture gets a fresh profile so two
 * runs cannot collide.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const BASE = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/+$/, '');
const OUT_DIR = process.argv[3] || path.join(ROOT, '_shots');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const PAGES = [
  ['home', '/', 1440, 5200],
  ['shop', '/shop', 1440, 2600],
  ['product', '/tea/wuyi-shuixian', 1440, 2800],
  ['checkout', '/checkout', 1440, 2000],
  ['guides', '/guides', 1440, 1400],
  ['about', '/about', 1440, 2600],
  ['admin', '/admin/login', 1440, 900],
];

function shot(browser, url, file, width, height) {
  return new Promise((resolve) => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cy-shot-'));
    execFile(
      browser,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--user-data-dir=${profile}`,
        `--window-size=${width},${height}`,
        `--screenshot=${file}`,
        '--virtual-time-budget=9000',
        url,
      ],
      { timeout: 90_000 },
      () => {
        try {
          fs.rmSync(profile, { recursive: true, force: true });
        } catch {
          /* best effort */
        }
        resolve(fs.existsSync(file) ? fs.statSync(file).size : 0);
      },
    );
  });
}

async function main() {
  const browser = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!browser) {
    console.error('No Chrome/Edge found.');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Capturing into ${OUT_DIR}\n`);

  for (const [name, route, width, height] of PAGES) {
    const file = path.join(OUT_DIR, `${name}.png`);
    const bytes = await shot(browser, `${BASE}${route}`, file, width, height);
    console.log(`  ${name.padEnd(10)} ${bytes ? `${(bytes / 1024).toFixed(0)} KB` : 'FAILED'}  ${route}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
