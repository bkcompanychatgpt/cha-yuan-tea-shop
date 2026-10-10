/**
 * Find the elements that overflow a chosen viewport width, with their text.
 *
 * visual-check reports the tag and the overhang; that is not always enough to
 * identify the element, so this prints the text content and the class list too.
 *
 *   node server/scripts/overflow.mjs /shop 390
 */
import { launch } from './lib/chrome.mjs';

const target = process.argv[2] || '/';
const width = Number(process.argv[3]) || 390;
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const browser = await launch({ width, height: 900, dpr: 1 });
try {
  const report = await browser.evaluateOn(`${BASE}${target}`, `(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width <= vw + 1) continue;
      const style = getComputedStyle(el);
      if (style.position === 'fixed' && style.visibility === 'hidden') continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: el.className && typeof el.className === 'string' ? el.className : '',
        text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 90),
        width: Math.round(r.width),
        left: Math.round(r.left),
        overflow: Math.round(r.right - vw),
        whiteSpace: style.whiteSpace,
        display: style.display,
      });
    }
    out.sort((a, b) => b.overflow - a.overflow);
    return { vw, scrollWidth: document.documentElement.scrollWidth, items: out.slice(0, 14) };
  })()`);

  console.log(`${target} at ${width}px`);
  console.log(`  viewport ${report.vw}, document scrollWidth ${report.scrollWidth}\n`);
  if (!report.items.length) console.log('  nothing overflows');
  for (const it of report.items) {
    console.log(`  ${it.tag}.${it.cls || '(no class)'}`);
    console.log(`     ${it.width}px wide, overflows by ${it.overflow}px, display ${it.display}, white-space ${it.whiteSpace}`);
    console.log(`     "${it.text}"`);
  }
} finally {
  await browser.close();
}
