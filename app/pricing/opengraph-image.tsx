import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Digi Hook pricing — fixed prices, published in full';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: 'Pricing',
    title: 'Fixed prices, published in full.',
  });
}
