'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { workSection, type WorkReview } from '@/content/work';

/**
 * A filmed client review, sitting inside the work card for the site it is about.
 *
 * **Click-to-play, and the `<video>` element does not exist until it is clicked.**
 * Not `preload="none"` on a mounted player — mounted. A 3.5 MB file on a page
 * that publishes a performance budget is only defensible if a visitor who
 * scrolls past pays nothing at all for it, and browsers have historically been
 * loose about how much of a `preload="none"` source they fetch anyway. Before
 * the click this is a 25 KB still and a button.
 *
 * The poster is gated on an IntersectionObserver for the same measured reason
 * `LazyShot` in `WorkCard` is — see the long note there. `loading="lazy"` was
 * tried on that component and was not enough: under mobile throttling Chrome's
 * lazy threshold is thousands of pixels, so it pulled the images inside the
 * critical window and pushed LCP from 1.8s to 3.2s. This still is smaller than
 * those, but it sits in the same section and there is no reason to re-litigate
 * a regression that has already been paid for once.
 */
/**
 * Two caps, not one, because the two reviews are limited by different edges.
 *
 * MAX_WIDTH is the 760px the landscape master was designed to sit at, and it is
 * what still decides that one (760 x 9/20 = 342 tall, well inside the height
 * cap). MAX_HEIGHT is what decides the portrait one, which would otherwise be
 * 760 x 1343 — taller than the viewport it appears in, for a card inside a
 * card. At 520 it lands at a phone-shaped 294 x 520.
 */
const MAX_WIDTH = 760;
const MAX_HEIGHT = 520;

export function ClientReview({
  review,
  siteName,
}: {
  review: WorkReview;
  siteName: string;
}) {
  const s = workSection;
  const boxRef = useRef<HTMLDivElement>(null);
  const [nearView, setNearView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ratio = review.width / review.height;

  useEffect(() => {
    const el = boxRef.current;
    if (!el || nearView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNearView(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nearView]);

  /**
   * Naming the project rather than a person is the honest fallback while the
   * speaker's name is unconfirmed. It never renders a placeholder name, because
   * a placeholder that survives to production is an invented testimonial.
   */
  const attribution = review.speaker
    ? review.speakerRole
      ? `${review.speaker} · ${review.speakerRole}`
      : review.speaker
    : `${s.reviewUnattributed} ${siteName}`;

  return (
    <div className="border-t border-neutral-200 pt-[clamp(20px,2.4vw,28px)]">
      <div className="mb-3.5 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
        {s.reviewLabel}
      </div>

      {/* The frame is the master's own shape, read off the file rather than
          fixed here: one review is a 20:9 camera master, the other a 9:16 phone
          recording, and a shared ratio would crop whichever one it did not fit
          to a strip of somebody's face. Poster and player use the same box, so
          the click does not jump the page — the section below would otherwise
          shift under the cursor. Width and height are both capped, because the
          two shapes run into different edges — see MAX_WIDTH / MAX_HEIGHT. */}
      <div
        className="border border-neutral-300 bg-bg"
        style={{
          maxWidth: `min(100%, ${MAX_WIDTH}px, ${Math.round(MAX_HEIGHT * ratio)}px)`,
        }}
      >
        <div
          ref={boxRef}
          className="relative w-full overflow-hidden bg-neutral-200"
          style={{ aspectRatio: `${review.width} / ${review.height}` }}
        >
          {playing ? (
            <video
              className="absolute inset-0 block h-full w-full bg-text object-contain"
              src={review.src}
              poster={review.poster}
              controls
              autoPlay
              playsInline
              preload="metadata"
              aria-label={`Client review of the ${siteName} build`}
            >
              {/* Rendered only once a transcript exists. An empty track element
                  is worse than none: it advertises captions that are not there. */}
              {review.captions ? (
                <track
                  kind="captions"
                  src={review.captions}
                  srcLang="en"
                  label="English"
                  default
                />
              ) : null}
            </video>
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 block h-full w-full text-left"
            >
              {nearView && (
                <Image
                  src={review.poster}
                  alt={review.posterAlt}
                  width={review.width}
                  height={review.height}
                  sizes={`min(100vw, ${MAX_WIDTH}px, ${Math.round(MAX_HEIGHT * ratio)}px)`}
                  className="block h-full w-full object-cover"
                />
              )}
              {/* Scrim: the play control and the runtime sit on a photograph,
                  and a face is not a predictable background to put text on. */}
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-text/25 transition-colors group-hover:bg-text/40"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 grid place-items-center"
              >
                <span className="grid h-[clamp(52px,7vw,68px)] w-[clamp(52px,7vw,68px)] place-items-center border-2 border-bg bg-accent-700 text-bg transition-transform group-hover:scale-105">
                  {/* Nudged right by a pixel: a triangle centred on its bounding
                      box reads as sitting left of centre inside a square. */}
                  <Play
                    size={22}
                    className="translate-x-px"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                </span>
              </span>
              <span className="absolute bottom-0 left-0 flex items-center gap-2.5 bg-text px-3 py-2 text-[11.5px] font-semibold uppercase leading-none tracking-[0.08em] text-bg">
                {s.reviewCta}
                <span className="text-neutral-400">{review.duration}</span>
              </span>
            </button>
          )}
        </div>

        <p className="m-0 border-t border-neutral-300 px-3.5 py-2.5 text-[12.5px] leading-[1.45] text-neutral-800">
          {attribution}
        </p>
      </div>
    </div>
  );
}
