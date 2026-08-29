import Link from 'next/link';
import { ArrowRight, Check, Paperclip } from 'lucide-react';
import {
  PRIORITY_SHORT,
  TICKET_STATUS_LABELS,
  type Ticket,
  type TicketAttachment,
  type TicketMessage,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/tickets';
import { formatInr } from '@/lib/delivery';
import { shortReference } from '@/lib/emailTemplate';
import { approveQuoteAction } from '../actions';

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
            {ticket.quotedAt && !ticket.approvedAt && ticket.status !== 'closed' ? (
              <span className="inline-flex items-center border-2 border-accent-600 bg-accent-600 px-2.5 py-1.5 text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-white">
                Quote ready
              </span>
            ) : null}
            <PriorityPill priority={ticket.priority} />
            {ticket.outOfSupport ? <OutOfSupportPill /> : null}
            <TicketStatusPill status={ticket.status} />
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function PriorityPill({ priority }: { priority: TicketPriority }) {
  if (priority === 'normal') return null;
  const tone =
    priority === 'urgent'
      ? 'border-accent-600 bg-accent-600 text-white'
      : priority === 'high'
        ? 'border-accent-600 text-accent-700'
        : 'border-neutral-400 text-neutral-700';
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] ${tone}`}
    >
      {PRIORITY_SHORT[priority]}
    </span>
  );
}

/** Per-message attachment links; hrefFor keeps portal and dashboard URLs apart. */
export function AttachmentLinks({
  attachments,
  hrefFor,
}: {
  attachments: TicketAttachment[];
  hrefFor: (attachment: TicketAttachment) => string;
}) {
  if (attachments.length === 0) return null;
  return (
    <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <a
            href={hrefFor(attachment)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[36px] items-center gap-2 border border-neutral-400 px-3 text-[12.5px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
          >
            <Paperclip size={12} aria-hidden="true" />
            {attachment.filename}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ThreadView({
  messages,
  attachments = [],
  hrefFor,
}: {
  messages: TicketMessage[];
  attachments?: TicketAttachment[];
  hrefFor?: (attachment: TicketAttachment) => string;
}) {
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
          {hrefFor ? (
            <AttachmentLinks
              attachments={attachments.filter((a) => a.messageId === message.id)}
              hrefFor={hrefFor}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * The quote-and-approve panel on a quoted feature request. Approval is the
 * spec's core idea done lean: one deliberate button, a recorded timestamp,
 * nothing starting before it.
 */
export function QuotePanel({ ticket }: { ticket: Ticket }) {
  if (!ticket.quotedAt || ticket.quoteInr === null) return null;

  return (
    <section
      aria-labelledby="quote-heading"
      className={`border-2 p-6 ${ticket.approvedAt ? 'border-neutral-300' : 'border-accent-600'}`}
    >
      <h2
        id="quote-heading"
        className="m-0 mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
      >
        Your quote
      </h2>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-heading text-[clamp(26px,3vw,36px)] font-extrabold leading-none tracking-[-0.03em]">
          {formatInr(ticket.quoteInr)}
        </span>
        <span className="text-[13.5px] leading-none text-neutral-700">
          plus applicable GST
        </span>
      </div>
      {ticket.quoteNote ? (
        <p className="m-0 mt-3 max-w-[60ch] whitespace-pre-wrap text-[14.5px] leading-[1.6] text-neutral-800">
          {ticket.quoteNote}
        </p>
      ) : null}

      {ticket.approvedAt ? (
        <p className="m-0 mt-4 inline-flex items-center gap-2 text-[14px] font-semibold leading-none text-accent-700">
          <Check size={15} aria-hidden="true" />
          Approved on {displayDateTime(ticket.approvedAt)}
          {ticket.quotePaidAt ? ' · payment received, thank you' : ''}
        </p>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <form action={approveQuoteAction}>
            <input type="hidden" name="ticket" value={ticket.id} />
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
            >
              <Check size={16} aria-hidden="true" />
              Approve this quote
            </button>
          </form>
          <span className="text-[13px] leading-[1.5] text-neutral-700">
            Nothing starts until you approve. Questions? Just reply below.
          </span>
        </div>
      )}
    </section>
  );
}
