/**
 * Read the audit probe's own report for one page, so a visual-check failure can
 * be inspected in the same terms the check uses.
 *
 *   node server/scripts/audit-page.mjs /shop [width]
 */
import { launch } from './lib/chrome.mjs';

const target = process.argv[2] || '/';
const width = Number(process.argv[3]) || 390;
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const browser = await launch({ width, height: 900, dpr: 1 });
try {
  const { html } = await browser.capture(`${BASE}/dev/audit?path=${encodeURIComponent(target)}`);
  const m = html.match(/<pre id="report">([\s\S]*?)<\/pre>/);
  if (!m) {
    console.error('no report element found');
    process.exitCode = 1;
  } else {
    const report = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    console.log(`viewport ${report.viewportWidth}, docWidth ${report.docWidth}, docHeight ${report.docHeight}`);
    console.log(`horizontalOverflow: ${report.horizontalOverflow}`);
    console.log('\noverflow entries:');
    for (const o of report.overflow || []) {
      console.log(`  ${o.tag}.${o.cls || '(none)'}  width ${o.width}  left ${o.left}  over +${o.over}`);
      if (o.text) console.log(`     "${String(o.text).slice(0, 110)}"`);
    }
    if (!(report.overflow || []).length) console.log('  (none)');
    console.log('\ncounts:', JSON.stringify(report.counts));
    const broken = report.brokenImageSrcs || [];
    console.log(`\nbroken images: ${broken.length}`);
    for (const src of broken) console.log(`  ${src}`);
    if (report.zeroSizedBlockDetails) {
      console.log('\nzero-sized blocks:');
      for (const z of report.zeroSizedBlockDetails) console.log(`  ${JSON.stringify(z)}`);
    }
  }
} finally {
  await browser.close();
}
