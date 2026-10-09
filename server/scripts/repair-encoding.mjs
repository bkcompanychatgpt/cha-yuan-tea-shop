/**
 * Repair files that a PowerShell `Set-Content -Encoding utf8` round-trip
 * double-encoded, and strip the UTF-8 BOM it adds.
 *
 * PowerShell's `utf8` encoding writes a BOM and, when re-reading a UTF-8 file
 * that already had one, can mangle multi-byte characters. This reverses the
 * damage: read as UTF-8, reinterpret the characters as Latin-1 bytes, decode
 * those as UTF-8, write back without a BOM.
 *
 *   node server/scripts/repair-encoding.mjs <file> [file...]
 *   node server/scripts/repair-encoding.mjs --check <file> [file...]
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const files = args.filter((a) => !a.startsWith('--'));

if (!files.length) {
  console.error('usage: node server/scripts/repair-encoding.mjs [--check] <file> [file...]');
  process.exit(1);
}

const MOJIBAKE = /[ÃÂ][\u0080-\u00ff]|â€|â€™|ï»¿/;

let repaired = 0;

for (const file of files) {
  const abs = path.resolve(file);
  const raw = fs.readFileSync(abs);
  const hadBom = raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  const text = (hadBom ? raw.subarray(3) : raw).toString('utf8');

  const brokenBefore = (text.match(MOJIBAKE) || []).length;
  const replacementsBefore = (text.match(/\uFFFD/g) || []).length;

  // Reverse the double-encoding only if it actually helps.
  let candidate = text;
  if (brokenBefore > 0) {
    try {
      const reversed = Buffer.from(text, 'latin1').toString('utf8');
      const brokenAfter = (reversed.match(MOJIBAKE) || []).length;
      if (brokenAfter < brokenBefore && !reversed.includes('\uFFFD')) candidate = reversed;
    } catch {
      /* keep the original */
    }
  }

  const changed = candidate !== text || hadBom;
  const status = replacementsBefore
    ? `${replacementsBefore} unrepairable character(s) (need manual fix)`
    : changed
      ? 'repaired'
      : 'unchanged';

  if (changed && !checkOnly) {
    fs.writeFileSync(abs, Buffer.from(candidate, 'utf8'));
    repaired += 1;
  }

  console.log(`${path.basename(file)}: bom=${hadBom} mojibake=${brokenBefore} -> ${status}`);
}

console.log(`\n${checkOnly ? 'checked' : `${repaired} file(s) rewritten`}`);
process.exit(0);
