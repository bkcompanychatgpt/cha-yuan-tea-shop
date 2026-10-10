/**
 * One version for the assets whose content changes while their path does not.
 *
 * Three separate things went wrong for the same underlying reason, and this
 * module is the single answer to all three:
 *
 *   1. `public/css/styles.css` was served `max-age=7d`, so a returning visitor
 *      kept a week-old stylesheet and the new footer rendered unstyled.
 *   2. The payment marks were served `immutable` for a year, and the fallback
 *      produced when a mark file was *missing* was cached under the same URL —
 *      so the footer kept showing gold pills reading "VISA" long after the real
 *      artwork shipped.
 *   3. Product photography is replaced **in place**: a re-shoot of sixteen jade
 *      and jewellery pieces lands as the same `<slug>-hero.jpg`. With a week of
 *      max-age, the browser showed the old pictures and the page had no way to
 *      say otherwise. The images were correct on the server, byte for byte, and
 *      the shop still displayed the previous ones.
 *
 * The version is a hash of the files themselves, computed at boot: the
 * stylesheet's bytes, and the name and size of everything in the brand-mark and
 * photo directories. There is no build step to forget and no constant to bump,
 * and appending it to a URL changes the cache key, so a stale copy can never be
 * matched.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');

const BADGE_DIR = path.join(PUBLIC_DIR, 'img', 'badge');
const PHOTO_DIR = path.join(PUBLIC_DIR, 'img', 'photos');
const STYLESHEET = path.join(PUBLIC_DIR, 'css', 'styles.css');

/**
 * Fingerprint a directory by name and size rather than by bytes.
 *
 * A replacement photograph differs in size as well as content, so this catches
 * every real change while keeping boot to a few milliseconds over a directory
 * holding several hundred images.
 */
function fingerprint(hash, dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    hash.update(`${file}:${stat.size};`);
  }
}

export const ASSET_VERSION = (() => {
  const hash = crypto.createHash('sha1');
  if (fs.existsSync(STYLESHEET)) hash.update(fs.readFileSync(STYLESHEET));
  fingerprint(hash, BADGE_DIR);
  fingerprint(hash, PHOTO_DIR);
  return hash.digest('hex').slice(0, 10);
})();

let photoCount = 0;
try {
  photoCount = fs.readdirSync(PHOTO_DIR).length;
} catch {
  photoCount = 0;
}

/**
 * Append the asset version to a photograph URL.
 *
 * Only `/img/photos/` paths are touched. They are the ones that get replaced
 * under a fixed name, and leaving every other URL alone keeps the anchors in
 * the audit scripts (`/img/product/<slug>.svg` and friends) matching exactly.
 *
 * Safe to call on anything: a null, an empty string, an external URL or an
 * already-versioned URL all come back unchanged.
 */
export function photoUrl(url) {
  const value = String(url || '');
  if (!value.startsWith('/img/photos/')) return url;
  if (value.includes('?')) return value;
  return `${value}?v=${ASSET_VERSION}`;
}

export const assetStats = {
  version: ASSET_VERSION,
  photos: photoCount,
};
