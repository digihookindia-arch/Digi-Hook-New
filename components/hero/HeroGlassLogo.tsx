'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Reveal } from '@/components/Reveal';
import type { GlassQuality } from './GlassLogo';

/**
 * The hero's right-hand column: the WebGL glass mark, or nothing.
 *
 * There is deliberately **no flat-image placeholder**. An earlier version put
 * one here to hold the box while the canvas loaded, and it read as a second
 * logo appearing in the hero — the flat mark and the glass mark are the same
 * artwork, so any moment where both could exist looks like a bug. The column is
 * empty until the canvas is ready and empty forever if it cannot run.
 *
 * The three/fiber/drei bundle is 276 KB gzipped across four lazy chunks, plus a
 * 118 KB model and a 73 KB decoder, and the transmission material renders the
 * scene into an offscreen buffer every frame. This sits in the same viewport as
 * the LCP and INP numbers the hero prints, so it is gated: the module is a lazy
 * chunk, it is only imported once the section is near the viewport, and below
 * 900px the whole block is dropped — phones fetch none of it.
 *
 * `Reveal` is wrapped *inside* this component rather than around it in the
 * page, because it renders a div unconditionally: leaving it outside would keep
 * an empty grid item — and its row gap — on mobile even when this returns null.
 */

const GlassLogoCanvas = dynamic(() => import('./GlassLogoCanvas'), {
  ssr: false,
  loading: () => null,
});

/**
 * Below this width the hero has no right-hand block at all: no canvas, no
 * placeholder, no grid item. Phones get the text and the buttons.
 *
 * A width test in JS rather than a CSS breakpoint, which the design system
 * forbids — and it has to be a render decision anyway, since the point is to
 * avoid fetching ~467 KB, not to hide it after the fact.
 */
const MIN_WIDTH = 900;

type Decision = {
  render: boolean;
  quality: GlassQuality;
  /** Cursor tracking. Pointless without a cursor, and jerky on tap. */
  parallax: boolean;
  /** Float, drift and cursor tracking. Off for prefers-reduced-motion. */
  motion: boolean;
};

const OFF: Decision = {
  render: false,
  quality: 'low',
  parallax: false,
  motion: false,
};

function decide(): Decision {
  if (typeof window === 'undefined') return OFF;

  // Phones: drop the block entirely.
  if (window.innerWidth < MIN_WIDTH) return OFF;

  // No GPU path — bail rather than letting fiber throw. Nothing renders, since
  // the flat mark is not an option here by design.
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return OFF;
  } catch {
    return OFF;
  }

  const coarse = window.matchMedia('(pointer: coarse)').matches;

  // Reduced motion still gets the mark — it is the hero's only artwork — but
  // rendered still. Honouring the preference means no float, drift or cursor
  // tracking, not removing the object.
  const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Capability probe. Both hints are advisory and often absent, so treat
  // "unknown" as capable rather than punishing browsers that do not report.
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;

  // Cheap tier for touch and low-core machines above the width gate — large
  // tablets, mostly. Fewer refraction samples, smaller buffer, no shadow maps.
  const quality: GlassQuality =
    coarse || cores <= 4 || memory <= 4 ? 'low' : 'high';

  return { render: true, quality, parallax: !coarse && motion, motion };
}

export function HeroGlassLogo() {
  const host = useRef<HTMLDivElement>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [near, setNear] = useState(false);
  const [tokens, setTokens] = useState<{ text?: string; bg?: string }>({});

  // Runs after hydration, so the server and client trees match. The server
  // sends nothing; the block appears on desktop only. That does not shift the
  // page because the hero row is sized by the taller left column.
  //
  // Re-runs on resize because the decision is width-dependent: rotating a
  // tablet or dragging a desktop window across 900px has to be able to tear the
  // canvas down, not just leave whatever was decided at mount.
  useEffect(() => {
    // three cannot read CSS custom properties, so this is the one place the
    // design tokens get resolved for WebGL.
    const css = getComputedStyle(document.documentElement);
    setTokens({
      text: css.getPropertyValue('--color-text').trim() || undefined,
      bg: css.getPropertyValue('--color-bg').trim() || undefined,
    });

    const apply = () =>
      setDecision((prev) => {
        const next = decide();
        // Only a real change, or React remounts the canvas on every resize
        // frame — which is exactly the cost this component exists to avoid.
        if (
          prev &&
          prev.render === next.render &&
          prev.quality === next.quality &&
          prev.parallax === next.parallax &&
          prev.motion === next.motion
        ) {
          return prev;
        }
        return next;
      });

    apply();

    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(apply, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Only import the 3D chunk once the hero is actually in play.
  //
  // Depends on `render` as well as `near`: while the block is off there is no
  // host element to observe, so this bails out. Without it in the deps the
  // effect would never re-run when a resize brings the box into existence, and
  // the canvas would stay unmounted forever on a phone-to-desktop resize.
  useEffect(() => {
    const el = host.current;
    if (!el || near) return;
    if (!('IntersectionObserver' in window)) {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, decision?.render]);

  // Nothing before hydration, nothing on phones, nothing without WebGL.
  if (!decision?.render) return null;

  return (
    <Reveal>
      <div
        ref={host}
        aria-hidden="true"
        // Fixed aspect box so the canvas has a size to fill. Empty until it
        // mounts — by design; see the note at the top of the file.
        className="relative mx-auto aspect-[4/3] w-full max-w-[640px]"
      >
        {near ? (
          <div className="absolute inset-0">
            <GlassLogoCanvas
              quality={decision.quality}
              shadowColor={tokens.text}
              backdrop={tokens.bg}
              parallax={decision.parallax}
              motion={decision.motion}
            />
          </div>
        ) : null}
      </div>
    </Reveal>
  );
}
