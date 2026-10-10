/**
 * Generative SVG artwork.
 *
 * Every product / category image on the store is produced here as a crafted
 * SVG: layered gradients, soft light, hand-tuned tea-leaf silhouettes and a
 * gaiwan (lidded cup) rendering. Serving generated SVGs keeps the project
 * self-contained — no external image host, no binary assets to ship — while
 * still giving each tea family its own distinct palette and composition.
 */

/** Palette per tea family. Each entry: background gradient + accent + leaf tones. */
export const FAMILY_PALETTE = {
  Green: { bg1: '#12301f', bg2: '#071a10', accent: '#d9b96b', leaf: '#4f8f5e', leaf2: '#2f6b41', liquor: '#c9d9a3' },
  White: { bg1: '#2b3529', bg2: '#131a13', accent: '#e8d9a8', leaf: '#8aa37e', leaf2: '#5d7357', liquor: '#efe6c8' },
  Yellow: { bg1: '#3a3018', bg2: '#1a1408', accent: '#f0cf72', leaf: '#b99a44', leaf2: '#8a6f2b', liquor: '#f2d98a' },
  Oolong: { bg1: '#20303a', bg2: '#0b161c', accent: '#dcc07a', leaf: '#5c8672', leaf2: '#37604f', liquor: '#e0b96a' },
  'Dan Cong': { bg1: '#2c2438', bg2: '#120d1b', accent: '#e0b96a', leaf: '#7a6d9a', leaf2: '#4c426b', liquor: '#e6b978' },
  'Rock Oolong': { bg1: '#2b2a33', bg2: '#121118', accent: '#d9c184', leaf: '#6f7d6a', leaf2: '#454f43', liquor: '#dcae62' },
  Black: { bg1: '#33190f', bg2: '#160806', accent: '#e0a86a', leaf: '#8a4a2c', leaf2: '#5e2f1c', liquor: '#c4562a' },
  'Pu-erh': { bg1: '#2a1d17', bg2: '#120b08', accent: '#c9a06a', leaf: '#6d4630', leaf2: '#452a1c', liquor: '#7a2f1c' },
  'Dark Tea': { bg1: '#241c1c', bg2: '#0f0a0a', accent: '#c69a6a', leaf: '#5a4038', leaf2: '#3a2823', liquor: '#8a3b22' },
  Floral: { bg1: '#2f2434', bg2: '#140f18', accent: '#ecc98f', leaf: '#9a7fa8', leaf2: '#6a5478', liquor: '#f0d3a6' },
  Teaware: { bg1: '#1d2624', bg2: '#0b100f', accent: '#d9c184', leaf: '#7f8f86', leaf2: '#4e5a54', liquor: '#cfd8d2' },
  Gift: { bg1: '#2a2318', bg2: '#100d07', accent: '#e6c98a', leaf: '#8d7a4c', leaf2: '#5d5030', liquor: '#e8d6a8' },
  // Jade: the ground is a deep nephrite green, the accent a pale celadon, so the
  // artwork sits alongside the tea families without looking like one of them.
  Jade: { bg1: '#12302a', bg2: '#061713', accent: '#bfe0cf', leaf: '#5f9e86', leaf2: '#356b59', liquor: '#d8ece0' },
  // Fine jewellery: warmer and brighter, built around gold and pearl.
  Jewellery: { bg1: '#2e2718', bg2: '#120e06', accent: '#f0d9a0', leaf: '#b09455', leaf2: '#77612f', liquor: '#f5e6c4' },
};

const DEFAULT_PALETTE = FAMILY_PALETTE.Green;

export function paletteFor(family) {
  return FAMILY_PALETTE[family] || DEFAULT_PALETTE;
}

/** Deterministic pseudo-random generator so artwork is stable across restarts. */
function rng(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A single tea leaf silhouette, drawn around the origin then transformed. */
function leaf({ x, y, scale = 1, rotate = 0, fill, opacity = 1, veinColor }) {
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate.toFixed(1)}) scale(${scale.toFixed(3)})" opacity="${opacity}">
    <path d="M0 0 C 22 -18, 58 -22, 88 0 C 58 22, 22 18, 0 0 Z" fill="${fill}"/>
    <path d="M4 0 L 82 0" stroke="${veinColor}" stroke-width="1.4" opacity="0.5" fill="none"/>
    <path d="M26 0 L 44 -9 M26 0 L 44 9 M48 0 L 64 -7 M48 0 L 64 7" stroke="${veinColor}" stroke-width="1" opacity="0.35" fill="none"/>
  </g>`;
}

/** Steam wisp above the cup. */
function steam(x, y, color, scale = 1, seed = 1) {
  const r = rng(`steam-${seed}`);
  let paths = '';
  for (let i = 0; i < 3; i += 1) {
    const off = (i - 1) * 26 + (r() - 0.5) * 8;
    const h = 90 + r() * 60;
    paths += `<path d="M ${x + off} ${y} C ${x + off - 16} ${y - h * 0.35}, ${x + off + 18} ${y - h * 0.6}, ${x + off - 6} ${y - h}"
      stroke="${color}" stroke-width="${2.4 - i * 0.3}" fill="none" stroke-linecap="round" opacity="${0.3 - i * 0.07}"/>`;
  }
  return `<g transform="translate(0 0) scale(${scale})">${paths}</g>`;
}

/**
 * Which silhouette a piece should be drawn as.
 *
 * Generative artwork cannot depict a specific carving, so it must not pretend
 * to: the first version of this drew one jade plaque for every piece in the
 * department, which made a "Guanyin Pendant" a rounded rectangle and a "Bangle"
 * the same rounded rectangle. The illustration note claims the drawing shows
 * the form, so it has to at least get the form right — a bangle is a ring, a
 * hairpin is a rod, earrings are a pair.
 *
 * Mapped from the size unit the catalogue already stores, so the shape follows
 * the piece rather than needing a new field.
 */
const SHAPE_BY_UNIT = {
  Bangle: 'torus',
  Bracelet: 'torus',
  Cuff: 'torus',
  Tennis: 'torus',
  Ring: 'ring',
  Pendant: 'drop',
  Locket: 'drop',
  Seal: 'drop',
  Earrings: 'pair',
  Pair: 'pair',
  Necklace: 'strand',
  Strand: 'strand',
  Anklet: 'strand',
  Cup: 'vessel',
  Figure: 'figure',
  Carving: 'figure',
  Plaque: 'plaque',
  Disc: 'disc',
  Blade: 'blade',
  Buckle: 'plaque',
  Bottle: 'column',
  Tube: 'column',
  Hairpin: 'column',
  Hook: 'column',
  Brooch: 'cluster',
  Set: 'cluster',
};

export function shapeForUnit(unit) {
  return SHAPE_BY_UNIT[unit] || 'plaque';
}

/**
 * The colour of the material a piece is made from.
 *
 * Silhouettes alone could not tell five illustrated rings apart: a solitaire, a
 * halo, a sapphire and a ruby all drew as the same gold ring, which is what the
 * jewellery page looked like before this. Colour is the honest differentiator,
 * because the stone really is the difference between them — so a ruby ring is
 * drawn in ruby red and a sapphire ring in sapphire blue.
 *
 * Matched on keywords in the material name the catalogue already stores, with a
 * neutral stone tone as the fallback. Only the three stops matter: light, body
 * and shadow.
 */
const MATERIAL_TONES = [
  // Plural forms matter: the catalogue stores "rubies", "sapphires", "diamonds",
  // so a pattern that only matches the singular silently falls through to the
  // neutral tone and a ruby ring draws grey.
  [/rub(y|ies)|garnet|agate/i, { light: '#ff9d8a', mid: '#c8402f', dark: '#6d1410' }],
  [/coral/i, { light: '#ffc3ac', mid: '#e0704e', dark: '#7a2a17' }],
  [/sapphire|sapphires|lapis|tanzanite/i, { light: '#9fc4f5', mid: '#2b5fae', dark: '#12294f' }],
  [/amethyst|purple|lilac/i, { light: '#dcc4f2', mid: '#8a5cc0', dark: '#3d1f66' }],
  // Black nephrite must be matched before the general nephrite rule, or it is
  // drawn as the same green as every other piece of jade.
  [/black nephrite|dark jade|obsidian/i, { light: '#8d9a92', mid: '#33413a', dark: '#0d1411' }],
  [/turquoise/i, { light: '#b3e6e2', mid: '#2f9c94', dark: '#0f4a46' }],
  [/amber|citrine|topaz/i, { light: '#ffd79a', mid: '#c8801f', dark: '#5f3406' }],
  [/tourmaline|rose quartz|pink/i, { light: '#ffc0d5', mid: '#cf4d7f', dark: '#6b1636' }],
  [/moonstone|opal/i, { light: '#e6eefb', mid: '#a9bcd8', dark: '#4d5b76' }],
  [/emerald|jade|nephrite|jadeite|serpentine|green/i, { light: '#c6ecd6', mid: '#3f8f6b', dark: '#12452f' }],
  [/pearl|pearls|diamond|diamonds|white/i, { light: '#ffffff', mid: '#e6e2d6', dark: '#8f8b80' }],
  [/gold|brass|filigree/i, { light: '#f8e6b8', mid: '#d4ac5c', dark: '#7d5a1c' }],
  [/silver|platinum|steel|sterling/i, { light: '#f2f4f6', mid: '#c3c8ce', dark: '#6f767d' }],
];

const DEFAULT_TONE = { light: '#e8ead8', mid: '#a9b295', dark: '#464f3c' };

/** Resolve a material name to a colour tone for its silhouette. */
export function toneFor(material) {
  const name = String(material || '');
  for (const [pattern, tone] of MATERIAL_TONES) {
    if (pattern.test(name)) return tone;
  }
  return DEFAULT_TONE;
}
/**
 * A silhouette for one piece, drawn in the department's own materials.
 *
 * `gradient` is the gradient id to fill with — the jade stone gradient, or a
 * metal one for jewellery. `seed` varies the drawing per product, so a category
 * of twelve rings does not render twelve identical rings: without it the
 * jewellery page showed a row of four indistinguishable halo rings, which reads
 * as a rendering fault rather than as a range.
 *
 * Kept deliberately simple: these are diagrams of a form, not an attempt at a
 * picture of a specific piece.
 */
function pieceBody(shape, p, gradient, v) {
  const stone = `url(#${gradient})`;
  const edge = `<g fill="none" stroke="${p.accent}" stroke-width="${(3 * v.heavy).toFixed(2)}" opacity="0.62">`;
  const close = '</g>';

  switch (shape) {
    case 'torus':
      return `<g opacity="0.98">
        <ellipse cx="600" cy="620" rx="252" ry="238" fill="none" stroke="${stone}" stroke-width="86"/>
        ${edge}<ellipse cx="600" cy="620" rx="252" ry="238" stroke-width="2.6"/>${close}
        ${edge}<ellipse cx="600" cy="620" rx="209" ry="196" stroke-width="1.6" opacity="0.5"/>${close}
        <path d="M432 470 C 480 408, 560 380, 640 386" stroke="#ffffff" stroke-width="20" fill="none" opacity="0.26" stroke-linecap="round"/>
      </g>`;

    case 'ring': {
      return `<g opacity="0.98">
        <ellipse cx="600" cy="700" rx="188" ry="184" fill="none" stroke="${stone}" stroke-width="46"/>
        ${edge}<ellipse cx="600" cy="700" rx="188" ry="184" stroke-width="2.4"/>${close}
        <circle cx="600" cy="466" r="96" fill="${stone}"/>
        ${edge}<circle cx="600" cy="466" r="96" stroke-width="2.6"/>${close}
        <path d="M534 424 C 560 396, 600 386, 636 392" stroke="#ffffff" stroke-width="16" fill="none" opacity="0.3" stroke-linecap="round"/>
        <path d="M600 380 L 648 466 L 600 552 L 552 466 Z" fill="${p.liquor}" opacity="0.2"/>
      </g>`;
    }

    case 'drop':
      return `<g opacity="0.98">
        <path d="M600 398 C 668 398, 716 448, 716 518 C 716 566, 692 600, 656 622 L 656 668 L 544 668 L 544 622 C 508 600, 484 566, 484 518 C 484 448, 532 398, 600 398 Z" fill="${stone}"/>
        ${edge}<path d="M600 398 C 668 398, 716 448, 716 518 C 716 566, 692 600, 656 622 L 656 668 L 544 668 L 544 622 C 508 600, 484 566, 484 518 C 484 448, 532 398, 600 398 Z" stroke-width="3"/>${close}
        <path d="M534 480 C 552 440, 590 418, 626 420" stroke="#ffffff" stroke-width="16" fill="none" opacity="0.3" stroke-linecap="round"/>
        ${edge}<path d="M560 500 C 590 468, 646 464, 676 496 C 700 524, 688 562, 654 570 C 626 576, 604 560, 608 538 C 612 520, 632 512, 646 522" stroke-width="6" opacity="0.4"/>${close}
        ${edge}<path d="M556 736 C 600 706, 664 710, 700 744" stroke-width="5" opacity="0.34"/>${close}
      </g>`;

    case 'pair':
      return `<g opacity="0.98">
        ${[418, 782].map((cx) => `
          <path d="M${cx} 452 C ${cx + 60} 452, ${cx + 100} 496, ${cx + 100} 556 C ${cx + 100} 596, ${cx + 78} 624, ${cx + 48} 642 L ${cx + 48} 684 L ${cx - 48} 684 L ${cx - 48} 642 C ${cx - 78} 624, ${cx - 100} 596, ${cx - 100} 556 C ${cx - 100} 496, ${cx - 60} 452, ${cx} 452 Z" fill="${stone}"/>
          ${edge}<path d="M${cx} 452 C ${cx + 60} 452, ${cx + 100} 496, ${cx + 100} 556 C ${cx + 100} 596, ${cx + 78} 624, ${cx + 48} 642 L ${cx + 48} 684 L ${cx - 48} 684 L ${cx - 48} 642 C ${cx - 78} 624, ${cx - 100} 596, ${cx - 100} 556 C ${cx - 100} 496, ${cx - 60} 452, ${cx} 452 Z" stroke-width="3"/>${close}
          <path d="M${cx - 60} 512 C ${cx - 44} 480, ${cx - 14} 462, ${cx + 16} 464" stroke="#ffffff" stroke-width="14" fill="none" opacity="0.3" stroke-linecap="round"/>
          ${edge}<ellipse cx="${cx}" cy="416" rx="30" ry="22" stroke-width="7" opacity="0.7"/>${close}
        `).join('')}
      </g>`;

    case 'strand': {
      const beads = [];
      for (let i = 0; i < 13; i += 1) {
        const t = i / 12;
        const x = 268 + t * 664;
        const y = 560 + Math.sin(t * Math.PI) * 176;
        beads.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${46 - Math.abs(t - 0.5) * 26}" fill="${stone}"/>`);
        beads.push(`<circle cx="${(x - 12).toFixed(1)}" cy="${(y - 14).toFixed(1)}" r="9" fill="#ffffff" opacity="0.4"/>`);
      }
      return `<g opacity="0.98">
        ${beads.join('')}
        ${edge}<path d="M268 560 C 360 736, 840 736, 932 560" stroke-width="2.4" opacity="0.55"/>${close}
      </g>`;
    }

    case 'vessel':
      return `<g opacity="0.98">
        <ellipse cx="600" cy="566" rx="182" ry="38" fill="none" stroke="${p.accent}" stroke-width="3.4" opacity="0.62"/>
        <path d="M418 568 C 440 800, 760 800, 782 568 Z" fill="${stone}"/>
        ${edge}<path d="M418 568 C 440 800, 760 800, 782 568 Z" stroke-width="3.2"/>${close}
        ${edge}<path d="M434 612 C 522 654, 678 654, 766 612" stroke-width="2.6" opacity="0.42"/>${close}
        <path d="M462 616 C 496 588, 542 576, 584 578" stroke="#ffffff" stroke-width="16" fill="none" opacity="0.3" stroke-linecap="round"/>
      </g>`;

    case 'figure':
      return `<g opacity="0.98">
        <path d="M600 330 C 656 330, 692 366, 692 414 C 692 462, 660 494, 664 540 L 704 700 C 716 776, 700 812, 640 828 L 560 828 C 500 812, 484 776, 496 700 L 536 540 C 540 494, 508 462, 508 414 C 508 366, 544 330, 600 330 Z" fill="${stone}"/>
        ${edge}<path d="M600 330 C 656 330, 692 366, 692 414 C 692 462, 660 494, 664 540 L 704 700 C 716 776, 700 812, 640 828 L 560 828 C 500 812, 484 776, 496 700 L 536 540 C 540 494, 508 462, 508 414 C 508 366, 544 330, 600 330 Z" stroke-width="3"/>${close}
        <path d="M546 388 C 566 366, 600 358, 630 362" stroke="#ffffff" stroke-width="15" fill="none" opacity="0.3" stroke-linecap="round"/>
        ${edge}<path d="M536 600 C 588 574, 660 578, 700 610" stroke-width="5" opacity="0.36"/>${close}
      </g>`;

    case 'disc':
      return `<g opacity="0.98">
        <ellipse cx="600" cy="612" rx="248" ry="238" fill="${stone}"/>
        ${edge}<ellipse cx="600" cy="612" rx="248" ry="238" stroke-width="3.2"/>${close}
        <ellipse cx="600" cy="612" rx="72" ry="68" fill="${p.bg2}" opacity="0.9"/>
        ${edge}<ellipse cx="600" cy="612" rx="72" ry="68" stroke-width="2.4" opacity="0.7"/>${close}
        <path d="M430 480 C 476 420, 552 392, 628 396" stroke="#ffffff" stroke-width="18" fill="none" opacity="0.26" stroke-linecap="round"/>
      </g>`;

    case 'blade':
      return `<g opacity="0.98">
        <path d="M600 336 L 728 520 L 700 828 L 500 828 L 472 520 Z" fill="${stone}"/>
        ${edge}<path d="M600 336 L 728 520 L 700 828 L 500 828 L 472 520 Z" stroke-width="3.2"/>${close}
        <circle cx="600" cy="446" r="26" fill="${p.bg2}" opacity="0.85"/>
        <path d="M540 560 C 560 522, 596 502, 630 504" stroke="#ffffff" stroke-width="15" fill="none" opacity="0.28" stroke-linecap="round"/>
      </g>`;

    case 'column':
      return `<g opacity="0.98">
        <path d="M600 306 L 664 400 L 664 812 C 664 848, 640 866, 600 866 C 560 866, 536 848, 536 812 L 536 400 Z" fill="${stone}"/>
        ${edge}<path d="M600 306 L 664 400 L 664 812 C 664 848, 640 866, 600 866 C 560 866, 536 848, 536 812 L 536 400 Z" stroke-width="3.2"/>${close}
        <path d="M556 440 C 574 410, 604 396, 632 400" stroke="#ffffff" stroke-width="14" fill="none" opacity="0.3" stroke-linecap="round"/>
        ${edge}<path d="M548 620 C 582 596, 634 600, 660 630" stroke-width="5" opacity="0.36"/>${close}
        ${edge}<path d="M548 712 C 582 688, 634 692, 660 722" stroke-width="5" opacity="0.28"/>${close}
      </g>`;

    case 'cluster': {
      const petals = [];
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
        petals.push(`<ellipse cx="${(600 + Math.cos(a) * 138).toFixed(1)}" cy="${(590 + Math.sin(a) * 138).toFixed(1)}" rx="86" ry="74" fill="${stone}" transform="rotate(${((a * 180) / Math.PI).toFixed(1)} ${(600 + Math.cos(a) * 138).toFixed(1)} ${(590 + Math.sin(a) * 138).toFixed(1)})"/>`);
      }
      return `<g opacity="0.98">
        ${petals.join('')}
        <circle cx="600" cy="590" r="96" fill="${stone}"/>
        ${edge}<circle cx="600" cy="590" r="96" stroke-width="2.8"/>${close}
        <path d="M540 546 C 566 516, 606 504, 642 510" stroke="#ffffff" stroke-width="14" fill="none" opacity="0.28" stroke-linecap="round"/>
      </g>`;
    }

    default:
      return `<g opacity="0.98">
        <path d="M462 500 C 540 484, 668 484, 740 504 C 772 514, 786 540, 782 594 C 778 652, 764 796, 742 826 C 726 848, 700 860, 640 864 C 588 868, 512 862, 476 846 C 450 834, 434 810, 428 768 C 420 710, 424 566, 440 528 C 446 512, 452 504, 462 500 Z" fill="${stone}"/>
        ${edge}<path d="M462 500 C 540 484, 668 484, 740 504 C 772 514, 786 540, 782 594 C 778 652, 764 796, 742 826 C 726 848, 700 860, 640 864 C 588 868, 512 862, 476 846 C 450 834, 434 810, 428 768 C 420 710, 424 566, 440 528 C 446 512, 452 504, 462 500 Z" stroke-width="3.2"/>${close}
        <path d="M492 560 C 528 530, 578 520, 622 524" stroke="#ffffff" stroke-width="17" fill="none" opacity="0.3" stroke-linecap="round"/>
        ${edge}<path d="M512 640 C 556 602, 640 602, 688 640 C 724 670, 708 718, 668 730 C 634 740, 606 720, 610 692 C 614 668, 640 660, 658 674" stroke-width="6" opacity="0.4"/>${close}
      </g>`;
  }
}

/**
 * The silhouette with per-piece variation applied.
 *
 * Twelve rings in one category all drew identically, which read as a rendering
 * fault rather than as a range. Each piece now gets its own tilt, scale, outline
 * weight and sparkle count, derived from its slug — so it is stable across
 * restarts and deploys, but two pieces of the same form are visibly two pieces.
 */
function pieceSilhouette(shape, p, gradient = 'stone', seed = '') {
  const r = rng(`piece-${seed}-${shape}`);
  const v = {
    tilt: (r() - 0.5) * 9,
    scale: 0.92 + r() * 0.15,
    heavy: 0.85 + r() * 0.32,
    sparkles: 1 + Math.floor(r() * 3),
  };

  const body = pieceBody(shape, p, gradient, v);

  let sparks = '';
  for (let i = 0; i < v.sparkles; i += 1) {
    const angle = r() * Math.PI * 2;
    const radius = 300 + r() * 140;
    sparks += sparkle({
      x: 600 + Math.cos(angle) * radius,
      y: 620 + Math.sin(angle) * radius * 0.7,
      size: 16 + r() * 22,
      color: p.accent,
      opacity: (0.3 + r() * 0.45).toFixed(2),
    });
  }

  return `<g transform="translate(600 620) rotate(${v.tilt.toFixed(2)}) scale(${v.scale.toFixed(3)}) translate(-600 -620)">
    ${body}
    ${sparks}
  </g>`;
}

/** An irregular polished stone chip, for scattering around jade artwork. */
function stoneChip({ x, y, scale = 1, rotate = 0, fill, opacity = 1 }) {
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate.toFixed(1)}) scale(${scale.toFixed(3)})" opacity="${opacity}">
    <path d="M0 -26 C 22 -34, 46 -20, 50 2 C 54 26, 32 40, 10 36 C -14 32, -22 10, 0 -26 Z" fill="${fill}"/>
    <path d="M6 -14 C 22 -20, 36 -10, 38 4" stroke="#ffffff" stroke-width="2.2" fill="none" opacity="0.22"/>
  </g>`;
}

/** A single pearl or bead. */
function bead({ x, y, r = 16, fill, opacity = 1 }) {
  return `<g opacity="${opacity}">
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${fill}"/>
    <circle cx="${(x - r * 0.3).toFixed(1)}" cy="${(y - r * 0.34).toFixed(1)}" r="${(r * 0.26).toFixed(1)}" fill="#ffffff" opacity="0.5"/>
  </g>`;
}

/** A four-point sparkle, for metal and faceted stone. */
function sparkle({ x, y, size = 20, color, opacity = 0.7 }) {
  const s = size;
  return `<path d="M ${x} ${y - s} L ${x + s * 0.16} ${y - s * 0.16} L ${x + s} ${y} L ${x + s * 0.16} ${y + s * 0.16} L ${x} ${y + s} L ${x - s * 0.16} ${y + s * 0.16} L ${x - s} ${y} L ${x - s * 0.16} ${y - s * 0.16} Z" fill="${color}" opacity="${opacity}"/>`;
}

/**
 * The illustration disclosure, drawn into the artwork itself.
 *
 * The storefront also labels these products in markup, but a plate inside the
 * image means the disclosure survives being screenshotted, saved, or shared to
 * a marketplace listing — the places where a caption would be stripped and the
 * artwork would otherwise pass as a photograph.
 */
function illustrationNotice(accent) {
  const text = 'ILLUSTRATION · PHOTOGRAPHY PENDING';
  const w = 636;
  return `<g transform="translate(56 1084)" opacity="0.92">
    <rect x="0" y="-36" width="${w}" height="62" rx="5" fill="#000000" fill-opacity="0.46" stroke="${accent}" stroke-width="2" stroke-opacity="0.6"/>
    <text x="22" y="4" font-family="'Inter',Helvetica,Arial,sans-serif" font-size="25" font-weight="500" letter-spacing="2.2" fill="${accent}">${text}</text>
  </g>`;
}

/**
 * Product artwork: 1200x1200 square, a centrepiece, scattered motifs and a chop.
 *
 * The chop carries an English word ("Dragon", "Honey", "Vintage") rather than a
 * Chinese character, so the lettering is sized to fit the square.
 *
 * @param {{slug:string, name:string, family:string, seal?:string, kind?:string,
 *          notice?:boolean}} product
 */
export function productArtwork(product) {
  const p = paletteFor(product.family);
  const r = rng(product.slug || product.name || 'tea');
  const tone = toneFor(product.material);
  const kind = product.kind || 'tea';
  const isWare = kind === 'teaware';
  const isJade = kind === 'jade';
  const isJewellery = kind === 'jewellery';
  const seal = String(product.seal || 'Tea').slice(0, 12);

  // Scattered motifs around the composition, chosen to match the department:
  // leaves for tea, stone chips for jade, pearls and sparkle for jewellery.
  let scatter = '';
  const count = isWare ? 5 : isJade ? 6 : isJewellery ? 9 : 7;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + r() * 0.7;
    const radius = (isJewellery ? 360 : 330) + r() * 130;
    const x = 600 + Math.cos(angle) * radius;
    const y = 620 + Math.sin(angle) * radius * 0.62;
    const opacity = 0.32 + r() * 0.3;
    if (isJade) {
      scatter += stoneChip({ x, y, scale: 0.6 + r() * 0.6, rotate: (angle * 180) / Math.PI + r() * 40 - 20, fill: r() > 0.5 ? p.leaf : p.leaf2, opacity });
    } else if (isJewellery) {
      scatter += r() > 0.45
        ? bead({ x, y, r: 10 + r() * 16, fill: r() > 0.5 ? p.liquor : p.leaf, opacity })
        : sparkle({ x, y, size: 14 + r() * 18, color: p.accent, opacity: opacity * 0.85 });
    } else {
      scatter += leaf({
        x,
        y,
        scale: 0.7 + r() * 0.75,
        rotate: (angle * 180) / Math.PI + r() * 40 - 20,
        fill: r() > 0.5 ? p.leaf : p.leaf2,
        opacity,
        veinColor: p.bg2,
      });
    }
  }

  let centerpiece;
  if (isWare) {
    // Teaware: a tall teapot-ish silhouette.
    centerpiece = `<g opacity="0.95">
        <path d="M420 700 C 420 560, 780 560, 780 700 C 780 830, 420 830, 420 700 Z" fill="url(#vessel)"/>
        <path d="M400 660 C 300 650, 300 760, 410 750" stroke="url(#rim)" stroke-width="16" fill="none" stroke-linecap="round"/>
        <path d="M780 640 C 880 610, 900 700, 800 700" stroke="url(#rim)" stroke-width="14" fill="none" stroke-linecap="round"/>
        <ellipse cx="600" cy="570" rx="120" ry="26" fill="url(#rim)"/>
      </g>`;
  } else if (isJade) {
    // Jade: the piece's own silhouette over a bi-disc, so a bangle, a pendant
    // and a cup are three different drawings rather than one plaque three times.
    centerpiece = `<g opacity="0.98">
        <g transform="translate(600 548)" opacity="0.5">
          <ellipse cx="0" cy="0" rx="222" ry="84" fill="none" stroke="url(#stone)" stroke-width="34" transform="rotate(-12)"/>
          <ellipse cx="0" cy="0" rx="222" ry="84" fill="none" stroke="${p.accent}" stroke-width="1.8" opacity="0.4" transform="rotate(-12)"/>
        </g>
        ${pieceSilhouette(product.shape || shapeForUnit(product.unit), p, product.fill || 'material', product.slug)}
      </g>`;
  } else if (isJewellery) {
    // Fine jewellery: the piece's own silhouette. A gemstone is drawn in its own
    // colour — ruby red, sapphire blue, jadeite green — and a metal piece in
    // metal, so five illustrated rings are five distinguishable rings rather
    // than the same gold hoop five times.
    centerpiece = `<g opacity="0.98">
        ${pieceSilhouette(product.shape || shapeForUnit(product.unit), p, product.fill || 'material', product.slug)}
      </g>`;
  } else {
    // Tea: a gaiwan (lidded cup) with steam.
    centerpiece = `<g opacity="0.97">
        ${steam(600, 560, p.liquor, 1, product.slug)}
        <ellipse cx="600" cy="600" rx="150" ry="30" fill="url(#rim)"/>
        <path d="M452 604 C 470 780, 730 780, 748 604 Z" fill="url(#vessel)"/>
        <path d="M452 640 C 530 672, 670 672, 748 640" stroke="${p.accent}" stroke-width="2" fill="none" opacity="0.35"/>
        <ellipse cx="600" cy="516" rx="132" ry="24" fill="url(#rim)"/>
        <path d="M470 514 C 470 452, 730 452, 730 514 Z" fill="url(#lid)"/>
        <circle cx="600" cy="440" r="16" fill="${p.accent}" opacity="0.85"/>
      </g>`;
  }

  // Chop mark: the piece's English seal word in a gold square.
  const sealFontSize = seal.length <= 4 ? 44 : seal.length <= 7 ? 32 : seal.length <= 9 ? 26 : 22;
  const sealWidth = Math.max(124, Math.min(190, seal.length * (sealFontSize * 0.62) + 34));
  const sealMark = `<g transform="translate(1010 1010)" opacity="0.92">
      <rect x="${-sealWidth / 2}" y="-46" width="${sealWidth}" height="92" rx="8" fill="none" stroke="${p.accent}" stroke-width="3"/>
      <text x="0" y="${sealFontSize * 0.35}" text-anchor="middle" font-family="'Inter',Helvetica,Arial,sans-serif" font-size="${sealFontSize}" font-weight="500" letter-spacing="1" fill="${p.accent}">${escapeXml(seal)}</text>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200" role="img" aria-label="${escapeXml(product.name || 'Tea')}${product.notice ? ' — illustration, studio photography pending' : ''}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="34%" r="82%">
      <stop offset="0%" stop-color="${p.bg1}"/>
      <stop offset="100%" stop-color="${p.bg2}"/>
    </radialGradient>
    <linearGradient id="vessel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.20"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.30"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="lid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="stone" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${p.liquor}" stop-opacity="0.92"/>
      <stop offset="38%" stop-color="${p.leaf}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${p.leaf2}" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="metal" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${p.liquor}"/>
      <stop offset="42%" stop-color="${p.accent}"/>
      <stop offset="100%" stop-color="${p.leaf}"/>
    </linearGradient>
    <linearGradient id="material" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${tone.light}"/>
      <stop offset="44%" stop-color="${tone.mid}"/>
      <stop offset="100%" stop-color="${tone.dark}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p.liquor}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="${p.liquor}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="26"/></filter>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)"/>
  <circle cx="600" cy="620" r="430" fill="url(#glow)"/>
  <g filter="url(#soft)" opacity="0.5">${scatter}</g>
  <g opacity="0.85">${scatter}</g>
  ${centerpiece}
  <rect x="26" y="26" width="1148" height="1148" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.28"/>
  ${sealMark}
  ${product.notice ? illustrationNotice(p.accent) : ''}
</svg>`;
}

/** Wide hero / banner artwork: 1920x1080 landscape. */
export function heroArtwork({ key = 'home', title = '', subtitle = '', family = 'Green' }) {
  const p = paletteFor(family);
  const r = rng(`hero-${key}`);
  let leaves = '';
  for (let i = 0; i < 16; i += 1) {
    leaves += leaf({
      x: -100 + r() * 2100,
      y: -80 + r() * 1240,
      scale: 1 + r() * 1.9,
      rotate: r() * 360,
      fill: r() > 0.5 ? p.leaf : p.leaf2,
      opacity: 0.10 + r() * 0.22,
      veinColor: p.bg2,
    });
  }
  // Mist bands, like a terraced mountain in fog.
  let bands = '';
  for (let i = 0; i < 4; i += 1) {
    const y = 620 + i * 110;
    bands += `<path d="M-50 ${y} C 400 ${y - 70}, 900 ${y + 60}, 1970 ${y - 30} L 1970 1120 L -50 1120 Z"
      fill="${p.bg1}" opacity="${0.30 - i * 0.05}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080" role="img" aria-label="${escapeXml(title || 'Cha Yuan')}">
  <defs>
    <linearGradient id="hb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.bg1}"/>
      <stop offset="60%" stop-color="${p.bg2}"/>
      <stop offset="100%" stop-color="#050d09"/>
    </linearGradient>
    <radialGradient id="hglow" cx="30%" cy="30%" r="65%">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="hsoft"><feGaussianBlur stdDeviation="40"/></filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#hb)"/>
  <circle cx="560" cy="330" r="620" fill="url(#hglow)"/>
  <g filter="url(#hsoft)">${leaves}</g>
  <g>${leaves}</g>
  ${bands}
  <g opacity="0.5" stroke="${p.accent}" fill="none" stroke-width="2">
    <path d="M0 300 C 480 250, 960 350, 1920 280" opacity="0.25"/>
    <path d="M0 360 C 480 310, 960 410, 1920 340" opacity="0.18"/>
  </g>
  ${
    title
      ? `<text x="120" y="470" font-family="Georgia,'Times New Roman',serif" font-size="104" fill="#f4efe3" letter-spacing="2">${escapeXml(title)}</text>
         <text x="126" y="546" font-family="Helvetica,Arial,sans-serif" font-size="30" fill="${p.accent}" letter-spacing="6">${escapeXml((subtitle || '').toUpperCase())}</text>
         <rect x="126" y="586" width="180" height="3" fill="${p.accent}" opacity="0.75"/>`
      : ''
  }
</svg>`;
}

/** Square lifestyle / editorial artwork for content sections. */
export function editorialArtwork({ key = 'editorial', family = 'Oolong', label = '' }) {
  const p = paletteFor(family);
  const r = rng(`ed-${key}`);
  let leaves = '';
  for (let i = 0; i < 9; i += 1) {
    leaves += leaf({
      x: 120 + r() * 960,
      y: 120 + r() * 960,
      scale: 0.9 + r() * 1.6,
      rotate: r() * 360,
      fill: r() > 0.5 ? p.leaf : p.leaf2,
      opacity: 0.16 + r() * 0.3,
      veinColor: p.bg2,
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200" role="img" aria-label="${escapeXml(label || key)}">
  <defs>
    <linearGradient id="eb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.bg1}"/><stop offset="100%" stop-color="${p.bg2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#eb)"/>
  <g>${leaves}</g>
  <circle cx="600" cy="600" r="230" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.45"/>
  <circle cx="600" cy="600" r="180" fill="none" stroke="${p.accent}" stroke-width="1" opacity="0.28"/>
  ${steam(600, 700, p.liquor, 1.2, key)}
  ${label ? `<text x="600" y="620" text-anchor="middle" font-family="Georgia,serif" font-size="46" fill="${p.accent}">${escapeXml(label)}</text>` : ''}
</svg>`;
}

/**
 * Detail views for a product with no photograph.
 *
 * A product with no photography still has to show a gallery, and mixing a
 * generated main image with leftover placeholder files reads as broken. These
 * three views are deliberately composed as a set — the lidded vessel with its
 * chop, the leaves laid out, and the vessel in profile — so a product without
 * photographs looks illustrated rather than unfinished.
 *
 * @param {{slug:string, name:string, family:string, seal?:string, kind?:string, style?:string}} product
 */
export function productDetailArtwork(product) {
  const p = paletteFor(product.family);
  const r = rng(`${product.slug}-${product.style || 'leaves'}`);
  const tone = toneFor(product.material);
  const style = product.style || 'leaves';
  const seal = String(product.seal || 'Tea').slice(0, 12);
  const kind = product.kind || 'tea';
  const isWare = kind === 'teaware';
  const isJade = kind === 'jade';
  const isJewellery = kind === 'jewellery';

  // Scattered motif bed, shared by all three views for continuity.
  let leaves = '';
  const count = isJewellery ? 10 : style === 'vessel' ? 5 : isJade ? 9 : 13;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + r() * 0.9;
    const radius = style === 'layout' ? 250 + r() * 210 : 320 + r() * 150;
    const x = 600 + Math.cos(angle) * radius;
    const y = 620 + Math.sin(angle) * radius * 0.66;
    const opacity = 0.4 + r() * 0.4;
    if (isJade) {
      leaves += stoneChip({ x, y, scale: 0.7 + r() * 0.7, rotate: (angle * 180) / Math.PI + r() * 50 - 25, fill: r() > 0.5 ? p.leaf : p.leaf2, opacity });
    } else if (isJewellery) {
      leaves += r() > 0.45
        ? bead({ x, y, r: 12 + r() * 18, fill: r() > 0.5 ? p.liquor : p.leaf, opacity })
        : sparkle({ x, y, size: 16 + r() * 20, color: p.accent, opacity: opacity * 0.85 });
    } else {
      leaves += leaf({
        x,
        y,
        scale: (style === 'layout' ? 1.0 : 0.8) + r() * 0.7,
        rotate: (angle * 180) / Math.PI + r() * 50 - 25,
        fill: r() > 0.5 ? p.leaf : p.leaf2,
        opacity,
        veinColor: p.bg2,
      });
    }
  }

  // A grid backdrop makes the "layout" view read as a studied arrangement.
  const grid =
    style === 'layout'
      ? `<g opacity="0.16" stroke="${p.accent}" stroke-width="1">
           ${[0, 1, 2, 3, 4].map((i) => `<line x1="240" y1="${240 + i * 180}" x2="960" y2="${240 + i * 180}"/>`).join('')}
           ${[0, 1, 2, 3, 4].map((i) => `<line x1="${240 + i * 180}" y1="240" x2="${240 + i * 180}" y2="960"/>`).join('')}
         </g>`
      : '';

  // The three views are chosen per department so the gallery reads as three
  // genuine studies of one object rather than three copies of the same tile.
  //
  // For jade and jewellery that means the same silhouette in three framings: a
  // gallery that showed a cup, a plaque and a bangle as the three "views" of one
  // bangle was worse than showing one drawing three times, because it implied
  // the product was all three.
  let vessel;
  if (isJade || isJewellery) {
    const shape = product.shape || shapeForUnit(product.unit);
    const gradient = isJade ? product.fill || 'material' : product.fill || 'metal';
    const framing =
      style === 'profile'
        ? 'translate(600 620) rotate(-9) scale(0.94 1.02) translate(-600 -620)'
        : style === 'layout'
          ? 'translate(600 636) scale(0.82) translate(-600 -600)'
          : '';
    vessel = `<g opacity="0.97"${framing ? ` transform="${framing}"` : ''}>${pieceSilhouette(shape, p, gradient, product.slug)}</g>`;
  } else if (isWare) {
    vessel = `<g opacity="0.95">
             <path d="M430 700 C 430 560, 770 560, 770 700 C 770 840, 430 840, 430 700 Z" fill="url(#d-vessel)"/>
             <ellipse cx="600" cy="580" rx="140" ry="28" fill="url(#d-rim)"/>
             <path d="M470 574 C 470 508, 730 508, 730 574 Z" fill="url(#d-lid)"/>
             <circle cx="600" cy="498" r="16" fill="${p.accent}" opacity="0.85"/>
             <path d="M420 660 C 320 650, 320 760, 430 750" stroke="url(#d-rim)" stroke-width="16" fill="none" stroke-linecap="round"/>
           </g>`;
  } else {
    vessel = `<g opacity="0.97">
             ${steam(600, 560, p.liquor, 1, `${product.slug}-${style}`)}
             <ellipse cx="600" cy="620" rx="160" ry="32" fill="url(#d-rim)"/>
             <path d="M440 624 C 458 800, 742 800, 760 624 Z" fill="url(#d-vessel)"/>
             <path d="M440 660 C 524 694, 676 694, 760 660" stroke="${p.accent}" stroke-width="2" fill="none" opacity="0.35"/>
           </g>`;
  }

  // The caption under each view, in the vocabulary of the department.
  const styleLabel = isJade
    ? { layout: 'AS CARVED', vessel: 'FORM', profile: 'PROFILE' }[style] || 'STUDY'
    : isJewellery
      ? { layout: 'AS SET', vessel: 'FORM', profile: 'PROFILE' }[style] || 'STUDY'
      : { layout: 'DRY LEAF', vessel: 'VESSEL', profile: 'BREWED' }[style] || 'STUDY';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200" role="img" aria-label="${escapeXml(product.name || 'Tea')}${product.notice ? ' — illustration, studio photography pending' : ''}">
  <defs>
    <radialGradient id="d-bg" cx="50%" cy="38%" r="80%">
      <stop offset="0%" stop-color="${p.bg1}"/><stop offset="100%" stop-color="${p.bg2}"/>
    </radialGradient>
    <linearGradient id="d-vessel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.30"/>
    </linearGradient>
    <linearGradient id="d-rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="d-lid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="d-stone" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${p.liquor}" stop-opacity="0.92"/>
      <stop offset="38%" stop-color="${p.leaf}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${p.leaf2}" stop-opacity="0.98"/>
    </linearGradient>
    <!-- The silhouettes are shared with the main tile and reference these
         gradient ids by name, so the detail palette has to define them too.
         Without them the fill resolves to nothing and every detail view renders
         as a bare outline. -->
    <linearGradient id="stone" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${p.liquor}" stop-opacity="0.92"/>
      <stop offset="38%" stop-color="${p.leaf}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${p.leaf2}" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="metal" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${p.liquor}"/>
      <stop offset="42%" stop-color="${p.accent}"/>
      <stop offset="100%" stop-color="${p.leaf}"/>
    </linearGradient>
    <linearGradient id="material" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="${tone.light}"/>
      <stop offset="44%" stop-color="${tone.mid}"/>
      <stop offset="100%" stop-color="${tone.dark}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#d-bg)"/>
  ${grid}
  <g opacity="0.75">${leaves}</g>
  ${style === 'layout' && !isJade && !isJewellery ? leaves : vessel}
  <rect x="26" y="26" width="1148" height="1148" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.24"/>
  <g transform="translate(600 1080)" opacity="0.9">
    <line x1="-140" y1="0" x2="140" y2="0" stroke="${p.accent}" stroke-width="1.5" opacity="0.5"/>
    <text x="0" y="34" text-anchor="middle" font-family="'Inter',Helvetica,Arial,sans-serif" font-size="30" font-weight="500" letter-spacing="3" fill="${p.accent}">${escapeXml(seal.toUpperCase())}</text>
    <text x="0" y="-14" text-anchor="middle" font-family="'Inter',Helvetica,Arial,sans-serif" font-size="18" letter-spacing="5" fill="${p.accent}" opacity="0.65">${escapeXml(styleLabel)}</text>
  </g>
  ${product.notice ? illustrationNotice(p.accent) : ''}
</svg>`;
}

/** Payment / trust badge as SVG. */
export function brandBadge({ label, tone = '#d9b96b', width = 92 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 28" width="${width}" height="${Math.round((width / 92) * 28)}" role="img" aria-label="${escapeXml(label)}">
  <rect x="1" y="1" width="90" height="26" rx="4" fill="none" stroke="${tone}" stroke-width="1.4" opacity="0.7"/>
  <text x="46" y="18.5" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="11" font-weight="600" letter-spacing="1.2" fill="${tone}">${escapeXml(label.toUpperCase())}</text>
</svg>`;
}

/** The store wordmark: a tea chop in gold plus the Latin name. */
export function logo({ name = 'Cha Yuan', subtitle = 'CHINESE TEA', tone = '#d9b96b', text = '#f4efe3' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 110" width="420" height="110" role="img" aria-label="${escapeXml(name)}">
  <g transform="translate(52 55)">
    <rect x="-38" y="-38" width="76" height="76" rx="8" fill="none" stroke="${tone}" stroke-width="2.4"/>
    <text x="0" y="14" text-anchor="middle" font-family="'Songti SC','SimSun',Georgia,serif" font-size="42" fill="${tone}">茶</text>
  </g>
  <text x="108" y="52" font-family="Georgia,'Times New Roman',serif" font-size="34" fill="${text}" letter-spacing="1">${escapeXml(name)}</text>
  <text x="110" y="76" font-family="Helvetica,Arial,sans-serif" font-size="12.5" letter-spacing="5.4" fill="${tone}">${escapeXml(subtitle)}</text>
</svg>`;
}

/** Favicon: seal mark only. */
export function favicon({ tone = '#d9b96b', bg = '#0d1f16' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="12" fill="${bg}"/>
  <rect x="8" y="8" width="48" height="48" rx="6" fill="none" stroke="${tone}" stroke-width="2.5"/>
  <text x="32" y="44" text-anchor="middle" font-family="'Songti SC','SimSun',Georgia,serif" font-size="34" fill="${tone}">茶</text>
</svg>`;
}

export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
