/**
 * Render every payment mark large, on both a light and a dark plate, into one
 * image. Some networks publish white-knockout artwork meant for dark
 * backgrounds; those vanish on the light plate the checkout uses, and this shows
 * which is which at a glance instead of guessing from the file name.
 *
 *   node server/scripts/sheet-badges.mjs [_shots/badge-sheet.png]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './lib/chrome.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = process.argv[2] ? path.resolve(ROOT, process.argv[2]) : path.join(ROOT, '_shots', 'badge-sheet.png');
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const slugs = ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners', 'unionpay', 'paypal', 'applepay'];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin:0; background:#08160f; font:12px/1.4 Consolas, monospace; color:#dcc07a; padding:16px; }
  .grid { display:grid; grid-template-columns: 130px 200px 200px; gap:9px 14px; align-items:center; }
  .name { color:#dcc07a; }
  .plate { border-radius:4px; padding:12px; display:flex; align-items:center; justify-content:center; height:54px; }
  .plate img { max-width:176px; max-height:50px; }
  .cap { color:#8b8779; font-size:10px; text-align:center; }
</style></head><body>
  <div class="grid">
    <div></div><div class="cap">on LIGHT plate #fbfaf6</div><div class="cap">on DARK plate #0b1c13</div>
    ${slugs.map((slug) => `
      <div class="name">${slug}.svg</div>
      <div class="plate" style="background:#fbfaf6"><img src="/img/badge/${slug}.svg" alt=""></div>
      <div class="plate" style="background:#0b1c13"><img src="/img/badge/${slug}.svg" alt=""></div>
    `).join('')}
  </div>
</body></html>`;

const browser = await launch({ width: 640, height: 900, dpr: 2 });
try {
  // A data: URL keeps this independent of any route on the server.
  const page = await browser.session.send('Page.navigate', { url: `${BASE}/credits` });
  void page;
  await browser.evaluate(`(() => {
    document.open();
    document.write(${JSON.stringify(html)});
    document.close();
  })()`);
  await new Promise((r) => setTimeout(r, 1200));
  const png = await browser.screenshotCurrent();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, png);
  console.log(OUT);
} finally {
  await browser.close();
}
