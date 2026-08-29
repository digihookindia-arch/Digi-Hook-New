import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ActivityItem } from '@/lib/tickets';
import { TICKET_KIND_LABELS } from '@/lib/ticketRules';
import { shortReference } from '@/lib/emailTemplate';

/**
 * The overview's smaller server-rendered pieces: the pending-actions strip
 * ("is any action required from me?") and the recent-activity feed. Pure
 * display — the page computes the data.
 */

export type PendingAction = {
  text: string;
  href: string;
};

export function PendingActions({ actions }: { actions: PendingAction[] }) {
  if (actions.length === 0) return null;

  return (
    <section
      aria-labelledby="pending-actions-heading"
      className="border-2 border-accent-600 p-6"
    >
      <h2
        id="pending-actions-heading"
        className="m-0 mb-4 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
      >
        Needs your attention
      </h2>
      <ul className="m-0 grid list-none gap-3 p-0">
        {actions.map((action) => (
          <li key={action.href + action.text}>
            <Link
              href={action.href}
              className="group flex flex-wrap items-center justify-between gap-3 text-[15px] font-medium leading-[1.5] text-text transition-colors hover:text-accent-700"
            >
              <span>{action.text}</span>
              <ArrowRight
                size={15}
                aria-hidden="true"
                className="text-accent transition-transform group-hover:translate-x-1"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ACTIVITY_WORDING: Record<ActivityItem['type'], string> = {
  raised: 'You raised',
  studio_reply: 'We replied on',
  client_reply: 'You replied on',
};

export function ActivityFeed({
  items,
  projectId,
}: {
  items: ActivityItem[];
  projectId: string;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="activity-heading">
      <h2
        id="activity-heading"
        className="m-0 mb-4 font-heading text-[clamp(19px,2vw,24px)] font-bold leading-[1.15] tracking-[-0.025em]"
      >
        Recent activity
      </h2>
      <div className="border-t-2 border-text">
        {items.map((item) => (
          <Link
            key={`${item.ticketId}-${item.at}`}
            href={`/portal/${projectId}/tickets/${item.ticketId}`}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-neutral-300 py-3.5 transition-colors hover:text-accent-700"
          >
            <span className="min-w-0 text-[14.5px] leading-[1.5]">
              {ACTIVITY_WORDING[item.type]}{' '}
              <span className="font-semibold">{item.subject}</span>{' '}
              <span className="text-neutral-500">
                · {TICKET_KIND_LABELS[item.kind].toLowerCase()} {shortReference(item.ticketId)}
              </span>
            </span>
            <span className="text-[12.5px] leading-none text-neutral-700">
              {new Date(item.at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
