'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * The three views a client gets on their project. Nothing here is gated —
 * unlike the proposal tabs, everything on the portal is theirs to see. The
 * pages re-check ownership server-side, so this is presentation, not the gate.
 */
export function PortalTabs({ projectId }: { projectId: string }) {
  const base = `/portal/${projectId}`;
  const pathname = usePathname();

  const tabs = [
    { href: base, label: 'Overview', exact: true },
    { href: `${base}/tickets`, label: 'Support tickets', exact: false },
    { href: `${base}/features`, label: 'Feature requests', exact: false },
  ];

  return (
    <nav aria-label="Portal sections" className="mb-10 border-b-2 border-text">
      <ul className="m-0 flex list-none flex-wrap gap-0 p-0">
        {tabs.map((tab) => {
          // The tickets tab owns sub-routes (a ticket's thread), so it stays
          // highlighted inside them — an exact match would drop it.
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

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
