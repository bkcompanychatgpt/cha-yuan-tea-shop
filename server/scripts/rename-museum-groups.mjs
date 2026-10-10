/**
 * Rename the museum index groups so they cannot collide.
 *
 * sheet-picks.mjs loads the first index that defines a group and skips the rest,
 * and the museum fetch used the plain names `jade` and `jewellery` — which the
 * Commons index already defines. Every museum lookup therefore resolved to a
 * Commons tile instead. Prefixing the groups fixes the lookup for good.
 */
import fs from 'node:fs';

const p = 'data/photos/museum-index.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const renamed = {};
for (const [k, v] of Object.entries(j.groups)) renamed[`museum-${k}`] = v;
j.groups = renamed;
fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`, 'utf8');
console.log('groups:', Object.keys(renamed).join(', '));
console.log('counts:', Object.values(renamed).map((v) => v.length).join(', '));
