import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { routes, type RouteKey } from '@/content/navigation';

/** Real sitemap (README SEO requirement). Clean, permanent, lowercase-hyphen
 * URLs — one entry per route, weighted by role. */

/**
 * When each page's content actually last changed — not when the sitemap was
 * requested.
 *
 * This used to be `new Date()` for every URL, which told crawlers all fourteen
 * pages changed seconds ago on every single fetch. Search engines discount a
 * `lastmod` they can see is untrue, so the field was worth less than omitting
 * it. Bump the relevant date when you edit a page's copy; leave it alone for
 * styling or code changes.
 */
const CONTENT_LAST_CHANGED = '2026-07-20'; // Ported marketing pages.

const lastModified: Partial<Record<RouteKey, string>> = {
  article: '2026-07-01',
  articleStack: '2026-07-26',
  articleCost: '2026-07-26',
  knowledge: '2026-07-26', // Index relists whenever an article ships.
  pricing: '2026-07-25', // Client supplied the flat figures.
};

export default function sitemap(): MetadataRoute.Sitemap {
  const priority: Partial<Record<RouteKey, number>> = {
    home: 1,
    engineering: 0.9,
    seo: 0.9,
    ecommerce: 0.8,
    medical: 0.8,
    realestate: 0.8,
    marketing: 0.8,
    creative: 0.8,
    pricing: 0.8,
    technology: 0.7,
    knowledge: 0.7,
    article: 0.7,
    articleStack: 0.7,
    articleCost: 0.7,
    about: 0.6,
    contact: 0.6,
  };

  return (Object.keys(routes) as RouteKey[]).map((key) => ({
    url: `${SITE_URL}${routes[key]}`,
    lastModified: new Date(lastModified[key] ?? CONTENT_LAST_CHANGED),
    changeFrequency: key.startsWith('article') || key === 'knowledge' ? 'monthly' : 'yearly',
    priority: priority[key] ?? 0.6,
  }));
}
