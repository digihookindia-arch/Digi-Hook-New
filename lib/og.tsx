import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { site } from './site';

/**
 * Open Graph card, rendered on demand rather than designed as a flat asset, so
 * every page can show its own title and nothing has to be re-exported when copy
 * changes.
 *
 * Two constraints shape what follows:
 *
 * 1. Satori (the renderer behind `next/og`) resolves neither CSS custom
 *    properties nor Tailwind classes, so the palette below is the only place in
 *    the codebase that repeats raw hex values. They mirror `globals.css :root`
 *    exactly — change one and change the other.
 * 2. Satori accepts TTF, OTF and WOFF but not WOFF2 — and not *variable* fonts
 *    either, which fail deep inside its parser with an unhelpful
 *    "Cannot read properties of undefined". `Archivo-og.ttf` is therefore a
 *    static ExtraBold instance, deliberately not the variable file the site
 *    itself uses. Replacing it with a variable build breaks every card.
 *    `loadFont` degrades to the bundled sans rather than failing the request.
 */

/** Mirrors `globals.css :root`. Keep in sync — see note 1 above. */
const token = {
  bg: '#f3f2f2',
  text: '#201e1d',
  accent: '#ec3013',
  neutral300: '#d7d3d3',
  neutral700: '#605d5d',
} as const;

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

/** Archivo if a Satori-readable format exists on disk, otherwise nothing. */
function loadFont(): { name: string; data: Buffer; weight: 700; style: 'normal' }[] | undefined {
  for (const file of ['Archivo-og.ttf', 'Archivo-og.otf', 'Archivo-og.woff']) {
    try {
      const data = readFileSync(join(process.cwd(), 'public', 'fonts', file));
      return [{ name: 'Archivo', data, weight: 700, style: 'normal' }];
    } catch {
      // Not present — try the next candidate.
    }
  }
  return undefined;
}

/**
 * The card: an accent rule, the kicker, the page title at whatever size fits,
 * and the studio's own details along the bottom.
 */
export function ogImage(input: { kicker: string; title: string }) {
  const fonts = loadFont();

  // Long headlines get stepped down so they stay on the card without clipping.
  const len = input.title.length;
  const titleSize = len > 84 ? 62 : len > 56 ? 74 : 88;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: token.bg,
          padding: '64px 72px',
          fontFamily: fonts ? 'Archivo' : 'sans-serif',
        }}
      >
        {/* Accent rule, echoing the border-2 chrome used across the site. */}
        <div style={{ display: 'flex', width: '100%', height: 10, backgroundColor: token.accent }} />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: token.accent,
              marginBottom: 28,
            }}
          >
            {input.kicker}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: titleSize,
              lineHeight: 1.04,
              letterSpacing: -3,
              color: token.text,
              fontWeight: 700,
            }}
          >
            {input.title}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderTop: `2px solid ${token.neutral300}`,
            paddingTop: 28,
          }}
        >
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: token.text, letterSpacing: -1 }}>
            {site.name}
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: token.neutral700 }}>
            {site.tagline}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, ...(fonts ? { fonts } : {}) }
  );
}
