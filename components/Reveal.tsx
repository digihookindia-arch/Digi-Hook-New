'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Scroll-reveal wrapper (replaces the prototype's IntersectionObserver).
 * Elements fade + rise in once on entering the viewport, staggered by index.
 * Honors `prefers-reduced-motion`: reduced users get the content with no
 * transform and no hidden initial state (README non-negotiable #4).
 *
 * `viewport.once` + `margin` mirror the prototype's `rootMargin: 0 0 -8% 0`.
 * Elements already on screen at load animate from their in-view state, so
 * nothing above the fold is ever hidden.
 */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const delay = Math.min((index % 4) * 60, 240) / 1000;

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
