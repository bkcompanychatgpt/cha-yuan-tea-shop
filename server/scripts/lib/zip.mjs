/**
 * Minimal ZIP reader.
 *
 * Node has no built-in unzip, and the alternative — shelling out to
 * Expand-Archive or unzip — brings a platform dependency and a subprocess into a
 * step that should just work. A ZIP produced by any ordinary tool is a
 * well-defined structure: an end-of-central-directory record, a central
 * directory of entries, and a local header per entry followed by its data.
 * Reading that is about a hundred lines, and `node:zlib` already does the
 * inflation.
 *
 * Only what the importer needs: list the entries, read one by name. Handles the
 * two compression methods any real archiver emits for this material — stored (0)
 * and deflate (8) — and refuses the rest rather than producing rubbish.
 */
import zlib from 'node:zlib';

const EOCD_SIG = 0x06054b50;
const CDIR_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

/** Find the end-of-central-directory record, scanning back over any comment. */
function findEocd(buf) {
  const min = Math.max(0, buf.length - 66000);
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}

/**
 * List the entries in a zip buffer.
 *
 * @returns {Array<{name:string, method:number, compressedSize:number,
 *                  size:number, offset:number, isDirectory:boolean}>}
 */
export function listEntries(buf) {
  const eocd = findEocd(buf);
  if (eocd < 0) throw new Error('not a zip file (no end-of-central-directory record)');

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  const entries = [];
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(p) !== CDIR_SIG) throw new Error(`bad central directory entry at ${p}`);
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    entries.push({
      name,
      method,
      compressedSize,
      size,
      offset,
      isDirectory: name.endsWith('/'),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Read and decompress one entry. */
export function readEntry(buf, entry) {
  if (buf.readUInt32LE(entry.offset) !== LOCAL_SIG) {
    throw new Error(`bad local header for ${entry.name}`);
  }
  const nameLen = buf.readUInt16LE(entry.offset + 26);
  const extraLen = buf.readUInt16LE(entry.offset + 28);
  const start = entry.offset + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + entry.compressedSize);

  if (entry.method === 0) return Buffer.from(raw);
  if (entry.method === 8) return zlib.inflateRawSync(raw);
  throw new Error(`unsupported compression method ${entry.method} for ${entry.name}`);
}

/**
 * Extract every file entry to `dir`, keeping only the base name.
 *
 * Deliberately flat: an archiver may hand back `images/foo.jpg` or `foo.jpg`
 * depending on how the folder was zipped, and the importer matches on the file
 * name alone. Nested paths would otherwise silently import nothing.
 *
 * @returns {{written: string[], skipped: string[]}}
 */
export function extractFlat(buf, dir, { fs, path }) {
  const written = [];
  const skipped = [];
  for (const entry of listEntries(buf)) {
    if (entry.isDirectory) continue;
    const base = path.basename(entry.name.replace(/\\/g, '/'));
    // Skip the metadata files macOS adds to every archive.
    if (!base || base.startsWith('._') || base === '.DS_Store') {
      skipped.push(entry.name);
      continue;
    }
    if (!/\.(jpe?g|png|webp)$/i.test(base)) {
      skipped.push(entry.name);
      continue;
    }
    fs.writeFileSync(path.join(dir, base), readEntry(buf, entry));
    written.push(base);
  }
  return { written, skipped };
}
