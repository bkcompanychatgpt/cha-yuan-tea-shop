/**
 * Assert that grading a colour photograph still produces a colour photograph.
 *
 * This exists because it did not, for a hundred and thirteen products, and
 * nothing in the suite noticed. The importer carried its own copy of the house
 * grade written with `sharp().tint()`, and tint replaces chroma rather than
 * casting a colour — so an "Imperial Green" bangle shipped with no green in it
 * and 22k gold read as pewter. Every other check passed: the files were there,
 * they were the right size, they resolved, they were not duplicates, and the
 * contact sheet that was reviewed was built from the *source* files rather than
 * from the graded output.
 *
 * So this tests the one property that was lost, on a synthetic image whose
 * colour is known, through the same function the real import uses.
 *
 *   node server/scripts/check-grade.mjs
 */
import sharp from 'sharp';
import { gradeResize, colourSpread, GRADES } from './lib/grade.mjs';

let pass = 0;
let fail = 0;

function check(ok, label, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  \u001b[32mPASS\u001b[0m  ${label}${detail ? `  — ${detail}` : ''}`);
  } else {
    fail += 1;
    console.log(`  \u001b[31mFAIL\u001b[0m  ${label}${detail ? `  — ${detail}` : ''}`);
  }
}

/**
 * A strongly coloured test card: saturated crimson, warm gold and a deep green,
 * which is roughly the palette the shop actually sells.
 */
async function colourfulCard() {
  const svg = `<svg width="900" height="600">
    <rect width="900" height="600" fill="#b3251b"/>
    <circle cx="300" cy="300" r="170" fill="#e0a83a"/>
    <rect x="560" y="120" width="260" height="360" rx="24" fill="#1d6b3a"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** A genuinely neutral card, to prove the check is capable of failing. */
async function greyCard() {
  const svg = `<svg width="900" height="600">
    <rect width="900" height="600" fill="#808080"/>
    <circle cx="450" cy="300" r="180" fill="#b8b8b8"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

console.log('\nHouse grade — colour preservation\n');

const colour = await colourfulCard();
const beforeSpread = await colourSpread(colour);
check(beforeSpread > 25, 'the test card is strongly coloured to begin with', `spread ${beforeSpread.toFixed(1)}`);

/*
 * Every grade the shop uses, not just `product`: the bug was in a copy of the
 * code, and the way it happens again is somebody adding a fifth grade.
 */
for (const name of Object.keys(GRADES)) {
  const out = await gradeResize(colour, 600, 600, name).toBuffer();
  const after = await colourSpread(out);
  const kept = after / beforeSpread;
  // A grade desaturates by design — `saturation: 0.8` on the hero. A third of
  // the original spread is a generous floor; the tint bug left 8%.
  check(
    kept > 0.33,
    `the "${name}" grade keeps the colour`,
    `spread ${beforeSpread.toFixed(1)} → ${after.toFixed(1)} (${Math.round(kept * 100)}% kept)`,
  );
}

/*
 * The check has to be able to fail, or it proves nothing.
 *
 * A neutral source comes out at a small but non-zero spread, because the grade
 * composites a translucent ink-green wash over everything — that is a colour
 * cast, and it is meant to be there. The tint bug produced this same range from
 * a saturated source, which is exactly why the two assertions sit either side of
 * it: neutral stays under 12, colour stays over 33% of its original.
 */
const grey = await greyCard();
const greyOut = await gradeResize(grey, 600, 600, 'product').toBuffer();
const greySpread = await colourSpread(greyOut);
check(
  greySpread < 12,
  'a neutral image stays neutral, so the assertion above is not vacuous',
  `spread ${greySpread.toFixed(2)}`,
);

console.log(`\n  ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
