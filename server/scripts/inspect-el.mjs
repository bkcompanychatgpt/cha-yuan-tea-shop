/**
 * Inspect specific elements in a real page at a real viewport.
 *
 * The layout probe reports that something is past the right edge; this says what
 * it actually is, with its computed style and its offset chain, which is usually
 * enough to see the cause.
 *
 *   node server/scripts/inspect-el.mjs / .cart-drawer 390
 *   node server/scripts/inspect-el.mjs / "body *" 1440 --limit 5
 */
import { withBrowser } from './lib/chrome.mjs';

const targetPath = process.argv[2] || '/';
const selector = process.argv[3] || '.cart-drawer';
const width = Number.parseInt(process.argv[4], 10) || 390;
const mobile = width <= 480;
const BASE = (process.argv.find((a) => a.startsWith('http')) || 'http://127.0.0.1:3080').replace(/\/+$/, '');
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > -1 ? Number.parseInt(process.argv[limitArg + 1], 10) : 1;

const script = `(() => {
  const els = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).slice(0, ${limit});
  return els.map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const chain = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const cr = node.getBoundingClientRect();
      const ncs = getComputedStyle(node);
      chain.push({
        tag: node.tagName.toLowerCase(),
        cls: String(node.className || '').slice(0, 40),
        left: Math.round(cr.left),
        right: Math.round(cr.right),
        width: Math.round(cr.width),
        position: ncs.position,
        transform: ncs.transform === 'none' ? 'none' : ncs.transform.slice(0, 40),
        overflowX: ncs.overflowX,
      });
      node = node.parentElement;
    }
    return {
      tag: el.tagName.toLowerCase(),
      cls: String(el.className || ''),
      rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) },
      style: {
        position: cs.position,
        transform: cs.transform === 'none' ? 'none' : cs.transform.slice(0, 60),
        inset: cs.inset,
        visibility: cs.visibility,
        display: cs.display,
      },
      chain,
    };
  });
})()`;

const out = await withBrowser({ width, height: mobile ? 844 : 900, dpr: mobile ? 3 : 1, mobile }, async (browser) => {
  await browser.goto(`${BASE}${targetPath}`);
  return browser.evaluate(script);
});

console.log(`\n${targetPath} @ ${width}px   selector: ${selector}\n`);
if (!out || !out.length) {
  console.log('  no elements matched\n');
  process.exit(0);
}

for (const el of out) {
  console.log(`  ${el.tag}.${el.cls}`);
  console.log(`    rect     left ${el.rect.left}  right ${el.rect.right}  width ${el.rect.width}  height ${el.rect.height}`);
  console.log(`    style    position ${el.style.position}   display ${el.style.display}   visibility ${el.style.visibility}`);
  console.log(`    transform ${el.style.transform}`);
  console.log('    offset chain (innermost first):');
  for (const c of el.chain) {
    console.log(
      `      ${String(c.left).padStart(6)} .. ${String(c.right).padStart(6)}  w${String(c.width).padStart(5)}  ${c.position.padEnd(8)} ovf:${c.overflowX.padEnd(7)} ${c.tag}.${c.cls}`,
    );
  }
  console.log('');
}
