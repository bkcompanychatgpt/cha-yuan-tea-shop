/**
 * Dump the visible text-bearing elements inside a container, with positions.
 *
 * Used to identify what is actually rendering in a region of the page — faster
 * than reasoning about a screenshot, and it reports computed display so an
 * element that should be hidden is obvious.
 *
 *   node server/scripts/dump-region.mjs .site-header 390
 *   node server/scripts/dump-region.mjs .site-footer 1440
 */
import { withBrowser } from './lib/chrome.mjs';

const selector = process.argv[2] || '.site-header';
const width = Number.parseInt(process.argv[3], 10) || 390;
const mobile = width <= 480;
const BASE = (process.argv.find((a) => a.startsWith('http')) || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const expression = `(() => {
  const root = document.querySelector(${JSON.stringify(selector)});
  if (!root) return { error: 'selector not found' };
  const rows = [];
  Array.from(root.querySelectorAll('*')).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const cs = getComputedStyle(el);
    rows.push({
      tag: el.tagName.toLowerCase(),
      cls: String(el.getAttribute('class') || '').slice(0, 34),
      text: (el.childElementCount === 0 ? el.textContent : '').trim().slice(0, 20),
      x: Math.round(r.x),
      right: Math.round(r.right),
      w: Math.round(r.width),
      h: Math.round(r.height),
      display: cs.display,
      opacity: cs.opacity,
      position: cs.position,
    });
  });
  return { viewport: window.innerWidth, root: { w: Math.round(root.getBoundingClientRect().width) }, rows };
})()`;

const out = await withBrowser({ width, height: mobile ? 844 : 900, dpr: mobile ? 3 : 1, mobile }, async (browser) => {
  await browser.goto(`${BASE}/`);
  return browser.evaluate(expression);
});

if (out.error) {
  console.error(out.error);
  process.exit(1);
}

console.log(`\n${selector} @ ${width}px   (viewport measured ${out.viewport}px, container ${out.root.w}px)\n`);
console.log('     x   right     w     h  display   tag.class                              text');
for (const r of out.rows) {
  console.log(
    `${String(r.x).padStart(6)} ${String(r.right).padStart(6)} ${String(r.w).padStart(5)} ${String(r.h).padStart(5)}  ${r.display.padEnd(9)} ${(r.tag + '.' + r.cls).slice(0, 38).padEnd(38)} ${r.text}`,
  );
}
console.log('');
