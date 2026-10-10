/**
 * Screenshot the nth match of a selector, so one card in a grid can be inspected
 * on its own when the surrounding grid makes it hard to read.
 *
 *   node server/scripts/shot-index.mjs <path> <selector> <index> <out.png> [width] [height]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './lib/chrome.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const [target, selector, idxArg, outArg, wArg, hArg] = process.argv.slice(2);
if (!target || !selector || idxArg === undefined || !outArg) {
  console.error('usage: node server/scripts/shot-index.mjs <path> <selector> <index> <out.png> [w] [h]');
  process.exitCode = 2;
} else {
  const index = Number(idxArg);
  const width = Number(wArg) || 1440;
  const height = Number(hArg) || 900;
  const out = path.isAbsolute(outArg) ? outArg : path.join(ROOT, outArg);
  const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '');
  const url = new URL(target, BASE).href;

  const browser = await launch({ width, height, dpr: 2 });
  try {
    const box = await browser.evaluateOn(url, `(() => {
      const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + window.scrollX) - 10, y: Math.round(r.top + window.scrollY) - 10,
               width: Math.round(r.width) + 20, height: Math.round(r.height) + 20,
               text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 200) };
    })()`);
    if (!box) {
      console.error(`no match at index ${index} for ${selector}`);
      process.exitCode = 1;
    } else {
      await browser.goto(url);
      await new Promise((r) => setTimeout(r, 700));
      const png = await browser.screenshotClip(url, box);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, png);
      console.log(out);
      console.log(`  ${selector}[${index}]  ${box.width}x${box.height}`);
      console.log(`  "${box.text}"`);
    }
  } finally {
    await browser.close();
  }
}
