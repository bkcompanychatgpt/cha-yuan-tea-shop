/**
 * Report the intrinsic geometry of each downloaded brand mark, so the CSS can
 * be checked against reality instead of guessed at. An SVG with neither a
 * viewBox nor width/height attributes cannot be scaled by `height` in CSS, and
 * that would show up as a broken or oversized mark at checkout.
 *
 *   node server/scripts/check-badges.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, '..', '..', 'public', 'img', 'badge');

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return m ? m[1].trim() : null;
}

const files = (await readdir(DIR)).filter((f) => f.endsWith('.svg')).sort();
let problems = 0;

console.log('Brand mark geometry\n');
for (const file of files) {
  const svg = await readFile(path.join(DIR, file), 'utf8');
  const open = svg.match(/<svg[\s\S]*?>/i)?.[0] || '';
  const vb = attr(open, 'viewBox');
  const w = attr(open, 'width');
  const h = attr(open, 'height');
  let ratio = null;
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number).filter((n) => !Number.isNaN(n));
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) ratio = parts[2] / parts[3];
  } else if (w && h) {
    const wn = parseFloat(w);
    const hn = parseFloat(h);
    if (wn > 0 && hn > 0) ratio = wn / hn;
  }

  const ok = ratio !== null;
  if (!ok) problems += 1;
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${file.padEnd(14)} viewBox=${(vb || '—').padEnd(24)} ` +
    `w=${(w || '—').padEnd(9)} h=${(h || '—').padEnd(8)} ratio=${ratio ? ratio.toFixed(2) : 'n/a'}`,
  );
}

console.log(`\n  ${files.length - problems}/${files.length} marks scalable by CSS height`);
if (problems) {
  console.log('  A mark without a viewBox or width/height pair cannot be sized by `height` alone.');
  process.exitCode = 1;
}
