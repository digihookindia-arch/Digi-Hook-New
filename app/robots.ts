import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * robots.txt — allow the marketing site (AEO/SEO is the point), but keep the
 * internal dashboard and client proposals out. Those pages also send
 * `noindex` headers; this is the belt to that pair of braces.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/dashboard', '/proposals'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
