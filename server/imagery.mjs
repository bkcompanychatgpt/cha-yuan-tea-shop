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
 * Product artwork: 1200x1200 square, gaiwan + scattered leaves + chop mark.
 *
 * The chop now carries an English word ("Dragon", "Honey", "Vintage") rather
 * than a Chinese character, so the lettering is sized to fit the square.
 * @param {{slug:string, name:string, family:string, seal?:string, kind?:string}} product
 */
export function productArtwork(product) {
  const p = paletteFor(product.family);
  const r = rng(product.slug || product.name || 'tea');
  const isWare = product.kind === 'teaware';
  const seal = String(product.seal || 'Tea').slice(0, 12);

  // Scattered leaves around the composition.
  let leaves = '';
  const leafCount = isWare ? 5 : 7;
  for (let i = 0; i < leafCount; i += 1) {
    const angle = (i / leafCount) * Math.PI * 2 + r() * 0.7;
    const radius = 330 + r() * 130;
    leaves += leaf({
      x: 600 + Math.cos(angle) * radius,
      y: 620 + Math.sin(angle) * radius * 0.62,
      scale: 0.7 + r() * 0.75,
      rotate: (angle * 180) / Math.PI + r() * 40 - 20,
      fill: r() > 0.5 ? p.leaf : p.leaf2,
      opacity: 0.32 + r() * 0.3,
      veinColor: p.bg2,
    });
  }

  const centerpiece = isWare
    ? // Teaware: a tall teapot-ish silhouette
      `<g opacity="0.95">
        <path d="M420 700 C 420 560, 780 560, 780 700 C 780 830, 420 830, 420 700 Z" fill="url(#vessel)"/>
        <path d="M400 660 C 300 650, 300 760, 410 750" stroke="url(#rim)" stroke-width="16" fill="none" stroke-linecap="round"/>
        <path d="M780 640 C 880 610, 900 700, 800 700" stroke="url(#rim)" stroke-width="14" fill="none" stroke-linecap="round"/>
        <ellipse cx="600" cy="570" rx="120" ry="26" fill="url(#rim)"/>
      </g>`
    : // Tea: a gaiwan (lidded cup) with steam
      `<g opacity="0.97">
        ${steam(600, 560, p.liquor, 1, product.slug)}
        <ellipse cx="600" cy="600" rx="150" ry="30" fill="url(#rim)"/>
        <path d="M452 604 C 470 780, 730 780, 748 604 Z" fill="url(#vessel)"/>
        <path d="M452 640 C 530 672, 670 672, 748 640" stroke="${p.accent}" stroke-width="2" fill="none" opacity="0.35"/>
        <ellipse cx="600" cy="516" rx="132" ry="24" fill="url(#rim)"/>
        <path d="M470 514 C 470 452, 730 452, 730 514 Z" fill="url(#lid)"/>
        <circle cx="600" cy="440" r="16" fill="${p.accent}" opacity="0.85"/>
      </g>`;

  // Chop mark: the tea's English seal word in a gold square.
  const sealFontSize = seal.length <= 4 ? 44 : seal.length <= 7 ? 32 : seal.length <= 9 ? 26 : 22;
  const sealWidth = Math.max(124, Math.min(190, seal.length * (sealFontSize * 0.62) + 34));
  const sealMark = `<g transform="translate(1010 1010)" opacity="0.92">
      <rect x="${-sealWidth / 2}" y="-46" width="${sealWidth}" height="92" rx="8" fill="none" stroke="${p.accent}" stroke-width="3"/>
      <text x="0" y="${sealFontSize * 0.35}" text-anchor="middle" font-family="'Inter',Helvetica,Arial,sans-serif" font-size="${sealFontSize}" font-weight="500" letter-spacing="1" fill="${p.accent}">${escapeXml(seal)}</text>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200" role="img" aria-label="${escapeXml(product.name || 'Tea')}">
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
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p.liquor}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="${p.liquor}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="26"/></filter>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)"/>
  <circle cx="600" cy="620" r="430" fill="url(#glow)"/>
  <g filter="url(#soft)" opacity="0.5">${leaves}</g>
  <g opacity="0.85">${leaves}</g>
  ${centerpiece}
  <rect x="26" y="26" width="1148" height="1148" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.28"/>
  ${sealMark}
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
  const style = product.style || 'leaves';
  const seal = String(product.seal || 'Tea').slice(0, 12);
  const isWare = product.kind === 'teaware';

  // Scattered leaf bed, shared by all three views for continuity.
  let leaves = '';
  const count = style === 'vessel' ? 5 : 13;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + r() * 0.9;
    const radius = style === 'layout' ? 250 + r() * 210 : 320 + r() * 150;
    leaves += leaf({
      x: 600 + Math.cos(angle) * radius,
      y: 620 + Math.sin(angle) * radius * 0.66,
      scale: (style === 'layout' ? 1.0 : 0.8) + r() * 0.7,
      rotate: (angle * 180) / Math.PI + r() * 50 - 25,
      fill: r() > 0.5 ? p.leaf : p.leaf2,
      opacity: 0.4 + r() * 0.4,
      veinColor: p.bg2,
    });
  }

  // A grid backdrop makes the "layout" view read as a studied arrangement.
  const grid =
    style === 'layout'
      ? `<g opacity="0.16" stroke="${p.accent}" stroke-width="1">
           ${[0, 1, 2, 3, 4].map((i) => `<line x1="240" y1="${240 + i * 180}" x2="960" y2="${240 + i * 180}"/>`).join('')}
           ${[0, 1, 2, 3, 4].map((i) => `<line x1="${240 + i * 180}" y1="240" x2="${240 + i * 180}" y2="960"/>`).join('')}
         </g>`
      : '';

  // Profile view: the vessel seen from the side, which suits teaware.
  const vessel =
    isWare || style === 'vessel'
      ? `<g opacity="0.95">
           <path d="M430 700 C 430 560, 770 560, 770 700 C 770 840, 430 840, 430 700 Z" fill="url(#d-vessel)"/>
           <ellipse cx="600" cy="580" rx="140" ry="28" fill="url(#d-rim)"/>
           <path d="M470 574 C 470 508, 730 508, 730 574 Z" fill="url(#d-lid)"/>
           <circle cx="600" cy="498" r="16" fill="${p.accent}" opacity="0.85"/>
           <path d="M420 660 C 320 650, 320 760, 430 750" stroke="url(#d-rim)" stroke-width="16" fill="none" stroke-linecap="round"/>
         </g>`
      : `<g opacity="0.97">
           ${steam(600, 560, p.liquor, 1, `${product.slug}-${style}`)}
           <ellipse cx="600" cy="620" rx="160" ry="32" fill="url(#d-rim)"/>
           <path d="M440 624 C 458 800, 742 800, 760 624 Z" fill="url(#d-vessel)"/>
           <path d="M440 660 C 524 694, 676 694, 760 660" stroke="${p.accent}" stroke-width="2" fill="none" opacity="0.35"/>
         </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200" role="img" aria-label="${escapeXml(product.name || 'Tea')}">
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
  </defs>
  <rect width="1200" height="1200" fill="url(#d-bg)"/>
  ${grid}
  <g opacity="0.75">${leaves}</g>
  ${style === 'vessel' ? vessel : style === 'layout' ? leaves : vessel}
  <rect x="26" y="26" width="1148" height="1148" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.24"/>
  <g transform="translate(600 1080)" opacity="0.9">
    <line x1="-140" y1="0" x2="140" y2="0" stroke="${p.accent}" stroke-width="1.5" opacity="0.5"/>
    <text x="0" y="34" text-anchor="middle" font-family="'Inter',Helvetica,Arial,sans-serif" font-size="30" font-weight="500" letter-spacing="3" fill="${p.accent}">${escapeXml(seal.toUpperCase())}</text>
    <text x="0" y="-14" text-anchor="middle" font-family="'Inter',Helvetica,Arial,sans-serif" font-size="18" letter-spacing="5" fill="${p.accent}" opacity="0.65">${escapeXml(style === 'layout' ? 'DRY LEAF' : style === 'vessel' ? 'VESSEL' : 'BREWED')}</text>
  </g>
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
