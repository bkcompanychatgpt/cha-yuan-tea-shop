/**
 * Page length report.
 *
 * Measures how far down a page's key content sits, and how much scrolling each
 * block demands. Written because "the page is too long" is a real complaint that
 * needs a number before and after a change, not an impression.
 *
 *   node server/scripts/page-length.mjs [baseUrl]
 *
 * Reports, per page:
 *   - total page height in viewport-heights ("screens")
 *   - where the first product appears, in screens
 *   - every top-level section with its offset and height
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const PAGES = [
  { path: '/', label: 'homepage' },
  { path: '/shop', label: 'shop' },
  { path: '/tea/lion-peak-longjing', label: 'product' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
];

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

function dumpDom(browser, url, viewport) {
  return new Promise((resolve, reject) => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cy-len-'));
    const outFile = path.join(profile, 'dom.html');
    const fd = fs.openSync(outFile, 'w');
    const child = spawn(
      browser,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        `--window-size=${viewport.width},${viewport.height}`,
        '--virtual-time-budget=10000',
        `--user-data-dir=${profile}`,
        '--dump-dom',
        url,
      ],
      { stdio: ['ignore', fd, 'ignore'], timeout: 120_000 },
    );
    const cleanup = () => {
      try {
        fs.closeSync(fd);
      } catch {
        /* closed */
      }
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    };
    child.on('error', (err) => {
      cleanup();
      reject(err);
    });
    child.on('exit', () => {
      let html = '';
      try {
        html = fs.readFileSync(outFile, 'utf8');
      } catch {
        /* handled below */
      }
      cleanup();
      if (!html) return reject(new Error('no output from headless browser'));
      resolve(html);
    });
  });
}

function extractReport(html) {
  const match = html.match(/<pre id="report">([\s\S]*?)<\/pre>/);
  if (!match) return null;
  const text = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const shortLabel = (cls) => {
  const cleaned = String(cls || '')
    .replace(/\bsection(-tight)?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || '(plain)';
};

async function main() {
  const browser = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!browser) {
    console.error('No Chrome/Edge found.');
    process.exit(1);
  }

  console.log('\nPage length report\n');

  for (const viewport of VIEWPORTS) {
    console.log(`${'='.repeat(70)}`);
    console.log(`${viewport.name} — ${viewport.width}x${viewport.height}`);
    console.log(`${'='.repeat(70)}`);

    for (const page of PAGES) {
      const html = await dumpDom(browser, `${BASE}/dev/audit?path=${encodeURIComponent(page.path)}`, viewport);
      const report = extractReport(html);
      if (!report) {
        console.log(`\n${page.label}: probe failed`);
        continue;
      }

      const screens = (report.docHeight / viewport.height).toFixed(1);
      // Where the first thing a visitor can buy appears.
      const firstProduct = (report.sections || []).find((s) => /tea-grid|grid/.test(s.cls) ) || null;
      const rect = report.rects?.firstProductCard;
      const firstProductTop = firstProduct ? Math.round(firstProduct.top / viewport.height * 10) / 10 : null;

      console.log(`\n${page.label}  (${report.path})`);
      console.log(`  total height   ${report.docHeight}px  =  ${screens} screens`);
      if (firstProductTop !== null) {
        console.log(`  first products ${firstProductTop} screens down`);
      } else if (rect) {
        console.log(`  first card     ${rect.y}px down  =  ${(rect.y / viewport.height).toFixed(1)} screens`);
      }
      console.log('  sections:');
      for (const s of report.sections || []) {
        const share = ((s.height / report.docHeight) * 100).toFixed(0);
        console.log(
          `    ${String(s.top).padStart(6)}px  ${String(s.height).padStart(5)}px  ${String(share).padStart(3)}%   ${shortLabel(s.cls).slice(0, 40)}`,
        );
      }
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
