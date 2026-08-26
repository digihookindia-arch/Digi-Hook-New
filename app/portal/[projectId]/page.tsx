import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { portalProject } from '../actions';
import { SupportPlanPanel } from './SupportPlanPanel';
import { PaymentSummary } from './PaymentSummary';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Project overview',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * The overview tab: support plan and payment summary, plus the two ways to
 * ask for something. The layout's ownership check covers the visitor; this
 * page's own `portalProject()` call is the one that is load bearing.
 */
export default async function PortalOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await portalProject(projectId);

  return (
    <div className="grid gap-6">
      <SupportPlanPanel project={project} />
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
    </div>
  );
}
