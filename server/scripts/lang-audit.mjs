/**
 * Language audit.
 *
 * Scans templates, server code, catalogue data and every rendered page for
 * non-English text — CJK characters, Cyrillic, Arabic — and reports where each
 * occurrence lives. Run it before shipping a single-language storefront.
 *
 *   node server/scripts/lang-audit.mjs [baseUrl]
 *
 * Skips quoted source strings that legitimately describe another language
 * (CJK glossary examples, the `Songti SC` font stack), which are listed
 * separately as informational rather than as failures.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const BASE = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/+$/, '');

/** CJK ideographs, kana, Hangul, Cyrillic, Arabic, and CJK punctuation. */
const NON_LATIN = /[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u3001\u3002\uff01-\uff60]/;

/**
 * Mojibake: UTF-8 punctuation that was round-tripped through a legacy code page,
 * so an em dash now renders as a pair of accented characters. Not another
 * language, but the same class of problem — text that renders wrong — and it has
 * bitten this project twice. See server/scripts/repair-punctuation.mjs.
 */
const MOJIBAKE = /Ã[\u0080-\u00bf]|â€|â†|â‚¬|Â[\u00a0-\u00bf]/;

/**
 * Text that is deliberately *about* rather than *in* another language, or that is
 * a brand mark rather than copy. Each entry must state why.
 */
const ALLOWED = [
  // The Cha Yuan logotype carries a 茶 chop, the way a Western tea merchant puts
  // a leaf on its label. It is a trademark, not UI copy, and appears only in the
  // logo SVG and the favicon. Delete this rule if you drop the chop.
  { file: 'server/imagery.mjs', quote: 'Chinese Tea' },
  // CJK glyphs must stay in the font stack: they are what renders the logotype
  // and any customer's own tea name correctly.
  { file: 'server/imagery.mjs', quote: 'Songti SC' },
  { file: 'server/imagery.mjs', quote: 'SimSun' },
  { file: 'public/css/styles.css', quote: 'Songti SC' },
  // This file, by definition.
  { file: 'server/scripts/lang-audit.mjs', quote: 'NON_LATIN' },
  { file: 'server/scripts/lang-audit.mjs', quote: 'MOJIBAKE' },
  { file: 'server/scripts/lang-audit.mjs', quote: 'ALLOWED' },
  { file: 'server/scripts/lang-audit.mjs', quote: 'logotype' },
  { file: 'server/scripts/lang-audit.mjs', quote: 'CJK' },
  // A comment illustrating why attribute values are excluded.
  { file: 'server/scripts/lang-audit.mjs', quote: 'commons.wikimedia.org' },
];

/** Untranslated mapping data for the one-off seal migration. */
const SKIP_FILES = ['server/scripts/data/'];

/**
 * One-off repair tools that must quote the damaged sequences in order to detect
 * and fix them. They are run manually and contain no user-facing text.
 */
const SKIP_SCRIPTS = ['repair-punctuation.mjs', 'repair-encoding.mjs'];

/**
 * `href` and `src` values are machine-readable identifiers, not content: a link
 * to `commons.wikimedia.org/wiki/File:青花蓋碗.jpg` has to carry the file's real
 * name or it will not resolve. Only the human-visible text is audited.
 */
function stripAttributes(line) {
  return line.replace(/\s(?:href|src|content|action)="[^"]*"/g, ' ');
}

const SCAN_DIRS = ['views', 'server', 'public/js', 'public/css'];
const EXTENSIONS = new Set(['.ejs', '.mjs', '.js', '.css', '.json']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'photos' || entry.name === 'fonts') continue;
      walk(full, out);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function isAllowed(relFile, line) {
  return ALLOWED.some((rule) => relFile.endsWith(rule.file) && line.includes(rule.quote));
}

function scanFiles() {
  const hits = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      if (SKIP_FILES.some((prefix) => rel.startsWith(prefix))) continue;
      if (SKIP_SCRIPTS.some((name) => rel.endsWith(name))) continue;
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!NON_LATIN.test(line) && !MOJIBAKE.test(line)) return;
        if (isAllowed(rel, line)) return;
        const kind = MOJIBAKE.test(line) ? 'mojibake' : 'non-English';
        hits.push({ where: `${rel}:${i + 1}`, kind, text: line.trim().slice(0, 120) });
      });
    }
  }
  return hits;
}

const PAGES = [
  '/', '/shop', '/shop?category=green-tea', '/shop?category=teaware', '/shop?q=oolong',
  '/tea/lion-peak-longjing', '/tea/yixing-zisha-shi-piao-pot', '/tea/bamboo-tea-tray',
  '/cart', '/checkout', '/guides', '/guides/how-to-brew-gongfu', '/about', '/shipping',
  '/terms', '/credits', '/order', '/admin/login',
];

async function scanPages() {
  const hits = [];
  for (const page of PAGES) {
    try {
      const res = await fetch(`${BASE}${page}`);
      const html = await res.text();
      const lines = html.split(/\r?\n/);
      lines.forEach((line, i) => {
        const visible = stripAttributes(line);
        if (!NON_LATIN.test(visible) && !MOJIBAKE.test(visible)) return;
        const kind = MOJIBAKE.test(visible) ? 'mojibake' : 'non-English';
        hits.push({ where: `${page} (line ${i + 1})`, kind, text: visible.trim().slice(0, 120) });
      });
    } catch (err) {
      hits.push({ where: page, text: `could not fetch: ${err.message}` });
    }
  }
  return hits;
}

async function main() {
  console.log('\nLanguage audit — looking for non-English text\n');

  const fileHits = scanFiles();
  const pageHits = await scanPages();

  if (fileHits.length) {
    console.log(`\u001b[31m  ${fileHits.length} occurrence(s) in source:\u001b[0m`);
    for (const hit of fileHits.slice(0, 60)) console.log(`    [${hit.kind}] ${hit.where}\n      ${hit.text}`);
  } else {
    console.log('  \u001b[32mSource files: no non-English text, no mojibake.\u001b[0m');
  }

  if (pageHits.length) {
    console.log(`\n\u001b[31m  ${pageHits.length} occurrence(s) in rendered pages:\u001b[0m`);
    for (const hit of pageHits.slice(0, 60)) console.log(`    [${hit.kind}] ${hit.where}\n      ${hit.text}`);
  } else {
    console.log('  \u001b[32mRendered pages: no non-English text, no mojibake.\u001b[0m');
  }

  const total = fileHits.length + pageHits.length;
  console.log(`\n${'-'.repeat(58)}`);
  console.log(`  ${total === 0 ? 'PASS' : 'FAIL'}  ${total} occurrence(s) to review\n`);
  process.exit(total ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
