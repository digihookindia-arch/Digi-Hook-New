'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Check, Lock, X } from 'lucide-react';

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
 * Until the proposal is accepted, Status and Payment render greyed — there is
 * nothing to track or bill against a project nobody has agreed to. Every
 * sub-page re-checks acceptance server-side, so this is presentation, not the
 * gate.
 *
 * A greyed stage still answers when pressed. It used to carry only a `title`,
 * which is a hover tooltip: invisible on every phone, and silent on a click
 * anywhere. Pressing a locked stage therefore did nothing at all, which reads
 * as a broken link rather than a closed door. It now explains itself and offers
 * the one action that opens it.
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
  // Which locked stage was last pressed, so the notice can name it.
  const [blocked, setBlocked] = useState<string | null>(null);

  return (
    <nav
      aria-label="Proposal sections"
      data-print-hide
      /* Sticky against the page, which is why it is a direct child of the
         document column rather than wrapped: a wrapper only as tall as the bar
         becomes the containing block and the bar scrolls away at once. */
      className="sticky top-0 z-30 border-b border-neutral-300 bg-bg/95 backdrop-blur"
    >
      {/* Never wraps. Three stages on two lines is the one thing this bar must
          not do on a phone, so the padding, the gaps and the type are all
          fluid: they sit at their comfortable maximum on a desktop and shrink
          to fit rather than pushing "03 Payment" onto a second row. Measured
          down to a 320px viewport, where the row still lands inside the
          gutters. No breakpoint anywhere. */}
      <div className="mx-auto flex max-w-[900px] flex-nowrap items-stretch gap-[clamp(2px,1.2vw,8px)] px-gutter py-2.5">
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
                className={`font-heading text-[clamp(10px,2.6vw,11px)] font-extrabold leading-none tracking-[0.04em] ${
                  active
                    ? 'text-accent-400'
                    : locked
                      ? 'text-neutral-500'
                      : 'text-accent-700'
                }`}
              >
                {number}
              </span>
              <span className="whitespace-nowrap text-[clamp(12.5px,3.3vw,14.5px)] font-semibold leading-none">
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
            <button
              key={href}
              type="button"
              onClick={() => setBlocked(stage.label)}
              aria-expanded={blocked === stage.label}
              className="inline-flex min-h-[44px] flex-none items-center gap-[clamp(4px,1.4vw,10px)] rounded-panel-sm px-[clamp(9px,2.6vw,16px)] text-neutral-500 transition-colors hover:text-neutral-800"
            >
              {inner}
              <span className="sr-only">
                — not yet available. Select to find out why.
              </span>
            </button>
          ) : (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-[44px] flex-none items-center gap-[clamp(4px,1.4vw,10px)] rounded-panel-sm px-[clamp(9px,2.6vw,16px)] transition-colors ${
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

      {/* Announced rather than merely drawn, so a screen reader hears the
          explanation the sighted user just triggered. */}
      {blocked ? (
        <div
          role="status"
          className="border-t border-neutral-300 bg-accent-100"
        >
          <div className="mx-auto flex max-w-[900px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-gutter py-3.5">
            <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.6] text-accent-800">
              <strong className="font-semibold">
                {blocked} opens once the proposal is accepted.
              </strong>{' '}
              Accepting costs nothing and commits you to no payment today — each
              one is invoiced when it falls due. It opens this stage and the
              rest of your project record.
            </p>
            <div className="flex flex-none items-center gap-3">
              <Link
                href={`${base}#accept`}
                onClick={() => setBlocked(null)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-panel-sm bg-accent-600 px-4 text-[13.5px] font-semibold leading-none text-white transition-colors hover:bg-accent-700"
              >
                Review and accept
                <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => setBlocked(null)}
                aria-label="Dismiss"
                className="inline-flex h-9 w-9 items-center justify-center rounded-panel-sm text-accent-800 transition-colors hover:bg-accent-200"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
