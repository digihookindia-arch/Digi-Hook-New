import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Play, Trash2 } from 'lucide-react';
import { getProject } from '@/lib/portalProjects';
import { latestAudit } from '@/lib/seoAudits';
import { isSearchConsoleConfigured } from '@/lib/searchConsole';
import {
  DELIVERABLE_STATUSES,
  DELIVERABLE_STATUS_LABELS,
  SEO_CATEGORY_LABELS,
  monthLabel,
  previousMonthKey,
  waitingDays,
} from '@/lib/seoWork';
import { listActivities, listDeliverables, listReports } from '@/lib/seoRecords';
import { requireSession } from '../../../actions';
import {
  addSeoDeliverableAction,
  deleteSeoActivityAction,
  deleteSeoDeliverableAction,
  deleteSeoReportAction,
  runSeoAuditAction,
  setActivityResultAction,
  setDeliverableStatusAction,
} from '../../actions';
import { ActivityForm } from './ActivityForm';
import { GenerateReportForm, ReportEditor } from './ReportTools';

export const dynamic = 'force-dynamic';

const smallButton =
  'border-2 border-neutral-400 px-3 py-2 text-[12.5px] font-medium leading-none text-neutral-800 transition-colors hover:border-accent-700 hover:text-accent-700';

/**
 * The studio's SEO workbench for one project: audit + Search Console
 * status, the client-visible activity log, deliverables, and the monthly
 * reports. Everything written here renders on the client's SEO tab, so the
 * forms enforce the same honesty rules the tab promises.
 */
export default async function SeoAdminPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireSession();

  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  const [audit, activities, deliverables, reports] = await Promise.all([
    latestAudit(project.id),
    listActivities(project.id, 20),
    listDeliverables(project.id),
    listReports(project.id),
  ]);
  const doneCount = deliverables.filter((d) => d.status === 'done').length;

  return (
    <main>
      <div className="mx-auto max-w-content px-gutter py-[clamp(40px,6vh,72px)]">
        <Link
          href={`/dashboard/portal/${project.id}`}
          className="mb-8 inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase leading-none tracking-[0.1em] text-accent-700"
        >
          ← {project.businessName}
        </Link>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b-2 border-text pb-6">
          <div>
            <h1 className="m-0 mb-2 font-heading text-[clamp(28px,3.6vw,46px)] font-extrabold leading-[1.03] tracking-[-0.04em]">
              SEO &amp; Growth
            </h1>
            <div className="text-[14.5px] leading-[1.6] text-neutral-800">
              {project.businessName} ·{' '}
              {project.seoActive
                ? 'subscription active — the client sees the workspace'
                : 'subscription off — the client sees the locked preview'}
            </div>
          </div>
          <Link
            href={`/portal/${project.id}/seo`}
            target="_blank"
            className="inline-flex items-center gap-2 border-2 border-neutral-400 px-3.5 py-2.5 text-[13px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
          >
            <ExternalLink size={14} aria-hidden="true" />
            View as client
          </Link>
        </div>

        {/* Data sources */}
        <div className="mb-9 border-2 border-text p-6">
          <div className="mb-4 grid gap-2 text-[14.5px] leading-[1.6]">
            <div>
              <span className="font-semibold">Search Console:</span>{' '}
              {!isSearchConsoleConfigured()
                ? 'GSC_KEY_FILE is not set on the server — the search panel shows "being connected".'
                : project.gscProperty
                  ? `reading ${project.gscProperty} (the service account must be a user on that property).`
                  : 'no property set — add it on the project page.'}
            </div>
            <div>
              <span className="font-semibold">Site audit:</span>{' '}
              {!audit
                ? 'none yet.'
                : audit.status === 'running'
                  ? `running since ${new Date(audit.startedAt).toLocaleString('en-IN')} — refresh in a minute.`
                  : audit.status === 'failed'
                    ? `last attempt failed (${new Date(audit.startedAt).toLocaleDateString('en-IN')}) — check the server log.`
                    : `${new Date(audit.startedAt).toLocaleDateString('en-IN')} · ${audit.pages} pages · ${audit.errors} critical, ${audit.warnings} warnings, ${audit.notices} notices.`}
            </div>
          </div>
          {project.siteUrl ? (
            <form action={runSeoAuditAction}>
              <input type="hidden" name="project" value={project.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 border-2 border-text px-4 py-3 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
              >
                <Play size={14} aria-hidden="true" />
                Run audit now
              </button>
            </form>
          ) : (
            <p className="m-0 text-[13.5px] leading-[1.6] text-neutral-700">
              Set the live site URL on the project page to enable audits.
            </p>
          )}
        </div>

        {/* Activity log */}
        <h2 className="m-0 mb-4 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.025em]">
          Work log
        </h2>
        <div className="mb-5">
          <ActivityForm projectId={project.id} />
        </div>
        {activities.length > 0 ? (
          <div className="mb-9 border-t-2 border-text">
            {activities.map((activity) => (
              <div key={activity.id} className="border-b border-neutral-300 py-4">
                <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-[11.5px] font-bold uppercase leading-none tracking-[0.08em] text-accent-700">
                    {SEO_CATEGORY_LABELS[activity.category]}
                  </span>
                  <span className="text-[12.5px] leading-none text-neutral-700">
                    {new Date(activity.happenedOn).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="text-[14.5px] font-semibold leading-[1.5]">{activity.work}</div>
                <div className="text-[13.5px] leading-[1.55] text-neutral-700">
                  Why: {activity.reason}
                  {activity.evidence ? <> · Evidence: {activity.evidence}</> : null}
                  {activity.result ? <> · Result: {activity.result}</> : null}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <form action={setActivityResultAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="project" value={project.id} />
                    <input type="hidden" name="id" value={activity.id} />
                    <input
                      name="result"
                      type="text"
                      defaultValue={activity.result}
                      placeholder="Observed result"
                      className="border-2 border-neutral-400 bg-bg px-3 py-2 text-[12.5px] leading-none text-text"
                    />
                    <button type="submit" className={smallButton}>
                      Save result
                    </button>
                  </form>
                  <form action={deleteSeoActivityAction}>
                    <input type="hidden" name="project" value={project.id} />
                    <input type="hidden" name="id" value={activity.id} />
                    <button type="submit" className={smallButton}>
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 mb-9 text-[14px] leading-[1.6] text-neutral-700">
            Nothing logged yet. Every entry here appears on the client&apos;s
            SEO tab and in their monthly report.
          </p>
        )}

        {/* Deliverables */}
        <h2 className="m-0 mb-4 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.025em]">
          Deliverables
          {deliverables.length > 0 ? (
            <span className="ml-3 align-middle text-[13.5px] font-semibold text-neutral-700">
              {doneCount} of {deliverables.length} done
            </span>
          ) : null}
        </h2>
        <form action={addSeoDeliverableAction} className="mb-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="project" value={project.id} />
          <input
            name="title"
            type="text"
            required
            placeholder='e.g. "Optimise the two services pages"'
            className="min-w-0 flex-[1_1_300px] border-2 border-neutral-400 bg-bg p-3 text-[14px] leading-none text-text"
          />
          <button
            type="submit"
            className="inline-flex items-center border-2 border-text px-4 py-3.5 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
          >
            Add deliverable
          </button>
        </form>
        {deliverables.length > 0 ? (
          <div className="mb-9 border-t-2 border-text">
            {deliverables.map((deliverable) => {
              const waiting = waitingDays(deliverable.waitingSince);
              return (
                <div
                  key={deliverable.id}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-neutral-300 py-3.5"
                >
                  <span className="min-w-0 flex-[1_1_260px] text-[14.5px] font-semibold leading-[1.4]">
                    {deliverable.title}
                    {deliverable.status === 'waiting_client' && waiting !== null ? (
                      <span className="ml-2 font-normal text-accent-700">
                        waiting on the client for {waiting} {waiting === 1 ? 'day' : 'days'}
                      </span>
                    ) : null}
                    {deliverable.status === 'done' && deliverable.doneAt ? (
                      <span className="ml-2 font-normal text-neutral-700">
                        done {new Date(deliverable.doneAt).toLocaleDateString('en-IN')}
                      </span>
                    ) : null}
                  </span>
                  <form action={setDeliverableStatusAction} className="flex items-center gap-2">
                    <input type="hidden" name="project" value={project.id} />
                    <input type="hidden" name="id" value={deliverable.id} />
                    <select
                      name="status"
                      defaultValue={deliverable.status}
                      className="border-2 border-neutral-400 bg-bg px-2 py-2 text-[12.5px] leading-none text-text"
                    >
                      {DELIVERABLE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {DELIVERABLE_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className={smallButton}>
                      Update
                    </button>
                  </form>
                  <form action={deleteSeoDeliverableAction}>
                    <input type="hidden" name="project" value={project.id} />
                    <input type="hidden" name="id" value={deliverable.id} />
                    <button type="submit" className={smallButton}>
                      Remove
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="m-0 mb-9 text-[14px] leading-[1.6] text-neutral-700">
            Nothing agreed yet. Deliverables show the client what they are
            paying for — and flag anything waiting on them.
          </p>
        )}

        {/* Monthly reports */}
        <h2 className="m-0 mb-4 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.025em]">
          Monthly reports
        </h2>
        <div className="mb-5 border-2 border-text p-6">
          <GenerateReportForm projectId={project.id} defaultMonth={previousMonthKey()} />
          <p className="m-0 mt-3 text-[12.5px] leading-[1.55] text-neutral-700">
            The draft is assembled from real data — Search Console, the audit
            history, the work log and deliverables for that month. Google
            publishes its data a few days behind, so generate after the 4th
            for a complete month. Regenerating refreshes the data and keeps
            your words.
          </p>
        </div>
        {reports.length > 0 ? (
          <div className="mb-9 grid gap-5">
            {reports.map((report) => (
              <div key={report.id} className="border-2 border-neutral-300 p-6">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="m-0 font-heading text-[18px] font-bold leading-[1.2] tracking-[-0.02em]">
                    {monthLabel(report.month)}
                    <span
                      className={`ml-3 align-middle text-[11.5px] font-bold uppercase leading-none tracking-[0.08em] ${report.status === 'published' ? 'text-accent-700' : 'text-neutral-700'}`}
                    >
                      {report.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </h3>
                  <span className="text-[12.5px] leading-none text-neutral-700">
                    data gathered {new Date(report.generatedAt).toLocaleDateString('en-IN')}
                  </span>
                </div>

                {report.status === 'draft' ? (
                  <ReportEditor report={report} />
                ) : (
                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      href={`/portal/${project.id}/seo/reports/${report.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 border-2 border-text px-4 py-3 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      View as client
                    </Link>
                    <span className="text-[13px] leading-none text-neutral-700">
                      published{' '}
                      {report.publishedAt
                        ? new Date(report.publishedAt).toLocaleDateString('en-IN')
                        : ''}
                      · immutable
                    </span>
                  </div>
                )}

                <form action={deleteSeoReportAction} className="mt-4">
                  <input type="hidden" name="project" value={project.id} />
                  <input type="hidden" name="id" value={report.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 border-2 border-neutral-400 px-3 py-2 text-[12.5px] font-medium leading-none text-neutral-800 transition-colors hover:border-accent-700 hover:text-accent-700"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    Delete report
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 mb-9 text-[14px] leading-[1.6] text-neutral-700">
            No reports yet. Generate one for the month that just finished.
          </p>
        )}
      </div>
    </main>
  );
}
