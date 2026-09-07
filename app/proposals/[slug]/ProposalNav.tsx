'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Lock } from 'lucide-react';

/**
 * The three stages of the engagement, as a bar that stays at the top of the
 * screen.
 *
 * Three, not four: "What we need" was removed at the client's direction
 * (2026-09-07). Collecting files through a checklist put a chore in front of
 * someone who had just agreed to spend money; the studio makes contact within
 * 24 hours instead and asks for what it needs in that conversation.
 *
 * Labels are one word each, on purpose. A stage whose name needs a sentence to
 * explain it is a stage that will be skipped, and the page underneath says
 * everything the old descriptions did.
 *
 * Until the proposal is accepted, Status and Payment render greyed and
 * non-navigable — there is nothing to track or bill against a project nobody
 * has agreed to. Every sub-page re-checks acceptance server-side, so this is
 * presentation, not the gate.
 */

type Stage = { label: string; path: string; gated: boolean };

const STAGES: Stage[] = [
  { path: '', label: 'Proposal', gated: false },
  { path: '/status', label: 'Status', gated: true },
  { path: '/payment', label: 'Payment', gated: true },
];

export function ProposalNav({
  slug,
  accepted,
}: {
  slug: string;
  accepted: boolean;
}) {
  const base = `/proposals/${slug}`;
  const pathname = usePathname();

  return (
    <nav
      aria-label="Proposal sections"
      data-print-hide
      /* Sticky against the page, which is why it is a direct child of the
         document column rather than wrapped: a wrapper only as tall as the bar
         becomes the containing block and the bar scrolls away at once. */
      className="sticky top-0 z-30 border-b border-neutral-300 bg-bg/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[900px] list-none flex-wrap items-stretch gap-2 px-gutter py-2.5">
        {STAGES.map((stage, i) => {
          const href = `${base}${stage.path}`;
          const number = String(i + 1).padStart(2, '0');
          const active = pathname === href;
          const locked = stage.gated && !accepted;
          // The tick means "agreed", nothing more — the later stages track
          // themselves.
          const done = i === 0 && accepted && !active;

          const inner = (
            <>
              <span
                aria-hidden="true"
                className={`font-heading text-[11px] font-extrabold leading-none tracking-[0.04em] ${
                  active
                    ? 'text-accent-400'
                    : locked
                      ? 'text-neutral-500'
                      : 'text-accent-700'
                }`}
              >
                {number}
              </span>
              <span className="text-[14.5px] font-semibold leading-none">
                {stage.label}
              </span>
              {locked ? (
                <Lock size={12} aria-hidden="true" className="text-neutral-500" />
              ) : done ? (
                <Check
                  size={13}
                  strokeWidth={3}
                  aria-hidden="true"
                  className="text-accent"
                />
              ) : null}
            </>
          );

          return locked ? (
            <span
              key={href}
              aria-disabled="true"
              title="Opens once you accept the proposal"
              className="inline-flex min-h-[44px] cursor-not-allowed items-center gap-2.5 rounded-panel-sm px-4 text-neutral-500"
            >
              {inner}
            </span>
          ) : (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-[44px] items-center gap-2.5 rounded-panel-sm px-4 transition-colors ${
                active
                  ? 'bg-text text-bg shadow-panel'
                  : 'text-neutral-800 hover:bg-panel hover:shadow-panel'
              }`}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
