'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';

/**
 * The three views a client gets on their project. Until the proposal is
 * accepted, the second and third tabs render greyed out and non-navigable —
 * the flow is proposal → accept → the rest unlocks. The sub-pages re-check
 * acceptance server-side, so this is presentation, not the gate.
 */
export function ProposalTabs({
  slug,
  accepted,
}: {
  slug: string;
  accepted: boolean;
}) {
  const base = `/proposals/${slug}`;
  const pathname = usePathname();

  const tabs = [
    { href: base, label: 'Proposal', gated: false },
    { href: `${base}/assets`, label: 'What we need', gated: true },
    { href: `${base}/status`, label: 'Status', gated: true },
  ];

  return (
    <nav
      aria-label="Proposal sections"
      data-print-hide
      className="mb-10 border-b-2 border-text"
    >
      <ul className="m-0 flex list-none flex-wrap gap-0 p-0">
        {tabs.map((tab) => {
          const locked = tab.gated && !accepted;
          const active = pathname === tab.href;

          if (locked) {
            return (
              <li key={tab.href}>
                <span
                  aria-disabled="true"
                  title="Unlocks once the proposal is accepted"
                  className="inline-flex min-h-[44px] cursor-not-allowed items-center gap-2 border-2 border-transparent px-5 text-[13.5px] font-semibold leading-none text-neutral-500"
                >
                  <Lock size={13} aria-hidden="true" />
                  {tab.label}
                </span>
              </li>
            );
          }

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-[44px] items-center border-2 border-b-0 px-5 text-[13.5px] font-semibold leading-none transition-colors ${
                  active
                    ? 'border-text bg-text text-bg'
                    : 'border-transparent text-neutral-700 hover:text-accent-700'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
