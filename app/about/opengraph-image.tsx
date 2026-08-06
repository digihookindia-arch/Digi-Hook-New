import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = "Engineers, designers and marketers in Noida. — Digi Hook";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: "About Digi Hook",
    title: "Engineers, designers and marketers in Noida.",
  });
}
