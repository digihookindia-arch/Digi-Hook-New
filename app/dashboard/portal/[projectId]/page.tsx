import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Send, Trash2 } from 'lucide-react';
import { getProject, balanceInr } from '@/lib/portalProjects';
import { getClient, isActivated } from '@/lib/clients';
import { supportState } from '@/lib/support';
import { listAllTicketsForProject, TICKET_KIND_LABELS, TICKET_STATUS_LABELS } from '@/lib/tickets';
import { formatInr } from '@/lib/delivery';
import { listDocuments } from '@/lib/documents';
import { requireSession } from '../../actions';
import { deleteDocumentAction, removeProjectAction, sendPortalLinkAction } from '../actions';
import { ProjectEditor } from './ProjectEditor';
import { UploadDocumentForm } from './UploadDocumentForm';

export const dynamic = 'force-dynamic';

export default async function PortalProjectAdminPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireSession();

  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  const client = await getClient(project.clientId);
  const tickets = await listAllTicketsForProject(project.id);
  const documents = await listDocuments(project.id);
  const support = supportState(project.liveAt, project.supportDays);
  const balance = balanceInr(project);
  const awaiting = tickets.filter(
    (t) => t.lastSender === 'client' && t.status !== 'closed'
  ).length;

  return (
    <main>
      <div className="mx-auto max-w-content px-gutter py-[clamp(40px,6vh,72px)]">
        <Link
          href="/dashboard/portal"
          className="mb-8 inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase leading-none tracking-[0.1em] text-accent-700"
        >
          ← Portal clients
        </Link>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b-2 border-text pb-6">
          <div>
            <h1 className="m-0 mb-2 font-heading text-[clamp(28px,3.6vw,46px)] font-extrabold leading-[1.03] tracking-[-0.04em]">
              {project.businessName}
            </h1>
            <div className="text-[14.5px] leading-[1.6] text-neutral-800">
              {/* What the client currently sees, in one line. */}
              {support.state === 'active'
                ? `${support.daysLeft} support days remaining`
                : support.state === 'ended'
                  ? 'Support ended'
                  : 'Not live yet'}
              {balance !== null ? ` · ${formatInr(balance)} outstanding` : ' · payments hidden'}
            </div>
          </div>
          <Link
            href={`/portal/${project.id}`}
            target="_blank"
            className="inline-flex items-center gap-2 border-2 border-neutral-400 px-3.5 py-2.5 text-[13px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
          >
            <ExternalLink size={14} aria-hidden="true" />
            View as client
          </Link>
        </div>

        {/* Account access */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-2 border-text p-6">
          <div>
            <div className="mb-1.5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-neutral-700">
              Portal account
            </div>
            <div className="text-[15.5px] font-medium leading-[1.4]">
              {client ? (
                <>
                  {client.name} ·{' '}
                  <a href={`mailto:${client.email}`} className="text-accent-700">
                    {client.email}
                  </a>{' '}
                  ·{' '}
                  {isActivated(client)
                    ? 'active — has a password'
                    : 'invited — no password set yet'}
                </>
              ) : (
                'The linked account no longer exists.'
              )}
            </div>
          </div>
          {client ? (
            <form action={sendPortalLinkAction}>
              <input type="hidden" name="client" value={client.id} />
              <input type="hidden" name="project" value={project.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 border-2 border-text px-4 py-3 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
              >
                <Send size={14} aria-hidden="true" />
                {isActivated(client) ? 'Send password reset' : 'Resend invite'}
              </button>
            </form>
          ) : null}
        </div>

        <div className="mb-9">
          <ProjectEditor project={project} />
        </div>

        {/* This project's tickets */}
        <h2 className="m-0 mb-4 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.025em]">
          Tickets
          {awaiting > 0 ? (
            <span className="ml-3 align-middle border-2 border-accent-600 bg-accent-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
              {awaiting} awaiting reply
            </span>
          ) : null}
        </h2>
        {tickets.length === 0 ? (
          <p className="m-0 mb-9 text-[15px] leading-[1.6] text-neutral-700">
            Nothing raised from this project yet.
          </p>
        ) : (
          <div className="mb-9 border-t-2 border-text">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/tickets/${ticket.id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-neutral-300 py-4 transition-colors hover:text-accent-700"
              >
                <span className="min-w-0 flex-[1_1_320px]">
                  <span className="block text-[15.5px] font-semibold leading-[1.35]">
                    {ticket.subject}
                  </span>
                  <span className="mt-1 block text-[13px] leading-none text-neutral-700">
                    {TICKET_KIND_LABELS[ticket.kind]} ·{' '}
                    {new Date(ticket.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </span>
                <span className="text-[13px] font-semibold uppercase leading-none tracking-[0.06em] text-neutral-700">
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Documents shared with the client */}
        <h2 className="m-0 mb-4 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.025em]">
          Documents
        </h2>
        <div className="mb-4">
          <UploadDocumentForm projectId={project.id} />
        </div>
        {documents.length > 0 ? (
          <div className="mb-9 border-t-2 border-text">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-neutral-300 py-3.5"
              >
                <a
                  href={`/dashboard/portal/${project.id}/documents/file/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 text-[14.5px] font-semibold leading-[1.4] text-text transition-colors hover:text-accent-700"
                >
                  {doc.title}
                  <span className="ml-2 font-normal text-neutral-700">
                    {doc.filename}
                  </span>
                </a>
                <form action={deleteDocumentAction}>
                  <input type="hidden" name="id" value={doc.id} />
                  <input type="hidden" name="project" value={project.id} />
                  <button
                    type="submit"
                    className="border-2 border-neutral-400 px-3 py-2 text-[12.5px] font-medium leading-none text-neutral-800 transition-colors hover:border-accent-700 hover:text-accent-700"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 mb-9 text-[14px] leading-[1.6] text-neutral-700">
            Nothing shared yet.
          </p>
        )}

        <div className="border-t-2 border-text pt-6">
          <form action={removeProjectAction}>
            <input type="hidden" name="id" value={project.id} />
            <button
              type="submit"
              aria-label={`Delete the portal project for ${project.businessName}`}
              className="inline-flex items-center gap-2 border-2 border-neutral-400 px-3.5 py-3 text-[13px] font-medium leading-none text-neutral-800 transition-colors hover:border-accent-700 hover:text-accent-700"
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete project
            </button>
          </form>
          <p className="m-0 mt-2 text-[12.5px] leading-[1.55] text-neutral-700">
            Removes the project from the client&apos;s portal. Their account and
            any tickets stay on record.
          </p>
        </div>
      </div>
    </main>
  );
}
