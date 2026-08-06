import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = "Where checkout is the fastest part of the site. — Digi Hook";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: "Ecommerce Solutions",
    title: "Where checkout is the fastest part of the site.",
  });
}
