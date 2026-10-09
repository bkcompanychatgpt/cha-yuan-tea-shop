/**
 * Splice server/data-jade.mjs into catalog-data.mjs.
 *
 * The jade and jewellery entries live in their own module so they can be read and
 * edited without scrolling past fifty teas, and this merges them into the main
 * PRODUCTS array between two markers.
 *
 * Idempotent: running it twice replaces the block rather than appending again.
 *
 *   node server/scripts/merge-jade.mjs
 *   node server/scripts/merge-jade.mjs --check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JADE_PRODUCTS } from '../data-jade.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const TARGET = path.join(ROOT, 'server', 'catalog-data.mjs');

const START = '/* ===== BEGIN jade & jewellery (generated from server/data-jade.mjs) ===== */';
const END = '/* ===== END jade & jewellery ===== */';

const checkOnly = process.argv.includes('--check');

/**
 * Render a JavaScript string literal.
 *
 * Newlines in the source data are paragraph breaks inside a single value, so they
 * must become `\n` escapes. Emitting them raw ends the literal and breaks the
 * file — which is exactly what happened the first time this ran.
 */
function jsString(value) {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
  return `'${escaped}'`;
}

/** Render one value as a readable literal, matching the file's style. */
function renderValue(value, indent) {
  const pad = ' '.repeat(indent);
  const inner = ' '.repeat(Math.max(0, indent - 2));

  if (Array.isArray(value)) {
    const allSimple = value.every((v) => typeof v === 'string' || typeof v === 'number');
    if (allSimple) {
      const line = value.map((v) => (typeof v === 'string' ? jsString(v) : v)).join(', ');
      if (line.length <= 96) return `[${line}]`;
      return `[\n${value.map((v) => `${pad}${typeof v === 'string' ? jsString(v) : v}`).join(',\n')}\n${inner}]`;
    }
    return `[\n${value.map((v) => `${pad}${renderValue(v, indent + 2)}`).join(',\n')}\n${inner}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    return `{\n${entries.map(([k, v]) => `${pad}${k}: ${renderValue(v, indent + 2)}`).join(',\n')}\n${inner}}`;
  }

  if (typeof value === 'string') return jsString(value);
  return String(value);
}

function renderProduct(p) {
  const lines = ['  {'];
  for (const [key, value] of Object.entries(p)) {
    const rendered = renderValue(value, 4);
    // Multi-line values get the key on its own line for readability.
    if (rendered.includes('\n')) lines.push(`    ${key}: ${rendered},`);
    else lines.push(`    ${key}: ${rendered},`);
  }
  lines.push('  },');
  return lines.join('\n');
}

const block = [START, ...JADE_PRODUCTS.map(renderProduct), END].join('\n');

let text = fs.readFileSync(TARGET, 'utf8');

const startIndex = text.indexOf(START);
const endIndex = text.indexOf(END);

let next;
if (startIndex !== -1 && endIndex !== -1) {
  next = text.slice(0, startIndex) + block + text.slice(endIndex + END.length);
} else {
  // First run: insert just before the end of the PRODUCTS array. That closing
  // bracket is the last `];` before the EDITORIAL declaration.
  const editorialIndex = text.indexOf('/** Short editorial copy');
  if (editorialIndex === -1) throw new Error('could not find the EDITORIAL marker in catalog-data.mjs');
  const arrayEnd = text.lastIndexOf('];', editorialIndex);
  if (arrayEnd === -1) throw new Error('could not find the end of the PRODUCTS array');

  // Whatever currently ends the array is the *superseded* jade/jewellery draft,
  // written before the available photography had been inventoried. It is removed
  // from here so the two sets cannot both exist.
  const before = text.slice(0, arrayEnd);
  const supersededStart = before.lastIndexOf('/* ------------------------------------------------------------- JADE & STONE */');
  const tail = supersededStart === -1 ? before : before.slice(0, supersededStart).replace(/\s+$/, '\n\n');

  const dropped = supersededStart === -1 ? 0 : text
    .slice(supersededStart, arrayEnd)
    .split('\n')
    .filter((l) => /^\s+slug: '/.test(l)).length;

  next = `${tail}${block}\n${text.slice(arrayEnd)}`;
  if (dropped) console.log(`  dropping ${dropped} superseded jade/jewellery product(s)`);
}

const added = JADE_PRODUCTS.length;
if (checkOnly) {
  console.log(`${startIndex === -1 ? 'would insert' : 'would replace'} ${added} product(s)`);
  process.exit(0);
}

fs.writeFileSync(TARGET, Buffer.from(next, 'utf8'));
console.log(`${startIndex === -1 ? 'Inserted' : 'Replaced'} ${added} jade & jewellery product(s) in catalog-data.mjs`);
