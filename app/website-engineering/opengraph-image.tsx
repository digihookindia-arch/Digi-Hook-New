import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = "Sites engineered to targets, not opinions. — Digi Hook";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: "Website Engineering",
    title: "Sites engineered to targets, not opinions.",
  });
}
