import type { Metadata } from 'next';
import { listTicketsForProject } from '@/lib/tickets';
import { supportState } from '@/lib/support';
import { portalProject } from '../../actions';
import { NewTicketForm } from '../NewTicketForm';
import { TicketList } from '../TicketBits';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Support tickets',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await portalProject(projectId);
  const tickets = await listTicketsForProject(project.id, 'support');
  const support = supportState(project.liveAt, project.supportDays);

  return (
    <div className="grid gap-8">
      {support.state === 'ended' ? (
        <div className="border-2 border-accent-600 p-6">
          <p className="m-0 text-[14.5px] leading-[1.6] text-neutral-800">
            <strong className="font-semibold text-text">
              Your support window has ended,
            </strong>{' '}
            but the door is open — send the ticket anyway and we will come back
            with options and a quote before any work starts. Nothing is charged
            without your go-ahead.
          </p>
        </div>
      ) : null}

      <NewTicketForm projectId={project.id} kind="support" />

      <section aria-labelledby="tickets-heading">
        <h2
          id="tickets-heading"
          className="m-0 mb-4 font-heading text-[clamp(19px,2vw,24px)] font-bold leading-[1.15] tracking-[-0.025em]"
        >
          Your tickets
        </h2>
        <TicketList
          tickets={tickets}
          projectId={project.id}
          emptyLine="Nothing raised yet. When you send a ticket it will appear here with its status."
        />
      </section>
    </div>
  );
}
