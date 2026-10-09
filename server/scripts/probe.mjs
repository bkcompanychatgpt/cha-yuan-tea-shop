/**
 * Layout probe, at a real viewport width.
 *
 * Uses the DevTools protocol rather than `--window-size`, because headless Chrome
 * will not open a window narrower than ~500px — which made every "phone" check in
 * this project measure a small desktop instead.
 *
 *   node server/scripts/probe.mjs / 390
 *   node server/scripts/probe.mjs / 1440 --full
 *   node server/scripts/probe.mjs / 390 --mobile --screenshot
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowser } from './lib/chrome.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const targetPath = process.argv[2] || '/';
const width = Number.parseInt(process.argv[3], 10) || 1440;
const full = process.argv.includes('--full');
const mobile = process.argv.includes('--mobile') || width <= 480;
const wantShot = process.argv.includes('--screenshot') || full;
const BASE = (process.argv.find((a) => a.startsWith('http')) || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const height = mobile ? 844 : 900;

const report = await withBrowser({ width, height, dpr: mobile ? 3 : 1, mobile }, async (browser) => {
  const { html } = await browser.capture(`${BASE}/dev/audit?path=${encodeURIComponent(targetPath)}`);
  const match = html.match(/<pre id="report">([\s\S]*?)<\/pre>/);
  if (!match) {
    const looksLikeError = html.includes('Something went wrong');
    throw new Error(looksLikeError ? 'the page rendered its error page' : 'the probe produced no report');
  }
  const json = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  const parsed = JSON.parse(json);

  if (wantShot) {
    const out = path.join(ROOT, '_shots', `probe-${targetPath.replace(/\W+/g, '_') || 'root'}-${width}.png`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const png = await browser.screenshotFullPage(`${BASE}${targetPath}`);
    fs.writeFileSync(out, png);
    parsed.screenshot = path.relative(ROOT, out).replace(/\\/g, '/');
  }

  return parsed;
});

console.log(`\n${targetPath}  @  ${width}x${height}${mobile ? ' (mobile emulation)' : ''}\n`);
console.log(`  viewport measured   ${report.viewportWidth}px      <- the emulation is working if this equals ${width}`);
console.log(`  document            ${report.docWidth} x ${report.docHeight}`);
console.log(`  horizontal overflow ${report.horizontalOverflow ? 'YES' : 'no'}`);
if (report.widest) {
  console.log(`  widest element      ${report.widest.width}px  ${report.widest.tag}.${report.widest.cls}`);
}

if ((report.overflow || []).length) {
  console.log(`\n  elements past the right edge (${(report.overflow || []).length}):`);
  for (const o of report.overflow) {
    console.log(`    +${String(o.over).padStart(5)}px  ${String(o.width).padStart(6)}px wide  ${o.tag}.${o.cls}`);
  }
} else {
  console.log('\n  nothing past the right edge');
}

if (full) {
  console.log('\n  sections (offset, height):');
  for (const s of report.sections || []) {
    console.log(`    ${String(s.top).padStart(6)}px  ${String(s.height).padStart(5)}px   ${s.cls}`);
  }
  console.log('\n  rects:');
  console.log(`    header          ${JSON.stringify(report.rects.header)}`);
  console.log(`    hero            ${JSON.stringify(report.rects.hero)}`);
  console.log(`    first product   ${JSON.stringify(report.rects.firstProductCard)}`);
  console.log('\n  counts:');
  console.log(`    images ${report.counts.images} (broken ${report.counts.brokenImages})   cards ${report.counts.productCards}   collapsed ${report.counts.zeroSizedBlocks}`);
}

if (report.screenshot) console.log(`\n  screenshot  ${report.screenshot}`);
console.log('');
