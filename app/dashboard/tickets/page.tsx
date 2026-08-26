import Link from 'next/link';
import { listTickets, TICKET_KIND_LABELS, TICKET_STATUS_LABELS, type TicketStatus } from '@/lib/tickets';
import { getProject } from '@/lib/portalProjects';
import { isDbConfigured, dbFile } from '@/lib/db';
import { requireSession, signOut } from '../actions';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<TicketStatus, string> = {
  open: 'border-accent-600 text-accent-700',
  in_progress: 'border-text text-text',
  waiting_client: 'border-neutral-400 text-neutral-700',
  closed: 'border-neutral-400 text-neutral-500',
};

export default async function TicketsAdminPage() {
  await requireSession();

  const configured = isDbConfigured();
  const tickets = configured ? await listTickets() : [];
  const projects = new Map(
    await Promise.all(
      [...new Set(tickets.map((t) => t.projectId))].map(
        async (id) => [id, await getProject(id)] as const
      )
    )
  );

  return (
    <main>
      <div className="mx-auto max-w-content px-gutter py-[clamp(40px,6vh,72px)]">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5 border-b-2 border-text pb-6">
          <div>
            <div className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-700">
              Digi Hook · Internal
            </div>
            <h1 className="m-0 font-heading text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              Tickets
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 border-2 border-text px-4 py-3.5 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
            >
              Proposals
            </Link>
            <Link
              href="/dashboard/portal"
              className="inline-flex items-center gap-2 border-2 border-text px-4 py-3.5 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
            >
              Portal clients
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="border-2 border-neutral-400 px-4 py-3.5 text-[14px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {!configured ? (
          <p className="m-0 mb-5 border-l-2 border-accent py-1 pl-4 text-[14.5px] leading-[1.55] text-accent-700">
            <strong className="font-heading">The database is unwritable.</strong> Could
            not open <code>{dbFile}</code>.
          </p>
        ) : null}

        {configured && tickets.length === 0 ? (
          <p className="m-0 py-12 text-[15.5px] leading-[1.6] text-neutral-700">
            No tickets yet. When a portal client raises one it lands here —
            anything awaiting a reply sorts to the top.
          </p>
        ) : null}

        {tickets.length > 0 ? (
          <div className="border-t-2 border-text">
            {tickets.map((ticket) => {
              const project = projects.get(ticket.projectId) ?? null;
              const awaiting = ticket.lastSender === 'client' && ticket.status !== 'closed';
              return (
                <Link
                  key={ticket.id}
                  href={`/dashboard/tickets/${ticket.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-b border-neutral-300 py-5 transition-colors hover:text-accent-700"
                >
                  <span className="min-w-0 flex-[1_1_320px]">
                    <span className="block font-heading text-[17px] font-bold leading-[1.3] tracking-[-0.015em]">
                      {ticket.subject}
                    </span>
                    <span className="mt-1.5 block text-[13.5px] leading-[1.5] text-neutral-700">
                      {project ? project.businessName : 'project removed'} ·{' '}
                      {TICKET_KIND_LABELS[ticket.kind]} ·{' '}
                      {new Date(ticket.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </span>
                  <span className="flex flex-none items-center gap-2.5">
                    {awaiting ? (
                      <span className="inline-flex items-center border-2 border-accent-600 bg-accent-600 px-2.5 py-1.5 text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-white">
                        Awaiting reply
                      </span>
                    ) : null}
                    {ticket.outOfSupport ? (
                      <span className="inline-flex items-center border border-accent-600 px-2.5 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-accent-700">
                        Out of support
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex items-center border px-2.5 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] ${STATUS_TONE[ticket.status]}`}
                    >
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
