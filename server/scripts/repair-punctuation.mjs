/**
 * Repair mojibake in the template files.
 *
 * A PowerShell `Set-Content -Encoding utf8` round-trip decoded UTF-8 punctuation
 * through a legacy code page, so an em dash became the three characters "â€”".
 * The bytes are gone, but the original character is identifiable from the
 * sequence, and it is replaced here with an HTML entity — which also keeps the
 * templates pure ASCII so no tool can mangle them again.
 *
 *   node server/scripts/repair-punctuation.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const checkOnly = process.argv.includes('--check');

/**
 * Damaged sequence -> HTML entity.
 * Ordered longest-first so "â€œ" is not eaten by a shorter rule.
 */
const REPAIRS = [
  ['â€“', '&ndash;'], // en dash
  ['â€”', '&mdash;'], // em dash
  ['â€œ', '&ldquo;'], // left double quote
  ['â€\u009d', '&rdquo;'], // right double quote (rare form)
  ['â€', '&rdquo;'], // right double quote
  ['â€™', '&rsquo;'], // right single quote
  ['â€˜', '&lsquo;'], // left single quote
  ['â€¦', '&hellip;'], // ellipsis
  ['â†’', '&rarr;'], // right arrow
  ['â† ', '&rarr;'], // right arrow, space-terminated variant
  ['â‚¬', '&euro;'], // euro sign
  ['Â·', '&middot;'], // middle dot
  ['Â ', '&nbsp;'], // non-breaking space
  ['Ã©', '&eacute;'], // e acute
  ['Ã¨', '&egrave;'], // e grave
  ['Ã ', '&agrave;'], // a grave
];

const TARGETS = ['views', 'server', 'public/js', 'public/css'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'data', 'fonts', 'photos'].includes(entry.name)) continue;
      walk(full, out);
    } else if (/\.(ejs|mjs|js|css|json)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

let filesChanged = 0;
let totalRepairs = 0;

for (const dir of TARGETS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    // The detector in this script and the encoding checker quote the sequences
    // on purpose; leave them alone.
    if (rel.endsWith('repair-punctuation.mjs') || rel.endsWith('repair-encoding.mjs')) continue;

    let text = fs.readFileSync(file, 'utf8');
    const before = text.length;
    let hits = 0;

    for (const [broken, entity] of REPAIRS) {
      const parts = text.split(broken);
      if (parts.length > 1) {
        hits += parts.length - 1;
        text = parts.join(entity);
      }
    }

    if (!hits) continue;
    filesChanged += 1;
    totalRepairs += hits;

    if (checkOnly) {
      console.log(`${rel}: ${hits} sequence(s) would be repaired`);
    } else {
      fs.writeFileSync(file, Buffer.from(text, 'utf8'));
      console.log(`${rel}: ${hits} sequence(s) repaired (${before} -> ${text.length} chars)`);
    }
  }
}

console.log(`\n${checkOnly ? 'would repair' : 'repaired'} ${totalRepairs} sequence(s) in ${filesChanged} file(s)`);
