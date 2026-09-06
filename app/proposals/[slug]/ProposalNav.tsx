'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Lock } from 'lucide-react';

/**
 * The proposal's contents column: the four stages of one engagement, stacked
 * down the left like the section index on a printed contract. The client asked
 * for this shape specifically (sketched, 2026-09-06) — do not turn it back
 * into a row of tabs.
 *
 * Numbered the same way the document numbers its own sections, so "04" means
 * the same thing in the margin as it does on the page, and each stage carries
 * a line saying what is behind it — which is what a column has room for and a
 * tab row does not.
 *
 * Until the proposal is accepted, stages two to four render greyed and
 * non-navigable: there is nothing to collect, track or bill against a project
 * nobody has agreed to. Every sub-page re-checks acceptance server-side, so
 * this is presentation, not the gate.
 *
 * Sticky inside its column, so a client reading the annexure can still reach
 * the payment stage. The `sticky` lives on this nav rather than on the flex
 * item that holds it — a stretched flex item is the containing block, and
 * putting `sticky` on the item itself would resolve it against a box exactly
 * as tall as the nav, which scrolls away instantly. Same trap as the grid
 * `<aside>` noted in CLAUDE.md.
 */

type Stage = {
  label: string;
  hint: string;
  gated: boolean;
  path: string;
};

const STAGES: Stage[] = [
  { path: '', label: 'Proposal', hint: 'Scope, timeline and cost', gated: false },
  { path: '/assets', label: 'What we need', hint: 'Files and access from you', gated: true },
  { path: '/status', label: 'Status', hint: 'Where the work has got to', gated: true },
  { path: '/payment', label: 'Payment', hint: 'Invoices and online payment', gated: true },
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
    <nav aria-label="Proposal sections" className="sticky top-6">
      <div className="mb-3.5 px-1 text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-neutral-700">
        This proposal
      </div>

      <ul className="m-0 grid list-none gap-1.5 p-0">
        {STAGES.map((stage, i) => {
          const href = `${base}${stage.path}`;
          const number = String(i + 1).padStart(2, '0');
          const active = pathname === href;
          const locked = stage.gated && !accepted;
          // Stage 01 is done the moment the proposal is agreed; the rest are
          // tracked elsewhere, so the tick here means "agreed", nothing more.
          const done = i === 0 && accepted && !active;

          const body = (
            <>
              <span
                aria-hidden="true"
                className={`mt-[1px] font-heading text-[11.5px] font-extrabold leading-none tracking-[0.02em] ${
                  active
                    ? 'text-accent-400'
                    : locked
                      ? 'text-neutral-500'
                      : 'text-accent-700'
                }`}
              >
                {number}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] font-semibold leading-[1.25]">
                  {stage.label}
                  {locked ? (
                    <Lock size={11} aria-hidden="true" className="text-neutral-500" />
                  ) : done ? (
                    <Check
                      size={12}
                      strokeWidth={3}
                      aria-hidden="true"
                      className="text-accent"
                    />
                  ) : null}
                </span>
                <span
                  className={`mt-1 block text-[12.5px] leading-[1.4] ${
                    active ? 'text-neutral-400' : 'text-neutral-700'
                  }`}
                >
                  {locked ? 'Opens once you accept' : stage.hint}
                </span>
              </span>
            </>
          );

          return (
            <li key={href}>
              {locked ? (
                <span
                  aria-disabled="true"
                  className="grid cursor-not-allowed grid-cols-[22px_minmax(0,1fr)] items-start gap-2.5 rounded-panel-sm px-3.5 py-3 text-neutral-500"
                >
                  {body}
                </span>
              ) : (
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`grid min-h-[58px] grid-cols-[22px_minmax(0,1fr)] items-start gap-2.5 rounded-panel-sm px-3.5 py-3 transition-colors ${
                    active
                      ? 'bg-text text-bg shadow-panel'
                      : 'text-neutral-800 hover:bg-panel hover:shadow-panel'
                  }`}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {!accepted ? (
        <p className="m-0 mt-4 px-1 text-[12.5px] leading-[1.5] text-neutral-700">
          Stages 02 to 04 open as soon as you accept.
        </p>
      ) : null}
    </nav>
  );
}
