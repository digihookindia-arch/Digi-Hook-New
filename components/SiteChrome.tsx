'use client';

import { usePathname } from 'next/navigation';

/**
 * Gates the shared site chrome (header, footer, scroll bar) off on routes
 * that must be distraction-free. /get-quote is a paid-ads funnel: any nav
 * link is a click that leaves the form, so the page shows logo + card only.
 * The client portal is chrome-free too — a signed-in client has no use for
 * the marketing nav or the "Request a project scope" lead CTA, and the
 * portal layout carries its own header and sign-out.
 *
 * Proposals joined them for the same reason: a client reading the document
 * they are being asked to sign should not be shown a lead-capture button for
 * the thing they are already buying. The proposal layout carries its own
 * document masthead instead.
 */
const CHROME_FREE_ROUTES = ['/get-quote'];
const CHROME_FREE_PREFIXES = ['/portal', '/proposals'];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeFree =
    CHROME_FREE_ROUTES.includes(pathname) ||
    CHROME_FREE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  if (chromeFree) return null;
  return <>{children}</>;
}
