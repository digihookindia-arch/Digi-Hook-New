import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { portalProject } from '../../actions';
import { SearchPerformancePanel } from './SearchPerformancePanel';
import { AuditReportPanel } from './AuditReportPanel';
import { ActivityPanel, DeliverablesPanel, ReportsPanel } from './WorkPanels';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SEO & Growth',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * The SEO & Growth tab, visible to every client in one of two states: the
 * truthful locked preview (the site's foundation is SEO-ready; ongoing SEO
 * is a separate service), or the live workspace for subscribed projects —
 * Google's search numbers and our own weekly technical audit. The flag is
 * `seoActive` on the project, set from the dashboard.
 *
 * House rule carried over from the spec: never promise a ranking or a
 * traffic figure, anywhere on this page.
 */
export default async function SeoTabPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await portalProject(projectId);

  if (!project.seoActive) {
    return <LockedPreview projectId={project.id} />;
  }

  return (
    <div className="grid gap-6">
      <SearchPerformancePanel project={project} />
      <AuditReportPanel project={project} />
      <DeliverablesPanel project={project} />
      <ActivityPanel project={project} />
      <ReportsPanel project={project} />
      <p className="m-0 text-[13px] leading-[1.6] text-neutral-700">
        One promise we never make is a guaranteed position — nobody can
        honestly make it. What you see here is the same data Google shows us,
        and every check our crawler runs, so you can judge the work by its
        numbers.
      </p>
    </div>
  );
}

const foundationPoints = [
  'Server-rendered pages that search engines read directly',
  'A unique title and description on every page',
  'Structured data describing your business to Google',
  'A sitemap and robots file that keep crawling clean',
  'A performance-minded build — speed is a ranking signal',
];

const ongoingPoints = [
  'Keyword strategy around what your customers actually search',
  'Your search clicks, impressions and average position, straight from Google Search Console',
  'A weekly technical audit by our own crawler, every issue tracked until fixed',
  'On-page optimisation, content planning and authority building over time',
];

function LockedPreview({ projectId }: { projectId: string }) {
  return (
    <div className="grid gap-6">
      <section className="border-2 border-text p-7">
        <h2 className="m-0 mb-3 font-heading text-[clamp(20px,2.4vw,28px)] font-bold leading-[1.15] tracking-[-0.028em]">
          Your website is built on an SEO-ready foundation.
        </h2>
        <p className="m-0 mb-5 max-w-[62ch] text-[15px] leading-[1.65] text-neutral-800">
          The groundwork search engines look for went in when your site was
          built — none of it is an extra:
        </p>
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {foundationPoints.map((point) => (
            <li key={point} className="flex gap-3 text-[14.5px] leading-[1.6] text-neutral-800">
              <Check size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-2 border-neutral-300 p-7">
        <h2 className="m-0 mb-3 font-heading text-[clamp(20px,2.4vw,28px)] font-bold leading-[1.15] tracking-[-0.028em]">
          Ongoing SEO is a separate growth service.
        </h2>
        <p className="m-0 mb-5 max-w-[62ch] text-[15px] leading-[1.65] text-neutral-800">
          A sound foundation makes your site eligible to rank; climbing and
          staying there is continuous work. Subscribed projects see that work
          — and its results — right here:
        </p>
        <ul className="m-0 mb-6 grid list-none gap-2.5 p-0">
          {ongoingPoints.map((point) => (
            <li key={point} className="flex gap-3 text-[14.5px] leading-[1.6] text-neutral-800">
              <ArrowRight size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
              {point}
            </li>
          ))}
        </ul>
        <p className="m-0 mb-6 max-w-[62ch] border-l-2 border-accent pl-4 text-[14px] leading-[1.65] text-neutral-700">
          One promise we never make is a guaranteed position or a traffic
          figure — nobody can honestly make it. We commit to the work, and to
          numbers you can check us against.
        </p>
        <Link
          href={`/portal/${projectId}/features`}
          className="inline-flex min-h-[48px] items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-6 text-[15px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
        >
          Ask about ongoing SEO
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <p className="m-0 mt-3 text-[13px] leading-[1.6] text-neutral-700">
          Raise it as a feature request and we&apos;ll come back with scope and
          pricing — or just call, the number is below.
        </p>
      </section>
    </div>
  );
}
