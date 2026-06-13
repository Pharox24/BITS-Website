import * as THREE from 'three';

/**
 * Sample a piece of text into a grid of target positions, then pack those
 * positions into a square DataTexture of size `texSize * texSize`.
 *
 * Every particle in the sim maps 1:1 to a texel here. Texels that don't land
 * on a glyph get a "scatter" position (random, far) so unused particles drift
 * in the background instead of clumping at the origin.
 *
 * Returns { texture, width, height } where texture is RGBA float:
 *   r,g = target x,y in world units (centered at 0)
 *   b   = 1 if this texel is "on" a glyph, else 0
 *   a   = unused (1)
 */
export function bakeTextTargets({
  text = 'BITS',
  texSize = 256,          // -> texSize^2 particles (256 => 65,536)
  worldWidth = 60,        // world units the formation spans horizontally
  font = '600 220px "Clash Display", system-ui, sans-serif',
} = {}) {
  const count = texSize * texSize;

  // --- render the text to an offscreen canvas ---
  const sample = 1024; // sampling resolution (height); width derived from aspect
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { willReadFrequently: true });

  // measure to size the canvas to the text's aspect ratio
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent || 160;
  const descent = metrics.actualBoundingBoxDescent || 60;
  const textW = Math.ceil(metrics.width);
  const textH = Math.ceil(ascent + descent);
  const pad = Math.round(textH * 0.25);

  c.width = textW + pad * 2;
  c.height = textH + pad * 2;
  const aspect = c.width / c.height;

  // re-set font (resizing canvas clears state)
  ctx.font = font;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, pad, pad + ascent);

  const img = ctx.getImageData(0, 0, c.width, c.height).data;

  // --- collect "on" pixels (alpha > threshold) ---
  const onPixels = [];
  // step controls density of sampling; smaller = more candidate points
  const step = Math.max(1, Math.round(c.height / 360));
  for (let y = 0; y < c.height; y += step) {
    for (let x = 0; x < c.width; x += step) {
      if (img[(y * c.width + x) * 4 + 3] > 130) {
        onPixels.push(x, y);
      }
    }
  }
  const onCount = onPixels.length / 2;

  // --- pack into the data texture ---
  const data = new Float32Array(count * 4);
  const worldHeight = worldWidth / aspect;

  for (let i = 0; i < count; i++) {
    const o = i * 4;
    if (onCount > 0 && i < count) {
      // assign each particle to an on-pixel (cycle if fewer pixels than particles)
      const p = (i % onCount) * 2;
      const px = onPixels[p];
      const py = onPixels[p + 1];
      // map pixel space -> centered world space (flip Y)
      data[o + 0] = (px / c.width - 0.5) * worldWidth;
      data[o + 1] = -(py / c.height - 0.5) * worldHeight;
      data[o + 2] = 1.0; // on-glyph
      data[o + 3] = 1.0;
    } else {
      data[o + 0] = (Math.random() - 0.5) * worldWidth * 2;
      data[o + 1] = (Math.random() - 0.5) * worldHeight * 2;
      data[o + 2] = 0.0;
      data[o + 3] = 1.0;
    }
  }

  const texture = new THREE.DataTexture(
    data, texSize, texSize, THREE.RGBAFormat, THREE.FloatType
  );
  texture.needsUpdate = true;

  return { texture, texSize, count, aspect, worldWidth, worldHeight };
}

/** A texture of random start positions/seeds so the field can be born scattered. */
export function bakeScatterTexture(texSize, spread = 90) {
  const count = texSize * texSize;
  const data = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    // start far out in a disc so they "fly in" to form BITS
    const ang = Math.random() * Math.PI * 2;
    const rad = spread * (0.4 + Math.random() * 0.6);
    data[o + 0] = Math.cos(ang) * rad;
    data[o + 1] = Math.sin(ang) * rad * 0.6;
    data[o + 2] = (Math.random() - 0.5) * 10; // a little z
    data[o + 3] = 1.0;
  }
  const tex = new THREE.DataTexture(data, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
  tex.needsUpdate = true;
  return tex;
}
