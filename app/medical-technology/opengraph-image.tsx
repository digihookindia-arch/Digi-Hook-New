import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = "Clinic platforms built for privacy and uptime. — Digi Hook";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({
    kicker: "Medical Technology",
    title: "Clinic platforms built for privacy and uptime.",
  });
}
