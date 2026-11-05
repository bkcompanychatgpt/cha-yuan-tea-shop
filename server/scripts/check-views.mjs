/**
 * Compile every template, without rendering it.
 *
 * A broken EJS tag is the worst kind of bug this site can ship, because it does
 * not fail at build time and it does not fail at boot: it fails when a customer
 * loads that one page, and the page they get is the error page with HTTP 500.
 * The smoke test does catch it, but only as "GET / returns 500" — it took a look
 * at the server log to find out that the cause was a single `%}` where a `%>`
 * belonged, inside a comment about a removed ticker bar.
 *
 * This compiles each template in isolation and reports the file and the message,
 * which turns that hunt into one line of output. It costs a few milliseconds and
 * needs no server.
 *
 *   node server/scripts/check-views.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DIRS = ['views', 'views/partials'];

let pass = 0;
const failures = [];

console.log('\nEJS templates\n');

for (const dir of DIRS) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  for (const name of fs.readdirSync(full).sort()) {
    if (!name.endsWith('.ejs')) continue;
    const file = path.join(full, name);
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    try {
      // `compile` parses and generates source; it does not need the locals a
      // render would, which is why this works without a database or a request.
      ejs.compile(fs.readFileSync(file, 'utf8'), { filename: file, client: false });
      pass += 1;
      console.log(`  \u001b[32mPASS\u001b[0m  ${rel}`);
    } catch (err) {
      failures.push({ rel, message: err.message.split('\n')[0] });
      console.log(`  \u001b[31mFAIL\u001b[0m  ${rel} — ${err.message.split('\n')[0]}`);
    }
  }
}

console.log(`\n  ${pass} compiled, ${failures.length} failed\n`);
if (failures.length) process.exitCode = 1;
