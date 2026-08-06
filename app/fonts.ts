import localFont from 'next/font/local';

/**
 * Archivo, self-hosted (README non-negotiable #6). One variable woff2 subset to
 * the glyphs the site uses (Latin + typographic punctuation + ₹), covering the
 * full weight axis. `swap` avoids invisible text; `adjustFontFallback` sizes the
 * system fallback to Archivo's metrics so the swap costs no layout shift (CLS).
 */
export const archivo = localFont({
  src: '../public/fonts/Archivo-subset.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-archivo',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: 'Arial',
});
