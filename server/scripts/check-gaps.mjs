/**
 * Placeholder audit.
 *
 * Lists every image a page references and classifies it as real photography or
 * generated SVG artwork. Generated artwork is legitimate for the logo and badges,
 * and for the handful of products with no suitable openly-licensed photograph —
 * but it should never be a surprise, so this reports exactly where it is used.
 *
 *   node server/scripts/check-gaps.mjs [baseUrl]
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const PAGES = [
  '/',
  '/shop',
  '/shop?category=teaware',
  '/shop?category=gift-sets',
  '/shop?q=tea&sort=price-asc&page=2',
  '/tea/lion-peak-longjing',
  '/tea/bamboo-tea-tray',
  '/tea/yixing-zisha-shi-piao-pot',
  '/tea/gongfu-starter-kit',
  '/cart',
  '/checkout',
  '/guides',
  '/guides/how-to-brew-gongfu',
  '/about',
  '/shipping',
  '/terms',
  '/credits',
  '/order',
];

/** Artwork that is intentionally generated, with the reason. */
const EXPECTED_GENERATED = [
  { pattern: /^\/img\/logo\.svg$/, why: 'brand logotype' },
  { pattern: /^\/favicon\.svg$/, why: 'brand favicon' },
  { pattern: /^\/img\/badge\//, why: 'payment badge' },
];

/**
 * Slots that legitimately have no photograph. Empty: every product and every
 * category now has one, so anything appearing here would be a regression.
 *
 * Entries are reported as information rather than as failures, which is why this
 * list stays even when empty — a future product without photography needs a
 * deliberate reason recorded here, not a silent pass.
 */
const KNOWN_NO_PHOTO = [];

async function main() {
  console.log(`\nPlaceholder audit against ${BASE}\n`);

  const seen = new Map();

  for (const page of PAGES) {
    let html;
    try {
      const res = await fetch(`${BASE}${page}`);
      html = await res.text();
      if (!res.ok || html.includes('Something went wrong')) {
        console.log(`  \u001b[31mFAIL\u001b[0m  ${page} — page did not render`);
        continue;
      }
    } catch (err) {
      console.log(`  \u001b[31mFAIL\u001b[0m  ${page} — ${err.message}`);
      continue;
    }
    for (const match of html.matchAll(/<img[^>]*src="([^"]+)"/g)) {
      const src = match[1];
      if (!src.startsWith('/')) continue;
      if (!seen.has(src)) seen.set(src, page);
    }
  }

  const generated = [];
  const photography = [];
  const unknown = [];

  for (const [src, page] of seen) {
    const expected = EXPECTED_GENERATED.find((e) => e.pattern.test(src));
    if (expected) continue;

    if (src.startsWith('/img/photos/')) {
      photography.push(src);
      continue;
    }

    const known = KNOWN_NO_PHOTO.find((e) => e.pattern.test(src));
    if (known) {
      generated.push({ src, page, why: known.why });
      continue;
    }

    if (/^\/img\/(product|category|editorial|hero)\//.test(src)) {
      unknown.push({ src, page });
      continue;
    }

    // Anything else (fonts, other SVG) is not an image slot we grade.
    unknown.push({ src, page, note: 'unclassified image reference' });
  }

  console.log(`  ${photography.length} photograph(s) in use`);
  console.log(`  ${generated.length} known gap(s) using generated artwork`);

  if (generated.length) {
    console.log('\n  Known gaps (generated artwork, documented):');
    for (const g of generated) console.log(`    ${g.src}\n      on ${g.page} — ${g.why}`);
  }

  if (unknown.length) {
    console.log(`\n  \u001b[33m${unknown.length} unclassified reference(s) — these are real gaps:\u001b[0m`);
    for (const u of unknown) console.log(`    ${u.src}   (first seen on ${u.page})${u.note ? ` — ${u.note}` : ''}`);
  } else {
    console.log('\n  \u001b[32mNo unclassified placeholder references.\u001b[0m');
  }

  console.log(`\n${'-'.repeat(58)}`);
  console.log(`  ${unknown.length === 0 ? 'PASS' : 'FAIL'}  ${unknown.length} unreviewed gap(s)\n`);
  process.exit(unknown.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
