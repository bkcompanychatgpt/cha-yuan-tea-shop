/**
 * Screenshot one element, so a detail can be reviewed at full resolution
 * instead of squinting at a downscaled full-page capture.
 *
 *   node server/scripts/shot-el.mjs <path> <selector> <out.png> [width] [height] [--cart]
 *
 * `--cart` seeds the basket from the real catalogue before navigating. Cart,
 * checkout and payment pages render an empty state without it, and an empty
 * state has no payment marks or order summary to review.
 *
 * Lazy-loaded images below the fold do not necessarily paint in a full-page
 * capture, so a blank plate in a screenshot is not proof the image is broken:
 * server/scripts/probe-badges.mjs checks decoding directly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './lib/chrome.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const argv = process.argv.slice(2);
const WITH_CART = argv.includes('--cart');
const [target, selector, outArg, wArg, hArg] = argv.filter((a) => !a.startsWith('--'));

/** Real variant rows, so the seeded basket looks like a genuine one. */
async function cartItems() {
  const { getDb } = await import('../db.mjs');
  const db = getDb();
  const rows = db.prepare(
    `SELECT v.id AS variantId, v.price_cents AS priceCents, v.label AS variantLabel,
            v.stock, p.slug, p.name, p.hero_image AS image
       FROM variants v JOIN products p ON p.id = v.product_id
      WHERE p.is_active = 1 AND v.stock > 0
      ORDER BY v.id LIMIT 2`,
  ).all();
  return rows.map((r) => ({
    variantId: Number(r.variantId),
    slug: r.slug,
    name: r.name,
    variantLabel: r.variantLabel,
    priceCents: Number(r.priceCents),
    quantity: 1,
    image: r.image,
    stock: Number(r.stock),
  }));
}

if (!target || !selector || !outArg) {
  console.error('usage: node server/scripts/shot-el.mjs <path> <selector> <out.png> [width] [height] [--cart]');
  process.exitCode = 2;
} else {
  const BASE = (process.env.BASE_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '');
  const width = Number(wArg) || 1440;
  const height = Number(hArg) || 900;
  const out = path.isAbsolute(outArg) ? outArg : path.join(ROOT, outArg);

  const browser = await launch({ width, height, dpr: 1 });
  try {
    const url = new URL(target, BASE).href;

    if (WITH_CART) {
      const items = await cartItems();
      if (!items.length) throw new Error('no in-stock variants to seed the cart with');
      // Land on the origin first so localStorage is writable for this host.
      await browser.goto(`${BASE}/`);
      await browser.evaluate(`window.localStorage.setItem('cy_cart_v1', ${JSON.stringify(JSON.stringify(items))})`);
    }

    const box = await browser.evaluateOn(url, `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.max(0, Math.round(r.left + window.scrollX) - 12),
        y: Math.max(0, Math.round(r.top + window.scrollY) - 12),
        width: Math.round(r.width) + 24,
        height: Math.round(r.height) + 24,
      };
    })()`);

    if (!box || box.width <= 24) {
      console.error(
        `no visible element matched ${JSON.stringify(selector)} on ${url}` +
        `${box ? ' (zero-width — hidden by an empty state? try --cart)' : ''}`,
      );
      process.exitCode = 1;
    } else {
      await browser.goto(url);
      await new Promise((r) => setTimeout(r, 700));
      const clipped = await browser.screenshotClip(url, box);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, clipped);
      console.log(`${out}`);
      console.log(`  ${selector}  ${box.width}x${box.height} at ${box.x},${box.y}  (viewport ${width}x${height})`);
    }
  } finally {
    await browser.close();
  }
}
