/** Probe the Openverse API to see what it returns for our query shapes. */
const UA = 'ChaYuanTeaShopAssetSourcing/1.0 (dev@chayuan.test)';

const urls = [
  'https://api.openverse.org/v1/images/?q=jade+bracelet&page=1&page_size=5',
  'https://api.openverse.org/v1/images/?q=jade+bracelet&page=1&page_size=5&license_type=commercial&size=large',
  'https://api.openverse.org/v1/images/?q=jade+bracelet&page_size=5&license_type=commercial',
];

for (const u of urls) {
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    const text = await res.text();
    let n = 'n/a';
    try {
      const j = JSON.parse(text);
      n = j.result_count ?? (j.results ? j.results.length : 'no results field');
      if (j.detail) n = `detail: ${j.detail}`;
    } catch { /* not json */ }
    console.log(`${res.status}  count=${n}  ${u}`);
    if (res.status !== 200) console.log('   body:', text.slice(0, 200));
  } catch (err) {
    console.log(`ERR ${err.message}  ${u}`);
  }
}
