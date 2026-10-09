/**
 * Print the category tiles a page renders, in grid order.
 *
 *   node server/scripts/list-tiles.mjs [path] [baseUrl]
 *
 * The category grid is fixed to four columns with the first tile spanning two of
 * them, so it only reads well at an exact tile count. This makes that count
 * visible instead of something you have to squint at a screenshot to check.
 */
const path = process.argv[2] || '/';
const BASE = (process.argv[3] || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const html = await (await fetch(`${BASE}${path}`)).text();

if (html.includes('Something went wrong')) {
  console.error(`${path} rendered the error page`);
  process.exit(1);
}

const tiles = [...html.matchAll(/class="cat-tile([^"]*)"[^>]*href="([^"]*)"/g)].map((m) => ({
  featured: m[1].includes('featured'),
  href: m[2],
}));

const featured = tiles.filter((t) => t.featured).length;
const small = tiles.length - featured;
const rows = Math.ceil(tiles.length / 4);

console.log(`\n${path} — ${tiles.length} tile(s): ${featured} featured (2x2) + ${small} standard`);
console.log(`  grid: 4 columns, ${rows} row(s), fills to ${rows * 4} slots`);

if (tiles.length % 4 !== 0 || featured !== 1) {
  console.log(`  \u001b[31mWARNING\u001b[0m  an exact fill needs 1 featured + 7 standard (8 tiles)`);
} else {
  console.log('  \u001b[32mexact fit\u001b[0m');
}

for (const tile of tiles) {
  const label = decodeURIComponent(tile.href.split('category=')[1] || tile.href);
  console.log(`    ${tile.featured ? '[2x2]' : '[   ]'}  ${label}`);
}
console.log('');
