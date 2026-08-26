import type { Metadata } from 'next';
import { listTicketsForProject } from '@/lib/tickets';
import { portalProject } from '../../actions';
import { NewTicketForm } from '../NewTicketForm';
import { TicketList } from '../TicketBits';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Feature requests',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * Same machinery as the tickets tab, wired to kind='feature'. Feature
 * requests are never flagged out-of-support — new work is quotable work
 * whatever the support plan says — so there is no expiry notice here.
 */
export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await portalProject(projectId);
  const requests = await listTicketsForProject(project.id, 'feature');

  return (
    <div className="grid gap-8">
      <NewTicketForm projectId={project.id} kind="feature" />

      <section aria-labelledby="features-heading">
        <h2
          id="features-heading"
          className="m-0 mb-4 font-heading text-[clamp(19px,2vw,24px)] font-bold leading-[1.15] tracking-[-0.025em]"
        >
          Your requests
        </h2>
        <TicketList
          tickets={requests}
          projectId={project.id}
          emptyLine="Nothing requested yet. When you send a request it will appear here with its status."
        />
      </section>
    </div>
  );
}
