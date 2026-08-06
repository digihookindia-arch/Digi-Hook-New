'use client';

import { usePathname } from 'next/navigation';

/**
 * Gates the shared site chrome (header, footer, scroll bar) off on routes
 * that must be distraction-free. /get-quote is a paid-ads funnel: any nav
 * link is a click that leaves the form, so the page shows logo + card only.
 */
const CHROME_FREE_ROUTES = ['/get-quote'];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (CHROME_FREE_ROUTES.includes(pathname)) return null;
  return <>{children}</>;
}
