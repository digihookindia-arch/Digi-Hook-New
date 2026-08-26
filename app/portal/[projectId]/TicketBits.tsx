import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  TICKET_STATUS_LABELS,
  type Ticket,
  type TicketMessage,
  type TicketStatus,
} from '@/lib/tickets';
import { shortReference } from '@/lib/emailTemplate';

/**
 * Server-rendered pieces shared by the tickets and feature-request tabs and
 * the thread page. The forms (which need client state) live in their own
 * files; everything here is display only.
 */

/**
 * waiting_client is the one state that needs the client to act, so it is the
 * only filled pill (white on accent-600 measures 4.74:1 and passes AA — bare
 * accent would not).
 */
const STATUS_TONE: Record<TicketStatus, string> = {
  open: 'border-accent-600 text-accent-700',
  in_progress: 'border-text text-text',
  waiting_client: 'border-accent-600 bg-accent-600 text-white',
  closed: 'border-neutral-400 text-neutral-700',
};

export function TicketStatusPill({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] ${STATUS_TONE[status]}`}
    >
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}

export function OutOfSupportPill() {
  return (
    <span className="inline-flex items-center border border-accent-600 px-2.5 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-accent-700">
      Outside support
    </span>
  );
}

export function displayDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function TicketList({
  tickets,
  projectId,
  emptyLine,
}: {
  tickets: Ticket[];
  projectId: string;
  emptyLine: string;
}) {
  if (tickets.length === 0) {
    return <p className="m-0 text-[15px] leading-[1.6] text-neutral-700">{emptyLine}</p>;
  }

  return (
    <div className="border-t-2 border-text">
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          href={`/portal/${projectId}/tickets/${ticket.id}`}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-neutral-300 py-5 transition-colors hover:text-accent-700"
        >
          <span className="min-w-0">
            <span className="block font-heading text-[16px] font-bold leading-[1.3] tracking-[-0.015em]">
              {ticket.subject}
            </span>
            <span className="mt-1 block text-[12.5px] leading-none text-neutral-700">
              {shortReference(ticket.id)} · {displayDateTime(ticket.createdAt)}
            </span>
          </span>
          <span className="flex items-center gap-2.5">
            {ticket.outOfSupport ? <OutOfSupportPill /> : null}
            <TicketStatusPill status={ticket.status} />
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ThreadView({ messages }: { messages: TicketMessage[] }) {
  return (
    <div className="border-t-2 border-text">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`border-b border-neutral-300 py-5 ${
            message.author === 'studio' ? 'border-l-2 border-l-accent-600 pl-5' : ''
          }`}
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
              {message.author === 'studio' ? 'Digi Hook' : 'You'}
            </span>
            <span className="text-[12.5px] leading-none text-neutral-700">
              {displayDateTime(message.createdAt)}
            </span>
          </div>
          <p className="m-0 whitespace-pre-wrap text-[15px] leading-[1.65] text-neutral-800">
            {message.body}
          </p>
        </div>
      ))}
    </div>
  );
}
