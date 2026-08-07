/**
 * Generates public/logo-light.png — the wordmark in white, for dark
 * backgrounds (the email footer).
 *
 * public/logo.png is dark ink on transparency, so the light version is the
 * same shape with the colour channels forced to white and the alpha left
 * exactly as it was. Recolouring this way keeps every anti-aliased edge:
 * inverting or thresholding the image instead would leave dark fringes
 * around the letterforms on a dark background.
 *
 * Run after replacing public/logo.png:
 *   node scripts/make-logo-light.mjs
 */

import sharp from 'sharp';

const SRC = 'public/logo.png';
const OUT = 'public/logo-light.png';

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

if (info.channels !== 4) {
  throw new Error(`${SRC} has no alpha channel — cannot recolour it safely.`);
}

for (let i = 0; i < data.length; i += 4) {
  // Alpha (i + 3) is deliberately untouched.
  data[i] = 255;
  data[i + 1] = 255;
  data[i + 2] = 255;
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(OUT);

console.log(`${OUT} written — ${info.width}x${info.height}`);
