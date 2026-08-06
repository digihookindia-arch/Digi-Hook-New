import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = "Thousands of listings, one fast page. — Digi Hook";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: "Real Estate Technology",
    title: "Thousands of listings, one fast page.",
  });
}
