import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { site } from './site';

/**
 * The header image that sits above a WhatsApp template.
 *
 * WhatsApp renders no styling of its own — no HTML, no CSS, no fonts, no
 * colours, on any plan and with any provider, because the rule is Meta's. This
 * image is therefore the *only* surface the studio's design reaches on a
 * client's phone, which is why it exists at all.
 *
 * Rendered on demand rather than exported as flat files, for the same reason
 * the OG cards are: the copy lives beside the design, and nothing has to be
 * re-exported when a word changes. It also means AiSensy always fetches a
 * current image from a URL that never moves.
 *
 * **Brand furniture only.** Every recipient of a given message gets the same
 * image, so nothing here may be client-specific: AiSensy fetches these over
 * the public internet, and a name, an address or a GSTIN behind a public URL
 * is a leak. Client detail belongs in the template's text parameters, which
 * are delivered privately, and in the email.
 *
 * Satori's two constraints apply exactly as they do in `lib/og.tsx`: it
 * resolves neither CSS custom properties nor Tailwind, so the palette is
 * repeated below; and it reads TTF/OTF/WOFF but not WOFF2 or variable fonts,
 * so this shares the static ExtraBold instance the cards use.
 */

/** Mirrors `globals.css :root`. Keep in sync — same rule as `lib/og.tsx`. */
const token = {
  bg: '#f3f2f2',
  text: '#201e1d',
  accent: '#ec3013',
  accent400: '#ff9783',
  neutral400: '#bab6b6',
} as const;

/**
 * 1.91:1, the ratio WhatsApp crops a media header to. Anything squarer gets
 * trimmed top and bottom, which is how a logo loses its head.
 */
export const HEADER_SIZE = { width: 1146, height: 600 };
export const HEADER_CONTENT_TYPE = 'image/png';

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

/** The four headers, keyed by the name in the URL. */
export const HEADERS = {
  'proposal-ready': {
    kicker: 'Proposal',
    title: 'Your proposal\nis ready',
    tone: 'dark',
  },
  'proposal-accepted': {
    kicker: 'Accepted',
    title: 'Thank you.\nWe are underway',
    tone: 'dark',
  },
  'payment-due': {
    kicker: 'Payment',
    title: 'A payment\nis now due',
    tone: 'accent',
  },
  'payment-received': {
    kicker: 'Received',
    title: 'Payment\nreceived',
    tone: 'accent',
  },
} as const;

export type HeaderName = keyof typeof HEADERS;

export function isHeaderName(value: string): value is HeaderName {
  return value in HEADERS;
}

/**
 * A dark or accent band, the studio's mark, and two or three words. Deliberately
 * sparse: this is thumbnailed in a chat list and read in a second, so a
 * sentence here would simply not be read.
 */
export function whatsappHeader(name: HeaderName) {
  const fonts = loadFont();
  const header = HEADERS[name];
  const onAccent = header.tone === 'accent';

  // White on accent measures 4.20:1 and fails AA, which is why the site never
  // does it — but at 96px this is display type, where the 3:1 large-text
  // threshold applies and it passes comfortably.
  const ground = onAccent ? token.accent : token.text;
  const kicker = onAccent ? token.bg : token.accent400;
  const rule = onAccent ? token.bg : token.accent;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: ground,
          padding: '64px 72px',
          fontFamily: fonts ? 'Archivo' : 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', width: 96, height: 10, backgroundColor: rule }} />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              letterSpacing: 5,
              textTransform: 'uppercase',
              color: kicker,
              marginBottom: 24,
            }}
          >
            {header.kicker}
          </div>
          {/* Satori has no white-space handling, so the line break is explicit. */}
          {header.title.split('\n').map((line) => (
            <div
              key={line}
              style={{
                display: 'flex',
                fontSize: 92,
                lineHeight: 1.02,
                letterSpacing: -4,
                color: token.bg,
                fontWeight: 700,
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 38,
              fontWeight: 700,
              color: token.bg,
              letterSpacing: -1,
            }}
          >
            {site.name}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              color: onAccent ? token.bg : token.neutral400,
            }}
          >
            {site.url.replace(/^https?:\/\//, '')}
          </div>
        </div>
      </div>
    ),
    { ...HEADER_SIZE, ...(fonts ? { fonts } : {}) }
  );
}
