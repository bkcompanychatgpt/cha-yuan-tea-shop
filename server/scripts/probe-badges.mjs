/**
 * Why does a badge render blank?
 *
 * Loads every mark through a real <img> in Chrome and reports whether it
 * decoded, its intrinsic size, and any load error. An image that "serves 200"
 * can still fail to decode, and a failed SVG renders as a zero-width box, which
 * looks exactly like a styled empty plate.
 *
 *   node server/scripts/probe-badges.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './lib/chrome.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const slugs = ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners', 'unionpay', 'paypal', 'applepay', '3ds'];

const browser = await launch({ width: 1200, height: 800, dpr: 1 });
try {
  await browser.goto(`${BASE}/credits`);
  const report = await browser.evaluate(`(async () => {
    const slugs = ${JSON.stringify(slugs)};
    const out = [];
    for (const slug of slugs) {
      const url = '/img/badge/' + slug + '.svg';
      const res = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ ok: true, w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ ok: false, w: 0, h: 0 });
        img.src = url;
        setTimeout(() => resolve({ ok: false, w: 0, h: 0, timeout: true }), 4000);
      });
      // The layout box the CSS actually produces.
      const probe = document.createElement('img');
      probe.className = 'mark';
      probe.src = url;
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      document.body.appendChild(probe);
      await new Promise((r) => setTimeout(r, 300));
      const box = probe.getBoundingClientRect();
      out.push({ slug, ...res, cssWidth: Math.round(box.width), cssHeight: Math.round(box.height) });
      probe.remove();
    }
    return out;
  })()`);

  console.log('Badge decode probe\n');
  let bad = 0;
  for (const r of report) {
    const ok = r.ok && r.w > 0;
    if (!ok || r.cssWidth < 20) bad += 1;
    console.log(
      `  ${ok && r.cssWidth >= 20 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${r.slug.padEnd(11)} ` +
      `decoded=${String(r.ok).padEnd(5)} intrinsic=${r.w}x${r.h}  css=${r.cssWidth}x${r.cssHeight}` +
      (r.timeout ? '  (timed out)' : ''),
    );
  }
  console.log(`\n  ${report.length - bad}/${report.length} marks decode and lay out at a usable width`);
  if (bad) process.exitCode = 1;
} finally {
  await browser.close();
}
