import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTicket, listAttachments, listMessages, TICKET_KIND_LABELS } from '@/lib/tickets';
import { shortReference } from '@/lib/emailTemplate';
import { portalProject } from '../../../actions';
import { ReplyForm } from '../../ReplyForm';
import {
  displayDateTime,
  OutOfSupportPill,
  PriorityPill,
  QuotePanel,
  ThreadView,
  TicketStatusPill,
} from '../../TicketBits';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ticket',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * One ticket's thread. Both kinds land here — a feature request is a ticket
 * with a different label. Ownership is checked against the signed-in client
 * AND the project in the URL, so a ticket id can never be read through
 * someone else's project path.
 */
export default async function TicketThreadPage({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}) {
  const { projectId, id } = await params;
  const { client, project } = await portalProject(projectId);

  const ticket = await getTicket(id);
  if (!ticket || ticket.clientId !== client.id || ticket.projectId !== project.id) {
    notFound();
  }
  const [messages, attachments] = await Promise.all([
    listMessages(ticket.id),
    listAttachments(ticket.id),
  ]);
  const backHref =
    ticket.kind === 'feature'
      ? `/portal/${project.id}/features`
      : `/portal/${project.id}/tickets`;

  return (
    <div>
      <Link
        href={backHref}
        className="text-[13.5px] font-semibold leading-none text-neutral-700 transition-colors hover:text-accent-700"
      >
        ← All {ticket.kind === 'feature' ? 'requests' : 'tickets'}
      </Link>

      <div className="mb-6 mt-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="m-0 font-heading text-[clamp(20px,2.4vw,28px)] font-bold leading-[1.15] tracking-[-0.028em]">
            {ticket.subject}
          </h2>
          <p className="m-0 mt-2 text-[13px] leading-[1.5] text-neutral-700">
            {TICKET_KIND_LABELS[ticket.kind]} · {shortReference(ticket.id)} · raised{' '}
            {displayDateTime(ticket.createdAt)}
            {ticket.pageUrl ? (
              <>
                {' · '}
                <a
                  href={ticket.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-700"
                >
                  affected page
                </a>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <PriorityPill priority={ticket.priority} />
          {ticket.outOfSupport ? <OutOfSupportPill /> : null}
          <TicketStatusPill status={ticket.status} />
        </div>
      </div>

      <div className="mb-6 empty:hidden">
        <QuotePanel ticket={ticket} />
      </div>

      {ticket.outOfSupport ? (
        <div className="mb-6 border-2 border-accent-600 p-5">
          <p className="m-0 text-[14px] leading-[1.6] text-neutral-800">
            This was raised after your support window ended, so we will agree a
            quote with you before any work starts.
          </p>
        </div>
      ) : null}

      <ThreadView
        messages={messages}
        attachments={attachments}
        hrefFor={(a) => `/portal/${project.id}/tickets/${ticket.id}/file/${a.id}`}
      />

      {ticket.status === 'closed' ? (
        <p className="m-0 mt-6 text-[14px] leading-[1.6] text-neutral-700">
          This ticket is closed. Replying below reopens it.
        </p>
      ) : null}
      <ReplyForm ticketId={ticket.id} />
    </div>
  );
}
