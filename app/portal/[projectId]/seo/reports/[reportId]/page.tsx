import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReport } from '@/lib/seoRecords';
import {
  DELIVERABLE_STATUS_LABELS,
  SEO_CATEGORY_LABELS,
  monthLabel,
} from '@/lib/seoWork';
import { portalProject } from '../../../../actions';
import { pathOf, pct, RowsTable, Stat } from '../../bits';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Monthly SEO report',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

const sectionHeading = (text: string) => (
  <h3 className="m-0 mb-4 font-heading text-[19px] font-bold leading-[1.2] tracking-[-0.022em]">
    {text}
  </h3>
);

/**
 * One published monthly report, rendered entirely from its frozen snapshot —
 * the numbers here are what was known at generation, on purpose, so the
 * record never quietly repaints. Clients only ever see published reports;
 * drafts 404 like everything else that is not theirs to see.
 */
export default async function SeoReportPage({
  params,
}: {
  params: Promise<{ projectId: string; reportId: string }>;
}) {
  const { projectId, reportId } = await params;
  const { project } = await portalProject(projectId);

  const report = await getReport(reportId, project.id);
  if (!report || report.status !== 'published' || !report.data) notFound();
  const data = report.data;

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href={`/portal/${project.id}/seo`}
          className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase leading-none tracking-[0.1em] text-accent-700"
        >
          ← SEO &amp; Growth
        </Link>
        <h2 className="m-0 mt-4 font-heading text-[clamp(24px,3vw,36px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
          SEO report — {monthLabel(report.month)}
        </h2>
        <p className="m-0 mt-2 text-[13px] leading-[1.6] text-neutral-700">
          Published{' '}
          {report.publishedAt
            ? new Date(report.publishedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : ''}{' '}
          · the figures are frozen as gathered on{' '}
          {new Date(report.generatedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          .
        </p>
      </div>

      {report.summary ? (
        <section className="border-2 border-text p-7">
          {sectionHeading('The month, in short')}
          <p className="m-0 max-w-[64ch] whitespace-pre-line text-[15.5px] leading-[1.7] text-neutral-800">
            {report.summary}
          </p>
        </section>
      ) : null}

      <section className="border-2 border-text p-7">
        {sectionHeading('What Google recorded')}
        {!data.search ? (
          <p className="m-0 max-w-[58ch] text-[15px] leading-[1.65] text-neutral-800">
            Search Console was not readable when this report was generated, so
            no search figures are shown — we don&apos;t fill gaps with zeros.
          </p>
        ) : !data.search.totals ? (
          <p className="m-0 max-w-[58ch] text-[15px] leading-[1.65] text-neutral-800">
            Google recorded no search impressions for this month — normal for
            a newly connected property.
          </p>
        ) : (
          <>
            <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-x-6 gap-y-5">
              <Stat
                label="Clicks"
                value={data.search.totals.clicks.toLocaleString('en-IN')}
                sub={
                  data.search.previousTotals
                    ? `previous month: ${data.search.previousTotals.clicks.toLocaleString('en-IN')}`
                    : null
                }
              />
              <Stat
                label="Impressions"
                value={data.search.totals.impressions.toLocaleString('en-IN')}
                sub={
                  data.search.previousTotals
                    ? `previous month: ${data.search.previousTotals.impressions.toLocaleString('en-IN')}`
                    : null
                }
              />
              <Stat
                label="Click rate"
                value={pct(data.search.totals.ctr)}
                sub={
                  data.search.previousTotals
                    ? `previous month: ${pct(data.search.previousTotals.ctr)}`
                    : null
                }
              />
              <Stat
                label="Avg. position"
                value={data.search.totals.position.toFixed(1)}
                sub={
                  data.search.previousTotals
                    ? `previous month: ${data.search.previousTotals.position.toFixed(1)}`
                    : null
                }
              />
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-6">
              <RowsTable
                caption="What people searched"
                keyHeader="Query"
                rows={data.search.topQueries}
                showPosition
                toKeyLabel={(key) => key}
              />
              <RowsTable
                caption="Where they landed"
                keyHeader="Page"
                rows={data.search.topPages}
                showPosition={false}
                toKeyLabel={pathOf}
              />
            </div>
            {data.search.pagesInSearch > 0 ? (
              <p className="m-0 mt-6 text-[14px] leading-[1.6] text-neutral-800">
                <span className="font-semibold">
                  {data.search.pagesInSearch.toLocaleString('en-IN')}
                </span>{' '}
                {data.search.pagesInSearch === 1 ? 'page' : 'pages'} appeared in Google
                results this month.
              </p>
            ) : null}
          </>
        )}
        <p className="m-0 mt-5 text-[12.5px] leading-[1.6] text-neutral-700">
          Source: Google Search Console. Google publishes its data a few days
          behind, so a report generated early in the month may miss the final
          days.
        </p>
      </section>

      <section className="border-2 border-text p-7">
        {sectionHeading('Technical health')}
        {!data.audit ? (
          <p className="m-0 max-w-[58ch] text-[15px] leading-[1.65] text-neutral-800">
            No completed audit was on record for this month.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
              <div>
                <span className="font-heading text-[clamp(24px,2.6vw,32px)] font-extrabold leading-none tracking-[-0.03em]">
                  {data.audit.pages}
                </span>{' '}
                <span className="text-[14px] text-neutral-800">pages checked</span>
              </div>
              <div>
                <span className="font-heading text-[clamp(24px,2.6vw,32px)] font-extrabold leading-none tracking-[-0.03em]">
                  {data.audit.counts.error}
                </span>{' '}
                <span className="text-[14px] text-neutral-800">critical</span>
              </div>
              <div>
                <span className="font-heading text-[clamp(24px,2.6vw,32px)] font-extrabold leading-none tracking-[-0.03em]">
                  {data.audit.counts.warning}
                </span>{' '}
                <span className="text-[14px] text-neutral-800">warnings</span>
              </div>
              <div>
                <span className="font-heading text-[clamp(24px,2.6vw,32px)] font-extrabold leading-none tracking-[-0.03em]">
                  {data.audit.counts.notice}
                </span>{' '}
                <span className="text-[14px] text-neutral-800">notices</span>
              </div>
            </div>
            {data.audit.delta ? (
              <p className="m-0 mt-4 text-[14px] leading-[1.6] text-neutral-800">
                Across the month:{' '}
                <span className="font-semibold">{data.audit.delta.resolvedCount} resolved</span>
                {' · '}
                <span className="font-semibold">{data.audit.delta.newCount} new</span>.
              </p>
            ) : null}
            <p className="m-0 mt-4 text-[12.5px] leading-[1.6] text-neutral-700">
              Source: Digi Hook&apos;s own crawler · site as checked on{' '}
              {new Date(data.audit.checkedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              .
            </p>
          </>
        )}
      </section>

      <section className="border-2 border-text p-7">
        {sectionHeading('The work we did, and why')}
        {data.activities.length === 0 ? (
          <p className="m-0 max-w-[58ch] text-[15px] leading-[1.65] text-neutral-800">
            No work entries were logged for this month.
          </p>
        ) : (
          <div className="border-t-2 border-text">
            {data.activities.map((activity, index) => (
              <div key={index} className="border-b border-neutral-300 py-4">
                <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-[11.5px] font-bold uppercase leading-none tracking-[0.08em] text-accent-700">
                    {SEO_CATEGORY_LABELS[activity.category]}
                  </span>
                  <span className="text-[12.5px] leading-none text-neutral-700">
                    {new Date(activity.happenedOn).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <div className="text-[14.5px] font-semibold leading-[1.5]">{activity.work}</div>
                <div className="mt-1 text-[13.5px] leading-[1.6] text-neutral-700">
                  <span className="font-semibold text-neutral-800">Why:</span> {activity.reason}
                </div>
                {activity.result ? (
                  <div className="mt-0.5 text-[13.5px] leading-[1.6] text-neutral-700">
                    <span className="font-semibold text-neutral-800">Result:</span>{' '}
                    {activity.result}
                  </div>
                ) : null}
                {activity.evidence ? (
                  <div className="mt-0.5 text-[13px] leading-[1.6] text-neutral-700">
                    Evidence: {activity.evidence}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {data.deliverablesDone.length > 0 || data.deliverablesOpen.length > 0 ? (
        <section className="border-2 border-text p-7">
          {sectionHeading('Deliverables')}
          <div className="border-t-2 border-text">
            {[...data.deliverablesDone, ...data.deliverablesOpen].map((deliverable, index) => (
              <div
                key={index}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 border-b border-neutral-300 py-3"
              >
                <span className="min-w-0 flex-[1_1_260px] text-[14.5px] leading-[1.5]">
                  {deliverable.title}
                </span>
                <span className="text-[12.5px] font-semibold uppercase leading-none tracking-[0.06em] text-neutral-700">
                  {DELIVERABLE_STATUS_LABELS[deliverable.status]}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {report.priorities ? (
        <section className="border-2 border-text p-7">
          {sectionHeading('Next month, we focus on')}
          <p className="m-0 max-w-[64ch] whitespace-pre-line text-[15px] leading-[1.7] text-neutral-800">
            {report.priorities}
          </p>
        </section>
      ) : null}

      <p className="m-0 text-[13px] leading-[1.6] text-neutral-700">
        As always: we never promise a position or a traffic figure — this
        report shows the same data Google shows us, and the work as it was
        done.
      </p>
    </div>
  );
}
