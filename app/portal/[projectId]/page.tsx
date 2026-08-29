import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { supportState } from '@/lib/support';
import { formatInr } from '@/lib/delivery';
import { listAllTicketsForProject, recentActivityForProject } from '@/lib/tickets';
import { listWaitingDeliverables } from '@/lib/seoRecords';
import { waitingDays } from '@/lib/seoWork';
import { portalProject } from '../actions';
import { SupportPlanPanel } from './SupportPlanPanel';
import { ServerPlanPanel } from './ServerPlanPanel';
import { PaymentSummary } from './PaymentSummary';
import { WebsiteStatusCard } from './WebsiteStatusCard';
import { TrafficPanel } from './TrafficPanel';
import { PendingActions, ActivityFeed, type PendingAction } from './OverviewExtras';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Project overview',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * The overview tab, built around the spec's ten-second test: is my site up,
 * how much coverage remains, is anything waiting on me, what happened
 * recently, and how do I ask for something. The layout's ownership check
 * covers the visitor; this page's own `portalProject()` call is the one that
 * is load bearing.
 */
export default async function PortalOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await portalProject(projectId);

  const [tickets, activity, waitingDeliverables] = await Promise.all([
    listAllTicketsForProject(project.id),
    recentActivityForProject(project.id),
    project.seoActive ? listWaitingDeliverables(project.id) : Promise.resolve([]),
  ]);

  // "Is any action required from me?" — collected in one strip up top.
  const actions: PendingAction[] = [];
  for (const ticket of tickets) {
    if (ticket.status === 'closed') continue;
    if (ticket.quotedAt && !ticket.approvedAt && ticket.quoteInr !== null) {
      actions.push({
        text: `A quote of ${formatInr(ticket.quoteInr)} awaits your approval — "${ticket.subject}"`,
        href: `/portal/${project.id}/tickets/${ticket.id}`,
      });
    } else if (ticket.status === 'waiting_client') {
      actions.push({
        text: `We're waiting on your reply — "${ticket.subject}"`,
        href: `/portal/${project.id}/tickets/${ticket.id}`,
      });
    }
  }
  for (const deliverable of waitingDeliverables) {
    const waiting = waitingDays(deliverable.waitingSince);
    actions.push({
      text: `An SEO deliverable is waiting on you${waiting !== null && waiting > 0 ? ` (${waiting} ${waiting === 1 ? 'day' : 'days'} now)` : ''} — "${deliverable.title}"`,
      href: `/portal/${project.id}/seo`,
    });
  }
  const support = supportState(project.liveAt, project.supportDays);
  if (support.state === 'active' && support.daysLeft <= 30) {
    actions.push({
      text: `Your free support ends in ${support.daysLeft} ${support.daysLeft === 1 ? 'day' : 'days'} — ask us about the annual maintenance plan`,
      href: `/portal/${project.id}/tickets`,
    });
  }
  const server = supportState(project.serverAt, project.serverDays);
  if (server.state === 'active' && server.daysLeft <= 30) {
    actions.push({
      text: `Your complimentary server ends in ${server.daysLeft} ${server.daysLeft === 1 ? 'day' : 'days'} — renewal keeps hosting covered`,
      href: `/portal/${project.id}/tickets`,
    });
  } else if (server.state === 'ended') {
    actions.push({
      text: 'Your server coverage has ended — talk to us about renewal',
      href: `/portal/${project.id}/tickets`,
    });
  }

  return (
    <div className="grid gap-6">
      <PendingActions actions={actions} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6">
        <SupportPlanPanel project={project} />
        <ServerPlanPanel project={project} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6">
        {project.siteUrl ? <WebsiteStatusCard siteUrl={project.siteUrl} /> : null}
        <TrafficPanel project={project} />
      </div>

      <PaymentSummary project={project} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-6">
        <Link
          href={`/portal/${project.id}/tickets`}
          className="group border-2 border-neutral-300 p-6 transition-colors hover:border-text"
        >
          <span className="mb-2 flex items-center justify-between font-heading text-[18px] font-bold leading-[1.2] tracking-[-0.02em]">
            Raise a ticket
            <ArrowRight
              size={18}
              aria-hidden="true"
              className="text-accent transition-transform group-hover:translate-x-1"
            />
          </span>
          <span className="block text-[14px] leading-[1.6] text-neutral-700">
            Something broken, or not behaving as it should? Tell us and we will
            get on it.
          </span>
        </Link>
        <Link
          href={`/portal/${project.id}/features`}
          className="group border-2 border-neutral-300 p-6 transition-colors hover:border-text"
        >
          <span className="mb-2 flex items-center justify-between font-heading text-[18px] font-bold leading-[1.2] tracking-[-0.02em]">
            Request a feature
            <ArrowRight
              size={18}
              aria-hidden="true"
              className="text-accent transition-transform group-hover:translate-x-1"
            />
          </span>
          <span className="block text-[14px] leading-[1.6] text-neutral-700">
            Something new you would like added? Describe it and we will come
            back with scope and a quote.
          </span>
        </Link>
      </div>

      <ActivityFeed items={activity} projectId={project.id} />
    </div>
  );
}
