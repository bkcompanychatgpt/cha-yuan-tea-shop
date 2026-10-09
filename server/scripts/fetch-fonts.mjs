/**
 * Self-host the display and body webfonts.
 *
 * Reads the Google Fonts stylesheets already saved in public/fonts, downloads
 * every woff2 they reference into the same folder, and rewrites the CSS to point
 * at the local copies. Keeps the site free of third-party requests (and lets the
 * Content-Security-Policy stay strict: font-src 'self').
 *
 * Run once:  node server/scripts/fetch-fonts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(__dirname, '..', '..', 'public', 'fonts');

const SHEETS = ['cormorant.css', 'inter.css'];

async function main() {
  if (!fs.existsSync(FONT_DIR)) {
    console.error(`Missing ${FONT_DIR}`);
    process.exit(1);
  }

  let downloaded = 0;
  let reused = 0;

  for (const sheet of SHEETS) {
    const file = path.join(FONT_DIR, sheet);
    if (!fs.existsSync(file)) {
      console.warn(`skip ${sheet} (not present)`);
      continue;
    }

    let css = fs.readFileSync(file, 'utf8');
    const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"]+\.woff2/g) || [])];

    for (const url of urls) {
      const name = `${path.basename(url).replace(/\.woff2$/, '')}.woff2`;
      const dest = path.join(FONT_DIR, name);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
        reused += 1;
      } else {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`  ! ${res.status} for ${url}`);
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(dest, buf);
        downloaded += 1;
      }
      css = css.split(url).join(`/fonts/${name}`);
    }

    fs.writeFileSync(file, Buffer.from(css, 'utf8'));
    console.log(`${sheet}: ${urls.length} font file(s) localised`);
  }

  const files = fs.readdirSync(FONT_DIR).filter((f) => f.endsWith('.woff2'));
  const bytes = files.reduce((n, f) => n + fs.statSync(path.join(FONT_DIR, f)).size, 0);
  console.log(`\n${downloaded} downloaded, ${reused} already present`);
  console.log(`${files.length} woff2 files, ${(bytes / 1024).toFixed(0)} KB total`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
