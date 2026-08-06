import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Why your website is slow — and what actually fixes it';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: 'Knowledge Hub · Performance',
    title: 'Why your website is slow — and what actually fixes it',
  });
}
