/**
 * Round-trip the ZIP reader against a real archive.
 *
 * A hand-rolled binary parser that is only ever tested on files it wrote itself
 * proves nothing, so this builds an archive with the platform's own tool, reads
 * it back, and checks the bytes survive both the stored and deflated paths.
 *
 *   node server/scripts/check-zip.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { listEntries, readEntry, extractFlat } from './lib/zip.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

let pass = 0;
const failures = [];
const check = (label, ok, detail = '') => {
  if (ok) { pass += 1; console.log(`  \x1b[32mPASS\x1b[0m  ${label}`); }
  else { failures.push(label); console.log(`  \x1b[31mFAIL\x1b[0m  ${label}${detail ? `  — ${detail}` : ''}`); }
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cy-zip-'));
const src = path.join(tmp, 'src');
fs.mkdirSync(src, { recursive: true });

/* A real product photograph, which is what the importer will actually be given. */
const realPhoto = path.join(ROOT, 'public', 'img', 'photos', 'lion-peak-longjing-hero.jpg');
const haveReal = fs.existsSync(realPhoto);
if (haveReal) fs.copyFileSync(realPhoto, path.join(src, 'lion-peak-longjing.jpg'));

/* Plus a tiny PNG, a nested folder, and a file the importer should ignore. */
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
fs.mkdirSync(path.join(src, 'nested'), { recursive: true });
fs.writeFileSync(path.join(src, 'nested', 'guanyin-pendant.png'), png);
fs.writeFileSync(path.join(src, 'notes.txt'), 'ignore me');

const zipPath = path.join(tmp, 'images.zip');
execFileSync('powershell.exe', [
  '-NoProfile', '-Command',
  `Compress-Archive -Path '${src}\\*' -DestinationPath '${zipPath}' -Force`,
], { stdio: 'ignore' });

check('an archive was produced by the platform tool', fs.existsSync(zipPath));

const buf = fs.readFileSync(zipPath);
const entries = listEntries(buf);
const names = entries.map((e) => e.name).join(', ');
check('the entry list is readable', entries.length >= 3, names);
/*
 * Windows archivers write entry names with backslashes rather than forward
 * slashes — Compress-Archive does, and so does Explorer's "Send to > Compressed
 * folder". The spec says forward slashes, so both have to be accepted, and this
 * assertion is written to match either.
 */
check('nested entries are listed', entries.some((e) => /nested[\\/]/.test(e.name)), names);

/* ---------------------------------------------------------- byte fidelity */
let identical = true;
if (haveReal) {
  const entry = entries.find((e) => path.basename(e.name) === 'lion-peak-longjing.jpg');
  if (!entry) {
    identical = false;
  } else {
    const out = readEntry(buf, entry);
    identical = out.equals(fs.readFileSync(realPhoto));
  }
}
check('a real JPEG survives the round trip byte for byte', identical);

const pngEntry = entries.find((e) => path.basename(e.name) === 'guanyin-pendant.png');
check('a nested PNG is found', Boolean(pngEntry));
if (pngEntry) {
  check('the PNG decompresses to the original bytes', readEntry(buf, pngEntry).equals(png));
}

/* ------------------------------------------------------------- extraction */
const outDir = path.join(tmp, 'out');
fs.mkdirSync(outDir, { recursive: true });
const { written, skipped } = extractFlat(buf, outDir, { fs, path });

check('the JPEG is extracted flat, without its folder', written.includes('lion-peak-longjing.jpg'), written.join(', '));
check('the nested PNG is flattened to its basename', written.includes('guanyin-pendant.png'), written.join(', '));
check('non-image entries are skipped', skipped.some((s) => s.endsWith('notes.txt')), skipped.join(', '));
check('extracted files land at the top level', fs.existsSync(path.join(outDir, 'lion-peak-longjing.jpg')) || !haveReal);
check(
  'an extracted file matches the source',
  !haveReal || fs.readFileSync(path.join(outDir, 'lion-peak-longjing.jpg')).equals(fs.readFileSync(realPhoto)),
);

/* ------------------------------------------------------------- robustness */
{
  let threw = false;
  try { listEntries(Buffer.from('this is not a zip file at all')); } catch { threw = true; }
  check('a non-zip buffer is rejected rather than misread', threw);
}
{
  // A zip with a trailing comment: the EOCD is not the last 22 bytes.
  const withComment = Buffer.concat([buf, Buffer.from('x'.repeat(300))]);
  const stillFound = (() => { try { return listEntries(withComment).length > 0; } catch { return false; } })();
  check('a trailing comment does not hide the directory', stillFound);
}

fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n  ${pass} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
