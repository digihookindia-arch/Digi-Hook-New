'use client';

import { useEffect, useRef } from 'react';

/**
 * Fixed 3px accent scroll-progress bar (README shared chrome). Width tracks
 * scroll position via a passive listener; rAF-batched so it never blocks input
 * (INP budget). Purely decorative — hidden from assistive tech.
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const el = barRef.current;
      if (!el) return;
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      el.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[3px] bg-transparent"
    >
      <div ref={barRef} className="h-full w-0 bg-accent" />
    </div>
  );
}
