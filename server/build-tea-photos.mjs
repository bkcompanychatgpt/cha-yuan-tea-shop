/**
 * Assign photographs to the generated tea lots.
 *
 * Two rules, and both are the owner's:
 *
 *   1. Every product has an image.
 *   2. No image is used by two products.
 *
 * The second is the hard one, so it is enforced rather than intended: a single
 * `used` set is seeded with every tile the hand-written catalogue already claims,
 * and every assignment strikes its picks out of the pools. If a pool runs dry
 * the builder reports it instead of quietly reusing a photograph, because a
 * silent reuse is exactly the bug this exists to prevent.
 *
 * Picks are grouped per base tea so the lots of one tea are photographed with the
 * same kind of leaf, which is what keeps a Yuqian Longjing looking like Longjing
 * rather than like whatever tile happened to be free.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_POOL, TEA_POOLS, REJECTED_TILES } from './photo-pools.mjs';
import { lotSlug } from './build-lots.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const INDEX_FILES = ['sheets-index.json', 'targeted-index.json', 'openverse-index.json'];

/** Every `group#n` that actually exists, so a typo fails loudly. */
export function knownPicks() {
  const known = new Set();
  for (const file of INDEX_FILES) {
    const p = path.join(ROOT, 'data', 'photos', file);
    if (!fs.existsSync(p)) continue;
    const idx = JSON.parse(fs.readFileSync(p, 'utf8'));
    const groups = idx.groups || idx;
    for (const [group, value] of Object.entries(groups)) {
      const arr = Array.isArray(value) ? value : Object.values(value);
      for (const e of arr) {
        // An index can carry a null slot where a download failed; skip it rather
        // than crashing on the whole catalogue.
        if (!e) continue;
        const n = e.n ?? e.tile;
        if (n === undefined || n === null) continue;
        known.add(`${group}#${n}`);
      }
    }
  }
  return known;
}

/**
 * Check the pools reference real tiles and no tile appears twice in one pool.
 * Returns a list of problems rather than throwing, so a caller can print them.
 */
export function validatePools() {
  const known = knownPicks();
  const problems = [];
  for (const [pool, picks] of Object.entries(TEA_POOLS)) {
    const seen = new Set();
    for (const pick of picks) {
      if (!known.has(pick)) problems.push(`${pool}: "${pick}" is not a tile in any index`);
      if (seen.has(pick)) problems.push(`${pool}: "${pick}" listed twice`);
      seen.add(pick);
    }
  }
  for (const [base, pool] of Object.entries(BASE_POOL)) {
    if (!TEA_POOLS[pool]) problems.push(`base tea "${base}" points at unknown pool "${pool}"`);
  }
  return problems;
}

/**
 * Build the photo assignment for every generated tea lot.
 *
 * @param {Array} products     the full catalogue, so the base teas can be found
 * @param {Array} lotRows      the rows from data-lots.mjs
 * @param {object} takenBySlug tiles already claimed by the hand-written entries
 * @returns {{photos: object, problems: string[], stats: object}}
 */
export function buildTeaPhotos(products, lotRows, takenBySlug = {}) {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const problems = [];

  // Every tile the hand-written catalogue already uses is off the table.
  const used = new Set();
  for (const entry of Object.values(takenBySlug)) {
    for (const pick of entry?.picks || []) used.add(pick);
  }

  const cursors = Object.fromEntries(Object.keys(TEA_POOLS).map((k) => [k, 0]));

  /** Take the next `want` unused tiles from a pool. */
  const draw = (pool, want) => {
    const picks = TEA_POOLS[pool] || [];
    const out = [];
    while (out.length < want && cursors[pool] < picks.length) {
      const pick = picks[cursors[pool]];
      cursors[pool] += 1;
      if (used.has(pick)) continue;
      // Rejected after review: a tile that reads as the wrong product at card
      // size. Skipped rather than deleted from the pool, so the reason stays
      // recorded next to the tile number.
      if (REJECTED_TILES.has(pick)) continue;
      used.add(pick);
      out.push(pick);
    }
    return out;
  };

  // Base teas first, so each tea's own product gets the pool's best photograph
  // and its lots take the next ones.
  const lotsByBase = new Map();
  for (const row of lotRows) {
    if (!lotsByBase.has(row.base)) lotsByBase.set(row.base, []);
    lotsByBase.get(row.base).push(row);
  }

  const photos = {};
  const perBase = [];
  const warnings = [];

  for (const [baseSlug, rows] of lotsByBase) {
    const pool = BASE_POOL[baseSlug];
    const base = bySlug.get(baseSlug);
    if (!pool) { problems.push(`no photo pool mapped for base tea "${baseSlug}"`); continue; }
    if (!base) { problems.push(`lot rows reference unknown base tea "${baseSlug}"`); continue; }

    // The base tea keeps the photographs it was hand-assigned; its lots take the
    // next unused tiles from the same pool. If the base tea has no assignment of
    // its own it is drawing from the pool too, so it takes the first pair.
    const baseHasOwn = Boolean(takenBySlug[baseSlug]);
    if (!baseHasOwn) {
      const picks = draw(pool, 2);
      if (!picks.length) problems.push(`${pool} has no photographs left for base tea "${baseSlug}"`);
      else if (picks.length < 2) warnings.push(`${pool}: base tea "${baseSlug}" has only one photograph`);
      photos[baseSlug] = { picks, grade: 'product', pool };
    }

    const assigned = [];
    for (const row of rows) {
      const picks = draw(pool, 2);
      /*
       * A pool running dry is reported but not fatal.
       *
       * Every product must have at least one photograph, and that is enforced.
       * Insisting on two would mean topping the pool up with tiles nobody has
       * looked at, which is how wrong photographs get in — a pile of dried
       * chillies passed a "floral tea" check and landed on a chrysanthemum
       * listing. A product with a single good photograph and no hover image is
       * the better trade.
       */
      if (!picks.length) {
        problems.push(`${pool} has no photographs left for "${row.name}"`);
      } else if (picks.length < 2) {
        warnings.push(`${pool}: "${row.name}" has only one photograph, so no hover image`);
      }
      // Keyed by the slug the catalogue will actually give this lot.
      const slug = lotSlug(row);
      photos[slug] = { picks, grade: 'product', pool };
      assigned.push({ slug, picks });
    }
    perBase.push({
      base: baseSlug,
      pool,
      count: assigned.length + (baseHasOwn ? 1 : 1),
      left: (TEA_POOLS[pool] || []).length - cursors[pool],
    });
  }

  const stats = {
    lots: Object.keys(photos).length,
    perBase,
    warnings,
    poolsUsed: Object.fromEntries(Object.entries(cursors).filter(([, n]) => n > 0)),
  };

  return { photos, problems, stats };
}
