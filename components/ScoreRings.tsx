'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Scores } from '@/content/work';
import { workSection } from '@/content/work';

/**
 * Lighthouse score rings — the arc draws and the numeral counts up when the row
 * scrolls into view.
 *
 * **Flat on purpose.** A 3D version was built and reverted (2026-08-14): the
 * arcs were extruded in Z and swung in on a tilt, and at the angle needed to
 * show any thickness the ring collapsed to a sliver and the number went with
 * it. A Lighthouse dial is a shape people recognise head-on; anything that
 * turns it edge-on trades the recognition for the effect. Don't reinstate it
 * without looking at a rendered frame first.
 *
 * **Deliberately hand-rolled instead of using Framer, which is already a
 * dependency.** The first version gave every ring its own `useInView` plus two
 * MotionValues; sixteen rings across this page meant sixteen
 * IntersectionObservers and thirty-two motion values, and PageSpeed measured
 * the cost: main-thread work 1.2s against 0.4s on a sibling page, bootup 0.7s
 * against 0.3s, with script *bytes* essentially identical. That is hydration
 * execution, and it pushed LCP past the ≤2.5s budget this very page publishes.
 *
 * So a row owns one observer and one rAF loop, and writes to its rings through
 * the DOM. No per-ring React state, nothing re-rendering at 60fps.
 *
 * **The server renders the true number**, and the reset to empty happens once in
 * a layout effect after hydration — before paint, so nothing flashes. A
 * component that animated from zero the obvious way would ship `0` in the HTML,
 * and this site is read by search engines and AI assistants that never run the
 * animation. Reduced motion is a real branch: the values are left where the
 * server put them and nothing animates.
 */

/** Geometry lives in viewBox units; every rendered size is a CSS length. */
const VB = 46;
const R = 19;
const STROKE = 4.2;
const CIRCUMFERENCE = 2 * Math.PI * R;

const DURATION = 1150;
/** Pause on the finished numbers before a looping row replays. */
const HOLD = 5200;

const TONES = {
  pass: { ring: 'stroke-score-pass', ink: 'text-score-pass-ink' },
  average: { ring: 'stroke-score-average', ink: 'text-score-average-ink' },
  fail: { ring: 'stroke-score-fail', ink: 'text-score-fail-ink' },
} as const;

const toneFor = (value: number) =>
  value >= 90 ? TONES.pass : value >= 50 ? TONES.average : TONES.fail;

const offsetFor = (value: number) => CIRCUMFERENCE - (value / 100) * CIRCUMFERENCE;

/** `useLayoutEffect` warns when React renders on the server; this is the standard swap. */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function Ring({
  value,
  label,
  size,
  labelSize,
}: {
  value: number;
  label: string;
  /** Any CSS length — the SVG fills it, so the ring is fluid without a breakpoint. */
  size: string;
  labelSize: string;
}) {
  const tone = toneFor(value);

  return (
    <div className="grid justify-items-center gap-2.5 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VB} ${VB}`}
          aria-hidden="true"
          className="block"
        >
          <circle
            cx={VB / 2}
            cy={VB / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-neutral-300"
          />
          {/* Starts at twelve o'clock like the Lighthouse widget, not at three.
              The row's rAF loop drives strokeDashoffset through these hooks. */}
          <circle
            data-ring=""
            data-final={offsetFor(value)}
            cx={VB / 2}
            cy={VB / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            style={{ strokeDashoffset: offsetFor(value) }}
            transform={`rotate(-90 ${VB / 2} ${VB / 2})`}
            className={tone.ring}
          />
        </svg>
        <span
          className={`absolute inset-0 grid place-items-center font-heading font-extrabold leading-none tracking-[-0.035em] ${tone.ink}`}
          style={{ fontSize: `calc(${size} * 0.36)` }}
        >
          <span data-num="" data-value={value} aria-hidden="true">
            {value}
          </span>
        </span>
      </div>
      <span
        className="font-semibold uppercase leading-[1.2] tracking-[0.04em] text-neutral-700"
        style={{ fontSize: labelSize }}
      >
        {label}
        <span className="sr-only"> score: {value} out of 100</span>
      </span>
    </div>
  );
}

export function ScoreRow({
  scores,
  size = '46px',
  labelSize = '9.5px',
  className = '',
  repeat = false,
}: {
  scores: Scores;
  /** CSS length; use a clamp() so the ring scales fluidly. */
  size?: string;
  labelSize?: string;
  className?: string;
  /**
   * Loop the count-up while the row is on screen, instead of playing it once.
   * Reserved for the headline band — a page where every score row loops is a
   * page that never sits still. Looping stops the moment the row scrolls out.
   */
  repeat?: boolean;
}) {
  const { scoreLabels } = workSection;
  const rowRef = useRef<HTMLDivElement>(null);

  // Reset to empty once, before paint, so the server's true values are what
  // ships in the HTML and what a reduced-motion visitor keeps.
  useIsoLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    row.querySelectorAll<SVGCircleElement>('[data-ring]').forEach((c) => {
      c.style.strokeDashoffset = String(CIRCUMFERENCE);
    });
    row.querySelectorAll<HTMLElement>('[data-num]').forEach((n) => {
      n.textContent = '0';
    });
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rings = [...row.querySelectorAll<SVGCircleElement>('[data-ring]')].map((el) => ({
      el,
      final: Number(el.dataset.final),
    }));
    const nums = [...row.querySelectorAll<HTMLElement>('[data-num]')].map((el) => ({
      el,
      value: Number(el.dataset.value),
    }));

    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let start = 0;

    const paint = (t: number) => {
      const e = easeOutCubic(t);
      for (const r of rings) {
        r.el.style.strokeDashoffset = String(CIRCUMFERENCE - (CIRCUMFERENCE - r.final) * e);
      }
      for (const n of nums) {
        n.el.textContent = String(Math.round(n.value * e));
      }
    };

    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      paint(t);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else if (repeat) {
        timer = setTimeout(() => {
          paint(0);
          start = 0;
          raf = requestAnimationFrame(step);
        }, HOLD);
      }
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      raf = 0;
      timer = undefined;
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          // Restart from empty on every entry, so scrolling back to a row
          // replays it rather than showing a finished set.
          stop();
          paint(0);
          start = 0;
          raf = requestAnimationFrame(step);
        } else {
          stop();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(row);

    return () => {
      io.disconnect();
      stop();
    };
  }, [repeat]);

  return (
    <div
      ref={rowRef}
      className={`grid grid-cols-[repeat(4,minmax(0,1fr))] gap-x-2 gap-y-3 ${className}`}
    >
      <Ring value={scores.performance} label={scoreLabels.performance} size={size} labelSize={labelSize} />
      <Ring value={scores.accessibility} label={scoreLabels.accessibility} size={size} labelSize={labelSize} />
      <Ring value={scores.bestPractices} label={scoreLabels.bestPractices} size={size} labelSize={labelSize} />
      <Ring value={scores.seo} label={scoreLabels.seo} size={size} labelSize={labelSize} />
    </div>
  );
}
