/**
 * Visual regression probe.
 *
 * Loads each storefront page through /dev/probe (which measures the DOM in a
 * real browser) and asserts the things a designer would notice: nothing is
 * broken, nothing overflows, the palette and typography actually applied, and
 * no block collapsed to zero size.
 *
 * Usage: node server/scripts/visual-check.mjs [baseUrl]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/+$/, '');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function findBrowser() {
  return CHROME_CANDIDATES.find((p) => fs.existsSync(p)) || null;
}

/**
 * Run headless Chrome and capture its --dump-dom output.
 *
 * Chrome's stdout is redirected straight to a file descriptor rather than a
 * pipe: a confined sandbox can refuse to give a child a piped stdio, and this
 * also avoids every layer of shell quoting on Windows.
 */
function dumpDom(browser, url, viewport) {
  return new Promise((resolve, reject) => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cy-probe-'));
    const outFile = path.join(profile, 'dom.html');
    const fd = fs.openSync(outFile, 'w');

    const child = spawn(
      browser,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-extensions',
        '--disable-dev-shm-usage',
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
        /* already closed */
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
      if (!html) return reject(new Error('headless browser produced no output'));
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

let passed = 0;
let failed = 0;
const failures = [];

function check(ok, name, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  \u001b[32mPASS\u001b[0m  ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  \u001b[31mFAIL\u001b[0m  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const PAGES = ['/', '/shop', '/tea/lion-peak-longjing', '/cart', '/checkout', '/guides', '/about'];

/**
 * Viewports to audit. The default Chrome window is 800px, which is neither a
 * phone nor a desktop, so the widths that matter are set explicitly.
 */
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

async function main() {
  const browser = findBrowser();
  if (!browser) {
    console.error('No Chrome/Edge found — skipping the visual probe.');
    process.exit(0);
  }
  console.log(`\nCha Yuan visual probe (${path.basename(browser)})\n`);

  const reports = [];
  for (const viewport of VIEWPORTS) {
    console.log(`\n${'='.repeat(58)}\nViewport: ${viewport.name} (${viewport.width}x${viewport.height})\n${'='.repeat(58)}`);

    for (const page of PAGES) {
      const html = await dumpDom(browser, `${BASE}/dev/audit?path=${encodeURIComponent(page)}`, viewport);
      const report = extractReport(html);
      if (!report) {
        check(false, `probe returned a report for ${page} @ ${viewport.name}`, 'no <pre id="report"> found');
        continue;
      }
      report.viewportName = viewport.name;
      reports.push(report);

      console.log(`\n${page}`);
      check(
        !report.horizontalOverflow,
        `${page} has no horizontal overflow`,
        report.horizontalOverflow
          ? `${report.docWidth} > ${report.viewportWidth}; widest offenders: ${(report.overflow || [])
              .slice(0, 3)
              .map((o) => `${o.tag}.${o.cls} +${o.over}px`)
              .join(', ')}`
          : '',
      );
      check(report.counts.brokenImages === 0, `${page} has no broken images`, (report.brokenImageSrcs || []).join(', '));
      check(report.counts.zeroSizedBlocks === 0, `${page} has no collapsed blocks`, (report.zeroSizedBlocks || []).join(', '));
      check(report.bodyBg === 'rgb(6, 16, 11)', `${page} uses the ink-green ground`, report.bodyBg);
      check(report.rects.header && report.rects.header.h >= 60, `${page} renders the sticky header`, JSON.stringify(report.rects.header));
      check(report.docHeight > 900, `${page} produced real content`, `height ${report.docHeight}`);
      // Nothing should be wider than the viewport once the page is laid out.
      check(
        (report.overflow || []).length === 0,
        `${page} has no element wider than the viewport`,
        (report.overflow || []).slice(0, 3).map((o) => `${o.tag}.${o.cls} +${o.over}px`).join(', '),
      );

      if (report.styles.heroH1) {
        check(/Cormorant|Georgia|Times|serif/.test(report.styles.heroH1['font-family']), `${page} headline uses the serif display face`, report.styles.heroH1['font-family']);
      }
      if (report.styles.eyebrow) {
        check(report.styles.eyebrow['text-transform'] === 'uppercase', `${page} eyebrow labels are uppercase`, report.styles.eyebrow['text-transform']);
        check(parseFloat(report.styles.eyebrow['letter-spacing']) > 1, `${page} eyebrow labels are letter-spaced`, report.styles.eyebrow['letter-spacing']);
      }
      if (report.accentSwatches) {
        check(report.accentSwatches.gold === '#dcc07a', `${page} gold accent token is applied`, report.accentSwatches.gold);
        check(report.accentSwatches.ink === '#06100b', `${page} ink token is applied`, report.accentSwatches.ink);
      }
    }
  }

  const at = (pathname, viewportName) => reports.find((r) => r.path === pathname && r.viewportName === viewportName);

  const shop = at('/shop', 'desktop');
  if (shop) {
    console.log('\n/shop specifics');
    check(shop.counts.productCards >= 12, 'the grid renders a full page of products', `${shop.counts.productCards} cards`);
    check(shop.styles.navLink && shop.styles.navLink['text-transform'] === 'uppercase', 'nav links are uppercase', shop.styles.navLink?.['text-transform']);
    check(shop.rects.firstProductCard && shop.rects.firstProductCard.h > 280, 'product cards have real height', JSON.stringify(shop.rects.firstProductCard));
    check(shop.styles.price && /Cormorant|Georgia|serif/.test(shop.styles.price['font-family']), 'prices use the display face', shop.styles.price?.['font-family']);
  }

  // The phone issues a desktop-width check cannot see.
  const phoneHome = at('/', 'phone');
  if (phoneHome) {
    console.log('\nphone specifics (390px)');
    check(phoneHome.counts.productCards > 0, 'the phone homepage shows product cards', `${phoneHome.counts.productCards}`);
    check(
      phoneHome.rects.header && phoneHome.rects.header.w <= 391,
      'the phone header fits the viewport',
      JSON.stringify(phoneHome.rects.header),
    );
    check(
      phoneHome.rects.firstProductCard && phoneHome.rects.firstProductCard.w >= 150,
      'phone product cards are a usable size',
      JSON.stringify(phoneHome.rects.firstProductCard),
    );
  }

  const checkout = reports.find((r) => r.path === '/checkout');
  if (checkout) {
    console.log('\n/checkout specifics');
    check(checkout.counts.forms >= 1, 'the checkout form is present');
    check(checkout.rects.primaryButton && checkout.rects.primaryButton.h >= 40, 'the pay button is a real target', JSON.stringify(checkout.rects.primaryButton));
    check(checkout.styles.primaryButton && checkout.styles.primaryButton['background-image'].includes('gradient'), 'the primary button uses the gold gradient', checkout.styles.primaryButton?.['background-image']);
  }

  const home = reports.find((r) => r.path === '/');
  if (home) {
    console.log('\n/ specifics');
    check(home.rects.hero && home.rects.hero.h >= 500, 'the hero has presence', JSON.stringify(home.rects.hero));
    check(home.counts.navLinks >= 4, 'the main navigation renders', `${home.counts.navLinks} links`);
    check(home.rects.footer && home.rects.footer.h > 200, 'the footer renders', JSON.stringify(home.rects.footer));
  }

  console.log(`\n${'-'.repeat(58)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\n  Failures:');
    failures.forEach((f) => console.log(`   - ${f}`));
  }
  console.log('');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('Visual probe failed to run:', err);
  process.exit(1);
});
