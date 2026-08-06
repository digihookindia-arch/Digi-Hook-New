import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = "Growth measured, not promised. — Digi Hook";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: "Digital Marketing",
    title: "Growth measured, not promised.",
  });
}
