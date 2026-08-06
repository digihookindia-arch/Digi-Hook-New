import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = "Found by search engines and AI assistants alike. — Digi Hook";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: "SEO & AEO",
    title: "Found by search engines and AI assistants alike.",
  });
}
