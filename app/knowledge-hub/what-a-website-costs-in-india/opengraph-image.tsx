import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt =
  'What a website should actually cost in India, and why quotes differ 10x';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: 'Knowledge Hub · Cost',
    title: 'What a website should actually cost in India',
  });
}
