/**
 * Report the computed layout of a selector set, so a broken grid can be
 * diagnosed from numbers rather than from a screenshot.
 *
 *   node server/scripts/probe-layout.mjs /shop ".dept" [width]
 */
import { launch } from './lib/chrome.mjs';

const target = process.argv[2] || '/';
const selector = process.argv[3] || '.dept';
const width = Number(process.argv[4]) || 1440;
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const browser = await launch({ width, height: 900, dpr: 1 });
try {
  const report = await browser.evaluateOn(`${BASE}${target}`, `(() => {
    const out = [];
    for (const el of document.querySelectorAll(${JSON.stringify(selector)})) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || '').slice(0, 50),
        display: cs.display,
        flexDirection: cs.flexDirection,
        gridTemplateColumns: cs.gridTemplateColumns,
        x: Math.round(r.left), y: Math.round(r.top),
        w: Math.round(r.width), h: Math.round(r.height),
        children: [...el.children].map((c) => {
          const cr = c.getBoundingClientRect();
          return c.className + ' ' + Math.round(cr.width) + 'x' + Math.round(cr.height) + ' @' + Math.round(cr.left) + ',' + Math.round(cr.top);
        }),
      });
    }
    const grid = document.querySelector('.dept-grid');
    return {
      gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      gridWidth: grid ? Math.round(grid.getBoundingClientRect().width) : null,
      items: out,
    };
  })()`);

  console.log(`${target} @ ${width}px   ${selector}`);
  console.log(`  .dept-grid columns: ${report.gridCols}  width ${report.gridWidth}`);
  for (const it of report.items) {
    console.log(`  ${it.cls || it.tag}  ${it.w}x${it.h} @${it.x},${it.y}  display=${it.display} dir=${it.flexDirection}`);
    for (const c of it.children) console.log(`      ${c}`);
  }
} finally {
  await browser.close();
}
