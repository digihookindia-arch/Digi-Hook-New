import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt =
  'Next.js or WordPress: how to decide without a developer’s opinion';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: 'Knowledge Hub · Technology',
    title: 'Next.js or WordPress: how to decide',
  });
}
