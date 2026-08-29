import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  DELIVERABLE_STATUS_LABELS,
  SEO_CATEGORY_LABELS,
  monthLabel,
  waitingDays,
} from '@/lib/seoWork';
import {
  listActivities,
  listDeliverables,
  listPublishedReports,
} from '@/lib/seoRecords';
import type { PortalProject } from '@/lib/portalProjects';

/**
 * The client's view of the work record: agreed deliverables and where each
 * stands (including how long anything has waited on them), the activity
 * log — every entry concrete, with its reason — and the published monthly
 * reports. Each panel hides until it has something real to show; an empty
 * frame is noise, not transparency.
 */

function panelHeading(id: string, text: string) {
  return (
    <h2
      id={id}
      className="m-0 mb-5 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700"
    >
      {text}
    </h2>
  );
}

export async function DeliverablesPanel({ project }: { project: PortalProject }) {
  const deliverables = await listDeliverables(project.id);
  if (deliverables.length === 0) return null;
  const done = deliverables.filter((d) => d.status === 'done').length;

  return (
    <section aria-labelledby="seo-deliverables" className="border-2 border-text p-7">
      {panelHeading('seo-deliverables', 'Agreed deliverables')}
      <p className="m-0 mb-5 text-[15px] leading-[1.6] text-neutral-800">
        <span className="font-semibold">
          {done} of {deliverables.length}
        </span>{' '}
        complete.
      </p>
      <div className="border-t-2 border-text">
        {deliverables.map((deliverable) => {
          const waiting = waitingDays(deliverable.waitingSince);
          return (
            <div
              key={deliverable.id}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 border-b border-neutral-300 py-3.5"
            >
              <span className="min-w-0 flex-[1_1_260px] text-[14.5px] leading-[1.5]">
                {deliverable.title}
                {deliverable.status === 'waiting_client' && waiting !== null ? (
                  <span className="mt-0.5 block text-[13px] leading-[1.5] text-accent-700">
                    {waiting === 0
                      ? 'Waiting on you since today'
                      : `Waiting on you for ${waiting} ${waiting === 1 ? 'day' : 'days'}`}{' '}
                    — a quick reply keeps this moving.
                  </span>
                ) : null}
              </span>
              <span className="text-[12.5px] font-semibold uppercase leading-none tracking-[0.06em] text-neutral-700">
                {DELIVERABLE_STATUS_LABELS[deliverable.status]}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export async function ActivityPanel({ project }: { project: PortalProject }) {
  const activities = await listActivities(project.id, 10);
  if (activities.length === 0) return null;

  return (
    <section aria-labelledby="seo-activity" className="border-2 border-text p-7">
      {panelHeading('seo-activity', 'The work, as it happens')}
      <div className="border-t-2 border-text">
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
      <p className="m-0 mt-4 text-[12.5px] leading-[1.6] text-neutral-700">
        The ten most recent entries. Every month&apos;s full log is kept in
        that month&apos;s report.
      </p>
    </section>
  );
}

export async function ReportsPanel({ project }: { project: PortalProject }) {
  const reports = await listPublishedReports(project.id);
  if (reports.length === 0) return null;

  return (
    <section aria-labelledby="seo-reports" className="border-2 border-text p-7">
      {panelHeading('seo-reports', 'Monthly reports')}
      <div className="border-t-2 border-text">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/portal/${project.id}/seo/reports/${report.id}`}
            className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 border-b border-neutral-300 py-3.5 transition-colors hover:text-accent-700"
          >
            <span className="text-[15px] font-semibold leading-[1.4]">
              {monthLabel(report.month)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[13px] leading-none text-neutral-700">
              published{' '}
              {report.publishedAt
                ? new Date(report.publishedAt).toLocaleDateString('en-IN')
                : ''}
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="text-accent transition-transform group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
