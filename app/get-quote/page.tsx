import type { Metadata } from 'next';
import { MetaPixel } from './MetaPixel';
import { QuoteForm } from './QuoteForm';

/**
 * Ad-funnel landing page: logo, progress bar, one card at a time. Deliberately
 * chrome-free (Header/Footer/ScrollProgress are gated off in app/layout.tsx)
 * and noindexed — paid traffic lands here, search traffic should not.
 */
export const metadata: Metadata = {
  title: 'Get a Quote',
  description: 'Tell us what you need. Get your website quote in a few hours.',
  robots: { index: false, follow: false, nocache: true },
};

export default function GetQuotePage() {
  return (
    <>
      <MetaPixel />
      <QuoteForm />
    </>
  );
}
