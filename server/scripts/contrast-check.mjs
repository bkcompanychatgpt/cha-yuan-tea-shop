/**
 * Contrast audit for the design palette.
 *
 * Checks every foreground/background pair the stylesheet actually uses against
 * WCAG AA (4.5:1 for body text, 3:1 for large text and UI borders). Run it after
 * any palette change.
 *
 *   node server/scripts/contrast-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSS = path.resolve(__dirname, '..', '..', 'public', 'css', 'styles.css');

/** Parse `--name: #hex;` declarations out of :root. */
function readTokens(css) {
  const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
  const tokens = {};
  for (const match of root.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

function toRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const css = fs.readFileSync(CSS, 'utf8');
const t = readTokens(css);

/** Each pair is [foreground, background, minimum ratio, description]. */
const checks = [
  ['text', 'ink-900', 4.5, 'body text on the page ground'],
  ['text', 'ink-800', 4.5, 'body text on raised surfaces'],
  ['text', 'ink-700', 4.5, 'body text on panels'],
  ['text-dim', 'ink-900', 4.5, 'secondary text on the page ground'],
  ['text-dim', 'ink-800', 4.5, 'secondary text on raised surfaces'],
  ['text-faint', 'ink-900', 3.0, 'tertiary/meta text (large or decorative)'],
  ['gold-100', 'ink-900', 4.5, 'gold-100 headings and links'],
  ['gold-200', 'ink-900', 4.5, 'gold-200 labels'],
  ['gold-300', 'ink-900', 4.5, 'gold-300 accents and eyebrow text'],
  ['gold-300', 'ink-800', 4.5, 'gold-300 accents on raised surfaces'],
  ['gold-400', 'ink-900', 3.0, 'gold-400 micro-labels'],
  ['ink-900', 'gold-300', 4.5, 'dark text on a gold button'],
  ['ink-900', 'gold-200', 4.5, 'dark text on the gold button gradient start'],
  ['ink-900', 'gold-100', 4.5, 'dark text on the gold button hover state'],
  ['success', 'ink-900', 3.0, 'success messages'],
  ['warn', 'ink-900', 3.0, 'warning messages'],
  ['danger', 'ink-900', 3.0, 'error messages'],
];

let pass = 0;
let fail = 0;

console.log('\nCha Yuan contrast audit (WCAG AA)\n');
for (const [fg, bg, min, label] of checks) {
  if (!t[fg] || !t[bg]) {
    console.log(`  \u001b[33mSKIP\u001b[0m  ${label} — token missing (${!t[fg] ? `--${fg}` : `--${bg}`})`);
    continue;
  }
  const ratio = contrast(t[fg], t[bg]);
  const ok = ratio >= min;
  const padded = ratio.toFixed(2).padStart(5);
  if (ok) {
    pass += 1;
    console.log(`  \u001b[32mPASS\u001b[0m  ${padded}:1  (min ${min})  ${label}`);
  } else {
    fail += 1;
    console.log(`  \u001b[31mFAIL\u001b[0m  ${padded}:1  (min ${min})  ${label}  [${t[fg]} on ${t[bg]}]`);
  }
}

console.log(`\n${'-'.repeat(58)}`);
console.log(`  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
