'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { site } from '@/lib/site';
import { menuServices, menuCompany, routes } from '@/content/navigation';

const FOCUSABLE =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

/**
 * Full-screen menu overlay. Adds the accessibility the prototype lacked:
 * focus trap, Escape to close, focus restoration to the trigger, body-scroll
 * lock, and `role="dialog"` / `aria-modal` (README non-negotiable #5).
 */
export function MenuOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Defer initial focus a frame so it survives React Strict Mode's dev-only
    // setup→cleanup→setup double-invoke (the phantom cleanup runs before this
    // fires, while focus is still on the trigger, so it won't be clobbered).
    const raf = requestAnimationFrame(() => {
      panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const firstEl = nodes[0]!;
      const lastEl = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      // Only hand focus back to the trigger on a genuine close (focus was inside
      // the panel). Skips the Strict Mode phantom cleanup, where it wasn't.
      if (panel && panel.contains(document.activeElement)) {
        restoreRef.current?.focus?.();
      }
    };
  }, [open, onClose]);

  return (
    <div
      id="site-menu"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      className={`fixed inset-0 z-[55] overflow-y-auto bg-text text-bg transition-[opacity,visibility] duration-[380ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
        open
          ? 'visible opacity-100'
          : 'invisible pointer-events-none opacity-0'
      }`}
    >
      <div className="mx-auto max-w-content px-gutter pb-16 pt-7">
        <div className="mb-[clamp(28px,5vh,56px)] flex h-12 items-center justify-between">
          <span className="text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-400">
            Index
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 border-2 border-neutral-700 px-4 py-3 text-[13.5px] font-semibold uppercase leading-none tracking-[0.06em] text-bg transition-colors hover:border-accent-600 hover:bg-accent-600 hover:text-white"
          >
            Close <X size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-[clamp(28px,4vw,64px)]">
          <MenuColumn heading="Services" links={menuServices} onClose={onClose} />
          <MenuColumn heading="Company" links={menuCompany} onClose={onClose} />

          <div className="self-end">
            <div className="mb-5 border-b border-neutral-800 pb-3 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-500">
              Studio
            </div>
            <a
              href={`tel:${site.phoneHref}`}
              className="inline-block py-[3px] text-[clamp(22px,2.4vw,34px)] font-bold leading-none tracking-[-0.03em] text-accent-400 transition-colors hover:text-white"
            >
              {site.phoneDisplay}
            </a>
            <div className="mt-3.5 text-[14.5px] leading-[1.6] text-neutral-400">
              A211, Golden I, Noida Extension
              <br />
              Uttar Pradesh, India
              <br />
              Mon–Sat, 10:00–19:00 IST
            </div>
            <Link
              href={routes.contact}
              onClick={onClose}
              className="mt-6 inline-flex items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-[18px] py-[15px] text-[14.5px] font-semibold leading-[1.25] text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
            >
              Request a project scope
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuColumn({
  heading,
  links,
  onClose,
}: {
  heading: string;
  links: { num: string; label: string; href: string }[];
  onClose: () => void;
}) {
  return (
    <div>
      <div className="mb-1.5 border-b border-neutral-800 pb-3 text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-500">
        {heading}
      </div>
      {links.map((m) => (
        <Link
          key={m.href}
          href={m.href}
          onClick={onClose}
          className="group flex items-baseline gap-3.5 border-b border-neutral-800 py-[13px] font-heading text-[clamp(20px,2.2vw,30px)] font-bold leading-[1.1] tracking-[-0.028em] text-bg transition-[color,padding] duration-200 hover:pl-2.5 hover:text-accent-400"
        >
          <span className="text-[11px] font-semibold leading-none tracking-[0.1em] text-neutral-500">
            {m.num}
          </span>
          {m.label}
        </Link>
      ))}
    </div>
  );
}
