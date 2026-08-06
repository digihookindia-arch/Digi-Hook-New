import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = "Tell us the problem. We’ll send the engineering. — Digi Hook";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: "Contact",
    title: "Tell us the problem. We’ll send the engineering.",
  });
}
