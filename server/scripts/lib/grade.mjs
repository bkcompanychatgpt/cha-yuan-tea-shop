/**
 * The house photo grade.
 *
 * One module, because two copies of it is how the imported jewellery and jade
 * ended up monochrome. `build-photos.mjs` graded a photograph by recombining its
 * channels — a warm lift that keeps the colours — while
 * `import-product-photos.mjs` carried its own version of the same idea written
 * with `sharp().tint()`. Tint *replaces* chroma while preserving luminance, so
 * every one of the hundred and thirteen generated pieces came out grey: an
 * "Imperial Green" bangle with no green in it, 22k gold that read as pewter.
 * Nothing caught it, because the only thing anyone compares is the file on disk.
 *
 * The source photographs come from dozens of different cameras and lighting
 * setups — some are studio shots on white, some are dim snapshots. An editorial
 * brand needs one look, so each grade is a small pipeline rather than a single
 * filter:
 *
 *   1. slight desaturation and a warm channel lift, to move everything toward
 *      the ink-green and champagne-gold palette;
 *   2. a translucent ink-green wash, which is what actually unifies a bright
 *      white-background shot with a dark one;
 *   3. a radial vignette that darkens the corners while leaving the subject in
 *      the middle of the frame alone.
 *
 * `wash` and `vignette` are the two dials worth turning.
 *
 * Whatever you do here, do not reach for `tint()`: it is not a colour cast, it
 * is a chroma replacement, and it will quietly desaturate the whole catalogue.
 */
import sharp from 'sharp';

export const GRADES = {
  product: {
    modulate: { saturation: 0.94, brightness: 1.0 },
    warm: { r: 1.03, g: 1.0, b: 0.95 },
    wash: { colour: '#08201a', opacity: 0.13 },
    vignette: { strength: 0.5, inner: 0.42 },
  },
  editorial: {
    modulate: { saturation: 0.88, brightness: 0.97 },
    warm: { r: 1.04, g: 1.0, b: 0.94 },
    wash: { colour: '#06160f', opacity: 0.26 },
    vignette: { strength: 0.64, inner: 0.32 },
  },
  hero: {
    modulate: { saturation: 0.8, brightness: 0.86 },
    warm: { r: 1.02, g: 1.0, b: 0.96 },
    wash: { colour: '#04120c', opacity: 0.36 },
    vignette: { strength: 0.74, inner: 0.26 },
  },
  /**
   * Banner grade: the hero image sits *behind* the page's own dark overlay, so it
   * is graded bright instead of dark. Grading it like a product tile crushes it
   * to black once the overlay is applied on top.
   */
  banner: {
    modulate: { saturation: 0.94, brightness: 1.1 },
    warm: { r: 1.02, g: 1.0, b: 0.96 },
    wash: { colour: '#04120c', opacity: 0.06 },
    vignette: { strength: 0.34, inner: 0.5 },
  },
  plain: {
    modulate: { saturation: 1, brightness: 1 },
    warm: { r: 1, g: 1, b: 1 },
    wash: null,
    vignette: null,
  },
};

/**
 * A flat translucent wash of one colour over the whole frame, as an RGBA layer.
 * Encoding the colour as hex with alpha is exactly what the SVG wants.
 */
export function washLayer(width, height, { colour, opacity }) {
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${colour}" fill-opacity="${opacity}"/></svg>`,
  );
}

/**
 * A radial vignette as a composited RGBA layer.
 * `strength` sets the corner opacity, `inner` the radius that stays untouched.
 */
export function vignetteLayer(size, { strength = 0.42, inner = 0.52 } = {}) {
  const half = size / 2;
  void half;
  return Buffer.from(
    `<svg width="${size}" height="${size}">
      <defs>
        <radialGradient id="v" cx="50%" cy="50%" r="72%">
          <stop offset="${Math.round(inner * 100)}%" stop-color="#04100a" stop-opacity="0"/>
          <stop offset="78%" stop-color="#04100a" stop-opacity="${(strength * 0.45).toFixed(3)}"/>
          <stop offset="100%" stop-color="#04100a" stop-opacity="${strength.toFixed(3)}"/>
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#v)"/>
    </svg>`,
  );
}

/** A faint warm gradient in the lower third, so overlay text always reads. */
export function bottomShadeLayer(width, height, strength = 0.3) {
  return Buffer.from(
    `<svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="b" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#04100a" stop-opacity="${strength}"/>
          <stop offset="45%" stop-color="#04100a" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#b)"/>
    </svg>`,
  );
}

/**
 * Apply a grade to a raw pipeline at the given output size.
 *
 * `source` is a path or a buffer, so an importer working from a freshly unzipped
 * file can use this exactly as the photo builder does.
 */
export function gradeResize(source, width, height, gradeName, { focus = null, shade = false } = {}) {
  const grade = GRADES[gradeName] || GRADES.product;

  let pipeline = sharp(source, { failOn: 'none' })
    .rotate()
    .resize(width, height, { fit: 'cover', position: focus || 'centre' })
    .recomb([
      [grade.warm.r, 0.01, 0],
      [0, grade.warm.g, 0],
      [0, 0.01, grade.warm.b],
    ])
    .modulate(grade.modulate);

  const layers = [];
  if (grade.wash) layers.push({ input: washLayer(width, height, grade.wash), blend: 'over' });
  if (grade.vignette) {
    // A composited layer may not be larger than the base image, so the square
    // vignette is drawn at the *smaller* dimension and stretched to fill.
    layers.push({ input: vignetteLayer(Math.min(width, height), grade.vignette), blend: 'over' });
  }
  if (shade || gradeName === 'hero' || gradeName === 'editorial') {
    const strength = gradeName === 'hero' ? 0.5 : gradeName === 'editorial' ? 0.28 : 0.42;
    layers.push({ input: bottomShadeLayer(width, height, strength), blend: 'over' });
  }
  if (layers.length) pipeline = pipeline.composite(layers);

  return pipeline.jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: '4:2:0' });
}

/**
 * How much colour survives a grade, as the spread between the mean red, green
 * and blue.
 *
 * A near-zero spread means a monochrome image. This exists so a check can assert
 * that grading a colour photograph with a colour grade still produces a colour
 * photograph — the failure that shipped a hundred and thirteen grey pieces was
 * invisible to every existing test.
 */
export async function colourSpread(source) {
  const { channels } = await sharp(source, { failOn: 'none' }).stats();
  const [r, g, b] = channels;
  return Math.max(r.mean, g.mean, b.mean) - Math.min(r.mean, g.mean, b.mean);
}
