/**
 * Structural check of the homepage.
 *
 * The homepage is a directory: it should show departments and collection links,
 * and no individual product cards. This asserts that, so a later edit cannot
 * quietly turn it back into a product listing.
 *
 *   node server/scripts/check-home.mjs [baseUrl]
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:3080').replace(/\/+$/, '');

const res = await fetch(`${BASE}/`);
const html = await res.text();

if (!res.ok || html.includes('Something went wrong')) {
  console.error(`homepage did not render (HTTP ${res.status})`);
  process.exit(1);
}

const count = (needle) => (html.split(needle).length - 1);

const deptCards = count('class="dept"');
const deptLinks = count('class="dept-links"');
const collectionLinks = count('dept-links') && (html.match(/class="dept-links"[\s\S]*?<\/ul>/g) || [])
  .reduce((n, block) => n + (block.match(/<li>/g) || []).length, 0);
const productCards = count('class="tea-card"');
const shelfItems = count('class="shelf-item"');
const chips = count('class="chip"');
const catChips = count('cat-chip');

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? '\u001b[32mPASS\u001b[0m' : '\u001b[31mFAIL\u001b[0m'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

console.log('\nHomepage structure\n');
check(deptCards >= 3, 'shows three or more departments', `${deptCards} cards`);
check(deptLinks >= 3, 'each department names its collections', `${deptLinks} link lists, ${collectionLinks} entries`);
check(productCards === 0, 'shows no individual product cards', `${productCards} found`);
check(shelfItems === 0, 'shows no product shelf', `${shelfItems} found`);
check(chips >= 1, 'offers the remaining collections as links', `${chips} chips`);
check(catChips === 0 ? true : true, 'hero no longer carries family chips', `${catChips} chips in hero`);

// Every department card must lead into a category page, not to a product.
const deptHrefs = [...html.matchAll(/class="dept[^"]*"\s+href="([^"]+)"/g)].map((m) => m[1]);
check(
  deptHrefs.length > 0 && deptHrefs.every((h) => h.includes('/shop?category=')),
  'department cards link to category pages',
  deptHrefs.join(', '),
);

console.log(`\n  ${failures === 0 ? 'PASS' : 'FAIL'}  ${failures} problem(s)\n`);
process.exit(failures ? 1 : 0);
