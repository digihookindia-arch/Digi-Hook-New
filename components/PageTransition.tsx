'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * Per-route entrance (prototype's `go()` main-content fade): on navigation the
 * content fades `opacity 0→1` and rises `translateY(14px)→0` over 480ms.
 *
 * Two things here are load-bearing, both learned from a page that rendered
 * blank between a visible header and footer:
 *
 * 1. The first render never starts from `opacity: 0`. It used to, which meant
 *    the server sent every page as `<div style="opacity:0">` and the content
 *    was only revealed once Framer hydrated and animated. Any hydration that
 *    was slow, blocked or mismatched left the whole page invisible with no
 *    error — the chrome outside this wrapper still drew, so it looked like the
 *    page had simply lost its content. Entrance animation now applies only to
 *    client-side route changes, where the markup is already on screen.
 *
 * 2. The wrapper is always rendered, even under reduced motion. Returning bare
 *    children when `reduce` was true changed the tree shape between server and
 *    client — `useReducedMotion` reads the media query synchronously on the
 *    client but not on the server — which is a hydration mismatch, and one way
 *    to strand the element at its initial opacity. Reduced motion now sets the
 *    duration to zero instead of removing the element.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  // False on the server and on the hydrating render; true from the first
  // effect onwards. Gates the entrance to real navigations only.
  const [navigated, setNavigated] = useState(false);
  useEffect(() => setNavigated(true), []);

  const animates = navigated && !reduce;

  return (
    <motion.div
      key={pathname}
      // `false` means "start where you would finish" — no zero-opacity frame
      // is ever committed to the DOM.
      initial={animates ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: animates ? 0.48 : 0, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
