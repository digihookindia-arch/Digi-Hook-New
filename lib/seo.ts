import type { Metadata } from 'next';
import { site, SITE_URL } from './site';

/**
 * Per-route metadata (README SEO requirement): unique title, description,
 * canonical and OpenGraph for every page. `metadataBase` (set in the root
 * layout) makes the relative canonical/OG URLs absolute.
 */
export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
}): Metadata {
  const canonical = input.path === '/' ? '/' : input.path.replace(/\/$/, '');
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical },
    openGraph: {
      type: input.type ?? 'website',
      title: input.title,
      description: input.description,
      url: `${SITE_URL}${canonical}`,
      siteName: site.name,
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
    },
  };
}
