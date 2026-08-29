import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getTicket,
  listAttachments,
  listMessages,
  PRIORITY_SHORT,
  TICKET_KIND_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
} from '@/lib/tickets';
import { getProject } from '@/lib/portalProjects';
import { getClient } from '@/lib/clients';
import { formatInr } from '@/lib/delivery';
import { shortReference } from '@/lib/emailTemplate';
import { requireSession } from '../../actions';
import { setQuotePaidAction, setTicketStatusAction } from '../actions';
import { StudioReplyForm } from './StudioReplyForm';
import { QuoteForm } from './QuoteForm';
import { AttachmentLinks } from '../../../portal/[projectId]/TicketBits';

export const dynamic = 'force-dynamic';

export default async function TicketAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();

  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();

  // Neither has a foreign key on purpose — a deleted project or account must
  // degrade to a label here, not take the ticket history down with it.
  const [project, client, messages, attachments] = await Promise.all([
    getProject(ticket.projectId),
    getClient(ticket.clientId),
    listMessages(ticket.id),
    listAttachments(ticket.id),
  ]);

  return (
    <main>
      <div className="mx-auto max-w-content px-gutter py-[clamp(40px,6vh,72px)]">
        <Link
          href="/dashboard/tickets"
          className="mb-8 inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase leading-none tracking-[0.1em] text-accent-700"
        >
          ← Tickets
        </Link>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b-2 border-text pb-6">
          <div className="min-w-0">
            <h1 className="m-0 mb-2 font-heading text-[clamp(26px,3.2vw,42px)] font-extrabold leading-[1.06] tracking-[-0.038em]">
              {ticket.subject}
            </h1>
            <div className="text-[14.5px] leading-[1.6] text-neutral-800">
              {TICKET_KIND_LABELS[ticket.kind]} · {PRIORITY_SHORT[ticket.priority]}{' '}
              priority · {shortReference(ticket.id)} ·{' '}
              {ticket.pageUrl ? (
                <>
                  <a
                    href={ticket.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-700"
                  >
                    affected page
                  </a>{' '}
                  ·{' '}
                </>
              ) : null}
              {project ? (
                <Link
                  href={`/dashboard/portal/${project.id}`}
                  className="text-accent-700"
                >
                  {project.businessName}
                </Link>
              ) : (
                'project removed'
              )}{' '}
              ·{' '}
              {client ? (
                <a href={`mailto:${client.email}`} className="text-accent-700">
                  {client.name}
                </a>
              ) : (
                'account removed'
              )}{' '}
              · {new Date(ticket.createdAt).toLocaleString('en-IN')}
            </div>
          </div>

          <form action={setTicketStatusAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={ticket.id} />
            <label className="block">
              <span className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
                Status
              </span>
              <select
                name="status"
                defaultValue={ticket.status}
                className="border-2 border-neutral-400 bg-bg px-3.5 py-3 text-[14.5px] leading-none text-text"
              >
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TICKET_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="border-2 border-text px-4 py-3 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
            >
              Update
            </button>
          </form>
        </div>

        {ticket.outOfSupport ? (
          <div className="mb-6 border-2 border-accent-600 p-5">
            <p className="m-0 text-[14px] leading-[1.6] text-neutral-800">
              <strong className="font-semibold text-text">Out of support.</strong>{' '}
              Raised after the support window ended — agree a quote with the
              client before starting work. The client has already been told this.
            </p>
          </div>
        ) : null}

        {/* The quote loop — the studio's half. Feature requests only. */}
        {ticket.kind === 'feature' ? (
          <div className="mb-8 grid gap-4">
            {ticket.quotedAt ? (
              <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-neutral-300 p-5">
                <p className="m-0 text-[14.5px] leading-[1.6] text-neutral-800">
                  Quoted{' '}
                  <strong className="font-semibold text-text">
                    {ticket.quoteInr !== null ? formatInr(ticket.quoteInr) : '—'} + GST
                  </strong>{' '}
                  on {new Date(ticket.quotedAt).toLocaleDateString('en-IN')} ·{' '}
                  {ticket.approvedAt
                    ? `approved by the client on ${new Date(ticket.approvedAt).toLocaleDateString('en-IN')}`
                    : 'awaiting the client'}
                  {ticket.quotePaidAt ? ' · PAID' : ''}
                </p>
                {ticket.approvedAt ? (
                  <form action={setQuotePaidAction}>
                    <input type="hidden" name="id" value={ticket.id} />
                    <input
                      type="hidden"
                      name="paid"
                      value={ticket.quotePaidAt ? 'no' : 'yes'}
                    />
                    <button
                      type="submit"
                      className="border-2 border-text px-4 py-3 text-[13.5px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
                    >
                      {ticket.quotePaidAt ? 'Unmark paid' : 'Mark paid'}
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
            <QuoteForm ticket={ticket} />
          </div>
        ) : null}

        <div className="border-t-2 border-text">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`border-b border-neutral-300 py-5 ${
                message.author === 'client' ? 'border-l-2 border-l-accent-600 pl-5' : ''
              }`}
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
                  {message.author === 'client'
                    ? (client?.name ?? 'Client')
                    : 'Digi Hook'}
                </span>
                <span className="text-[12.5px] leading-none text-neutral-700">
                  {new Date(message.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <p className="m-0 whitespace-pre-wrap text-[15px] leading-[1.65] text-neutral-800">
                {message.body}
              </p>
              <AttachmentLinks
                attachments={attachments.filter((a) => a.messageId === message.id)}
                hrefFor={(a) => `/dashboard/tickets/${ticket.id}/file/${a.id}`}
              />
            </div>
          ))}
        </div>

        <StudioReplyForm ticketId={ticket.id} />
      </div>
    </main>
  );
}
