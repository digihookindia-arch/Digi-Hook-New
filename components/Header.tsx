'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { site } from '@/lib/site';
import { routes } from '@/content/navigation';
import { MenuOverlay } from './MenuOverlay';

/**
 * Sticky header (README shared chrome): logo, Menu toggle, primary CTA.
 * 76px tall, blurred translucent ground, 2px divider rule beneath.
 */
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Stable identity so MenuOverlay's focus-trap effect runs once per open,
  // rather than tearing down (and stealing focus back) on every re-render.
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  return (
    <>
      <header
        data-site-header
        className="sticky top-0 z-50 border-b-2 border-divider backdrop-blur-[14px]"
        style={{
          background: 'color-mix(in srgb, var(--color-bg) 88%, transparent)',
        }}
      >
        {/* Wraps rather than clips. The three items need ~514px and phones are
            narrower, so on a fixed-height single line the CTA ran off the edge
            and `overflow-x: hidden` on the body silently cut it off. Wrapping
            keeps it reachable; desktop is unaffected because it still fits on
            one line. Gap is fluid for the same reason. */}
        <div className="mx-auto flex min-h-[76px] max-w-content flex-wrap items-center gap-x-[clamp(12px,3vw,32px)] gap-y-3 px-gutter py-3">
          <Link
            href={routes.home}
            className="flex flex-none items-center gap-2.5"
            aria-label="Digi Hook — home"
          >
            {/* 1000x238 source, so 36px tall still renders well above 2x. The
                width/height pair must keep that ratio or the reserved box is
                the wrong shape and the header shifts as the logo loads.

                Height is fluid rather than fixed: the header row already
                overflows its own width below roughly 560px, so growing the
                logo there would push the CTA further off-screen. Each stop is
                25% up on the previous 26/5vw/36 — 45px on desktop, holding to
                a 720px viewport, easing back to 33px on phones. */}
            <Image
              src="/logo.png"
              alt="Digi Hook"
              width={151}
              height={36}
              priority
              className="h-[clamp(33px,6.25vw,45px)] w-auto mix-blend-multiply"
            />
          </Link>

          <button
            type="button"
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="ml-auto inline-flex items-center gap-3 border-2 border-text px-4 py-3 text-[13.5px] font-semibold uppercase leading-none tracking-[0.06em] text-text transition-colors hover:bg-text hover:text-bg"
          >
            <span className="grid gap-[3px]" aria-hidden="true">
              <span className="block h-[2px] w-4 bg-current" />
              <span className="block h-[2px] w-4 bg-current" />
            </span>
            {menuOpen ? 'Close' : 'Menu'}
          </button>

          <Link
            href={routes.contact}
            className="inline-flex flex-none items-center gap-2.5 whitespace-nowrap border-2 border-accent-600 bg-accent-600 px-[18px] py-[13px] text-[13.5px] font-semibold leading-[1.25] text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
          >
            Request a project scope
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <MenuOverlay open={menuOpen} onClose={closeMenu} />
    </>
  );
}
