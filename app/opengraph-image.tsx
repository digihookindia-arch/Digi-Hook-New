import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

/**
 * Default share card. Next.js applies this to every route that does not define
 * its own `opengraph-image`, and emits both `og:image` and `twitter:image` from
 * it — which is what makes the `summary_large_image` card format valid.
 */
export const alt = 'Digi Hook — IT solutions and creative agency in Noida';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: 'IT solutions & creative agency',
    title: 'We engineer everything.',
  });
}
