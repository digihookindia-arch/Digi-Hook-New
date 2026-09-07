import { NextResponse } from 'next/server';
import {
  HEADER_CONTENT_TYPE,
  isHeaderName,
  whatsappHeader,
} from '@/lib/whatsappHeader';

/**
 * Serves the branded header images that sit above the WhatsApp templates.
 *
 * Public and unauthenticated on purpose: AiSensy fetches these over the open
 * internet, so anything behind this URL is effectively published. That is why
 * `lib/whatsappHeader.tsx` renders brand furniture and nothing else — the same
 * image goes to every recipient of a given message, and no client name,
 * address or GSTIN ever appears in one.
 *
 * The path carries a `.png` suffix because some fetchers and previewers still
 * decide what a URL is from its extension rather than its Content-Type. It
 * costs nothing to satisfy both.
 *
 * Cached hard: these change only when the studio changes them, and AiSensy
 * re-fetches on every send.
 */
export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ image: string }> }
) {
  const { image } = await params;
  const name = image.replace(/\.png$/, '');

  if (!isHeaderName(name)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const response = whatsappHeader(name);
  response.headers.set('Content-Type', HEADER_CONTENT_TYPE);
  response.headers.set('Cache-Control', 'public, max-age=86400, immutable');
  return response;
}

/** Pre-rendered at build time, so a send never waits on a cold render. */
export function generateStaticParams() {
  return [
    { image: 'proposal-ready.png' },
    { image: 'proposal-accepted.png' },
    { image: 'payment-due.png' },
    { image: 'payment-received.png' },
  ];
}
