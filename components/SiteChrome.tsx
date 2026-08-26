'use client';

import { usePathname } from 'next/navigation';

/**
 * Gates the shared site chrome (header, footer, scroll bar) off on routes
 * that must be distraction-free. /get-quote is a paid-ads funnel: any nav
 * link is a click that leaves the form, so the page shows logo + card only.
 * The client portal is chrome-free too — a signed-in client has no use for
 * the marketing nav or the "Request a project scope" lead CTA, and the
 * portal layout carries its own header and sign-out.
 */
const CHROME_FREE_ROUTES = ['/get-quote'];
const CHROME_FREE_PREFIXES = ['/portal'];

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
