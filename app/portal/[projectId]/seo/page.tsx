import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { latestPageSpeed, latestStanding } from '@/lib/seoRecords';
import { fetchSearchPerformance, isSearchConsoleConfigured } from '@/lib/searchConsole';
import type { PortalProject } from '@/lib/portalProjects';
import { portalProject } from '../../actions';
import { SearchPerformancePanel } from './SearchPerformancePanel';
import { OffpagePanel, OnPagePanel, RankingPanel, TechnicalPanel } from './PillarPanels';
import { ActivityPanel, DeliverablesPanel, ReportsPanel } from './WorkPanels';
import { displayDate, PsiRow } from './bits';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SEO & Growth',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * The SEO & Growth tab, visible to every client in one of two states.
 *
 * Locked (no subscription): a sales page with live proof — the site's
 * current Google standing and its PageSpeed scores — a short read on the
 * four pillars, and the plan at ₹6,000/month + GST. Real numbers only;
 * every gap says so.
 *
 * Subscribed: the four pillars with real data (rankings vs ~30 days back,
 * PageSpeed + our weekly crawl, off-page counts) and the work record.
 * Clients see pillar summaries, never itemised issue lists — the studio
 * built these sites, and the itemised view is dashboard-only.
 *
 * House rule throughout: never promise a ranking or a traffic figure.
 */
export default async function SeoTabPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await portalProject(projectId);

  if (!project.seoActive) {
    return <LockedPreview project={project} />;
  }

  return (
    <div className="grid gap-6">
      <RankingPanel project={project} />
      <SearchPerformancePanel project={project} />
      <TechnicalPanel project={project} />
      <OnPagePanel project={project} />
      <OffpagePanel project={project} />
      <DeliverablesPanel project={project} />
      <ActivityPanel project={project} />
      <ReportsPanel project={project} />
      <p className="m-0 text-[13px] leading-[1.6] text-neutral-700">
        One promise we never make is a guaranteed position — nobody can
        honestly make it. What you see here is real data with its source named,
        and the work as it was done, so you can judge us by the numbers.
      </p>
    </div>
  );
}

/* ── the locked page: live proof, a short read, and the plan ───────────── */

const pillarExplainers: [string, string][] = [
  [
    'Technical SEO',
    'Speed, crawlability and clean structure — engineered into your build from day one.',
  ],
  [
    'On-page SEO',
    'Titles, content and structure matched to what your customers actually search.',
  ],
  [
    'Off-page SEO',
    'Links and mentions from other sites — the authority signals Google weighs.',
  ],
  [
    'Google ranking',
    'Where you appear for the searches that matter — tracked, worked on, reported.',
  ],
];

const planPoints = [
  'A keyword strategy, with up to 15 target keywords tracked weekly — every position shown against ~30 days back',
  'Technical and on-page monitoring of your site every week, with fixes done, not just found',
  'Off-page work, with a monthly backlink snapshot from a live link index',
  'A monthly report of the numbers and the work — what was done, and why',
];

async function LockedPreview({ project }: { project: PortalProject }) {
  const [standing, psi, search] = await Promise.all([
    latestStanding(project.id),
    latestPageSpeed(project.id),
    isSearchConsoleConfigured() && project.gscProperty
      ? fetchSearchPerformance(project.gscProperty)
      : Promise.resolve(null),
  ]);

  return (
    <div className="grid gap-6">
      {/* Live proof, part 1: where the site stands on Google right now. */}
      <section aria-labelledby="seo-standing-today" className="border-2 border-text p-7">
        <h2
          id="seo-standing-today"
          className="m-0 mb-5 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
        >
          Your Google standing today
        </h2>
        {standing ? (
          <>
            <div className="mb-1 font-heading text-[clamp(34px,4vw,48px)] font-extrabold leading-none tracking-[-0.04em]">
              {standing.keywordsTop100.toLocaleString('en-IN')}
            </div>
            <p className="m-0 max-w-[58ch] text-[15px] leading-[1.65] text-neutral-800">
              {standing.keywordsTop100 === 1 ? 'search shows' : 'searches show'}{' '}
              your website in Google&apos;s top 100 —{' '}
              <span className="font-semibold">
                {standing.keywordsTop10.toLocaleString('en-IN')}
              </span>{' '}
              of them on page one
              {standing.keywordsTop3 > 0 ? (
                <>
                  , <span className="font-semibold">{standing.keywordsTop3.toLocaleString('en-IN')}</span>{' '}
                  in the top three
                </>
              ) : null}
              .
            </p>
          </>
        ) : (
          <p className="m-0 max-w-[58ch] text-[15px] leading-[1.65] text-neutral-800">
            We&apos;re connecting the rank measurement for your site — your
            real standing appears here shortly. We never show made-up numbers.
          </p>
        )}
        {search?.totals ? (
          <p className="m-0 mt-3 text-[13.5px] leading-[1.6] text-neutral-700">
            Google Search Console: average position{' '}
            <span className="font-semibold">{search.totals.position.toFixed(1)}</span> across{' '}
            {search.totals.impressions.toLocaleString('en-IN')} appearances in
            the last 28 days.
          </p>
        ) : null}
        {standing ? (
          <p className="m-0 mt-4 text-[12.5px] leading-[1.6] text-neutral-700">
            Source: DataForSEO search index · checked {displayDate(standing.checkedOn)} ·
            refreshed monthly.
          </p>
        ) : null}
      </section>

      {/* Live proof, part 2: what Google's own tooling says about the build. */}
      <section aria-labelledby="seo-psi-today" className="border-2 border-text p-7">
        <h2
          id="seo-psi-today"
          className="m-0 mb-5 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
        >
          What Google&apos;s PageSpeed says
        </h2>
        {psi ? (
          <>
            <PsiRow scores={psi.scores} />
            <p className="m-0 mt-4 text-[12.5px] leading-[1.6] text-neutral-700">
              Measured by Google PageSpeed Insights (pagespeed.web.dev) ·
              mobile · {displayDate(psi.fetchedAt)}. These scores reflect the
              foundation your site was built on.
            </p>
          </>
        ) : (
          <p className="m-0 max-w-[58ch] text-[15px] leading-[1.65] text-neutral-800">
            Google is measuring your site right now — the scores land here
            shortly.
          </p>
        )}
      </section>

      {/* The short read. */}
      <section className="border-2 border-neutral-300 p-7">
        <h2 className="m-0 mb-3 font-heading text-[clamp(20px,2.4vw,28px)] font-bold leading-[1.15] tracking-[-0.028em]">
          SEO has four parts. Your build already covers the foundation.
        </h2>
        <ul className="m-0 grid list-none gap-3 p-0">
          {pillarExplainers.map(([name, line]) => (
            <li key={name} className="text-[14.5px] leading-[1.6] text-neutral-800">
              <span className="font-semibold text-text">{name}:</span> {line}
            </li>
          ))}
        </ul>
        <p className="m-0 mt-4 max-w-[62ch] text-[14.5px] leading-[1.65] text-neutral-800">
          The foundation ships with every site we build. Climbing for the
          searches that bring you business — and staying there — is continuous
          work. That is what the subscription covers.
        </p>
      </section>

      {/* The plan. */}
      <section className="border-2 border-text p-7">
        <h2 className="m-0 mb-1 font-heading text-[clamp(20px,2.4vw,28px)] font-bold leading-[1.15] tracking-[-0.028em]">
          Ongoing SEO — ₹6,000/month + GST
        </h2>
        <p className="m-0 mb-5 text-[14px] leading-[1.6] text-neutral-700">
          One site, everything below, cancel any month.
        </p>
        <ul className="m-0 mb-6 grid list-none gap-2.5 p-0">
          {planPoints.map((point) => (
            <li key={point} className="flex gap-3 text-[14.5px] leading-[1.6] text-neutral-800">
              <Check size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
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
          href={`/portal/${project.id}/features`}
          className="inline-flex min-h-[48px] items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-6 text-[15px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
        >
          Start ongoing SEO
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <p className="m-0 mt-3 text-[13px] leading-[1.6] text-neutral-700">
          Raise it as a feature request and we&apos;ll set it up — or just
          call, the number is below.
        </p>
      </section>
    </div>
  );
}
