/**
 * Find text that is squeezed into a column too narrow to read.
 *
 * The overflow check cannot see this. A layout can be badly wrong without being
 * wider than the viewport: the homepage's "how we buy" block held two fixed
 * fractional columns with no breakpoint, so at 390px its text half was 183px and
 * every paragraph wrapped to one or two words a line — four hundred pixels of
 * ragged type where a single column of prose belongs. Nothing overflowed, every
 * image loaded, every block had height. It looked fine to every test and wrong
 * to anyone holding a phone.
 *
 * Two things are measured at phone width, both reported with the text that
 * proves them:
 *
 *   1. A block of running text in a box that is **taller than it is wide** and
 *      narrower than `--min-text` (200px). Height is the signal that matters: a
 *      two-line teaser in a 168px card is 168×39 and perfectly readable, while
 *      the same box strangled to 90px runs 90×320 and wraps to two words a line.
 *      A clamped line-clamp teaser is skipped outright — it is short by design.
 *   2. A multi-column grid whose tracks are narrower than `--min-track` (140px)
 *      **and which contains text**. A row of image thumbnails is fine at 110px;
 *      a row of three text columns is not.
 *
 *   node server/scripts/check-mobile-layout.mjs [--width 390]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './lib/chrome.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const WIDTH = Number(flag('--width', 390));
const MIN_TEXT = Number(flag('--min-text', 200));
const MIN_TRACK = Number(flag('--min-track', 140));

const PAGES = [
  '/', '/shop', '/shop?department=tea', '/shop?department=jewellery', '/shop?department=jewellery',
  '/tea/lion-peak-longjing', '/tea/amethyst-coin-asymmetric-muse-bracelet', '/guides', '/guides/how-to-brew-gongfu',
  '/cart', '/checkout', '/about', '/shipping', '/refund', '/terms', '/privacy', '/contact', '/credits', '/order',
];

const PROBE = (minText, minTrack) => `(() => {
  const MIN_TEXT = ${minText};
  const MIN_TRACK = ${minTrack};

  /** Text that belongs to this element itself, not to its children. */
  function ownText(el) {
    let out = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) out += node.nodeValue;
    }
    return out.replace(/\\s+/g, ' ').trim();
  }

  function label(el) {
    const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\\s+/).join('.') : '';
    return el.tagName.toLowerCase() + cls;
  }

  function visible(el) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  const narrowText = [];
  const narrowTracks = [];
  const vw = document.documentElement.clientWidth;

  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const rect = el.getBoundingClientRect();

    /*
     * Running text. Skip leaf-inline markup (a <strong> mid-sentence is not a
     * column), skip anything sitting in a horizontal scroller, where a narrow
     * box is the whole point, and skip a deliberately clamped teaser.
     */
    const text = ownText(el);
    if (text.length > 60) {
      const computed = getComputedStyle(el);
      const display = computed.display;
      const inline = display.startsWith('inline') && display !== 'inline-block';
      const clamped = (computed.webkitLineClamp && computed.webkitLineClamp !== 'none')
        || (computed.lineClamp && computed.lineClamp !== 'none');
      let scroller = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') { scroller = true; break; }
      }
      // Taller than wide: the box is strangling the text, not just short.
      const strangling = rect.height > rect.width;
      if (!inline && !scroller && !clamped && strangling && rect.width < MIN_TEXT) {
        narrowText.push({
          el: label(el),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          chars: text.length,
          sample: text.slice(0, 70),
        });
      }
    }

    /*
     * Multi-column grids: every track has to be usable, but only where there is
     * something to read in it. A grid of three 110px thumbnails is a filmstrip;
     * a grid of three 112px text columns is a mistake.
     */
    const style = getComputedStyle(el);
    if (style.display === 'grid' || style.display === 'inline-grid') {
      const cols = style.gridTemplateColumns.split(' ').filter((t) => t && t !== 'none');
      if (cols.length >= 2 && rect.width > 0) {
        const widest = Math.max(...cols.map((c) => parseFloat(c) || 0));
        const words = ownText(el);
        const hasProse = (el.textContent || '').replace(/\s+/g, ' ').trim().length > 60 && words.length > 0;
        if (hasProse && widest > 0 && widest < MIN_TRACK) {
          narrowTracks.push({
            el: label(el),
            cols: cols.length,
            track: Math.round(widest),
            width: Math.round(rect.width),
          });
        }
      }
    }
  }

  return { vw, narrowText, narrowTracks };
})()`;

console.log(`\nMobile layout — text and grid tracks at ${WIDTH}px\n`);

const browser = await launch({ width: WIDTH, height: 900, dpr: 1 });
let problems = 0;

try {
  for (const page of PAGES) {
    let report;
    try {
      report = await browser.evaluateOn(`${BASE}${page}`, PROBE(MIN_TEXT, MIN_TRACK));
    } catch (err) {
      console.log(`  \u001b[31mFAIL\u001b[0m  ${page} — ${err.message}`);
      problems += 1;
      continue;
    }
    if (!report) {
      console.log(`  \u001b[31mFAIL\u001b[0m  ${page} — no report (page did not render?)`);
      problems += 1;
      continue;
    }

    const hits = report.narrowText.length + report.narrowTracks.length;
    problems += hits;

    if (!hits) {
      console.log(`  \u001b[32mPASS\u001b[0m  ${page} — nothing squeezed`);
      continue;
    }

    console.log(`  \u001b[31mFAIL\u001b[0m  ${page}`);
    for (const t of report.narrowText.slice(0, 6)) {
      console.log(`          ${t.width}px wide × ${t.height}px tall, ${t.chars} chars  ${t.el}`);
      console.log(`            "${t.sample}…"`);
    }
    for (const g of report.narrowTracks.slice(0, 6)) {
      console.log(`          grid ${g.el}: ${g.cols} tracks, narrowest ${g.track}px in ${g.width}px`);
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${'-'.repeat(58)}`);
console.log(`  ${problems === 0 ? 'PASS' : 'FAIL'}  ${problems} problem(s) across ${PAGES.length} pages\n`);
process.exit(problems ? 1 : 0);
