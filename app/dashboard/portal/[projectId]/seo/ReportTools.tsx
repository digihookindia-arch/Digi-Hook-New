'use client';

import { useActionState } from 'react';
import type { SeoReport } from '@/lib/seoRecords';
import {
  generateSeoReportAction,
  saveSeoReportAction,
  type PortalAdminState,
} from '../../actions';

const inputClass =
  'w-full border-2 border-neutral-400 bg-bg p-3 text-[14.5px] leading-[1.5] text-text';

const labelClass =
  'mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700';

/**
 * Builds (or rebuilds) a month's draft from real data. Regenerating leaves
 * the studio's summary and priorities alone — only the data snapshot moves.
 */
export function GenerateReportForm({
  projectId,
  defaultMonth,
}: {
  projectId: string;
  defaultMonth: string;
}) {
  const [state, action, pending] = useActionState(
    generateSeoReportAction,
    {} as PortalAdminState
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-4">
      <input type="hidden" name="project" value={projectId} />
      <label className="block">
        <span className={labelClass}>Report month</span>
        <input
          name="month"
          type="month"
          defaultValue={defaultMonth}
          className="border-2 border-neutral-400 bg-bg p-3 text-[14.5px] leading-none text-text"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center border-2 border-text px-4 py-3.5 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg disabled:opacity-45"
      >
        {pending ? 'Gathering the data…' : 'Generate draft from real data'}
      </button>
      {state.error ? (
        <p role="alert" className="m-0 w-full text-[13px] font-medium leading-[1.45] text-accent-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * The draft's two moves: save the studio's words, or publish — which saves
 * first, so what goes out is exactly what is on screen. Publishing is
 * one-way and emails the client.
 */
export function ReportEditor({ report }: { report: SeoReport }) {
  const [state, action, pending] = useActionState(
    saveSeoReportAction,
    {} as PortalAdminState
  );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="project" value={report.projectId} />
      <input type="hidden" name="id" value={report.id} />

      <label className="block">
        <span className={labelClass}>
          Executive summary — what the numbers mean, in the client&apos;s language
        </span>
        <textarea name="summary" rows={4} defaultValue={report.summary} className={inputClass} />
      </label>
      <label className="block">
        <span className={labelClass}>Next month&apos;s priorities</span>
        <textarea
          name="priorities"
          rows={3}
          defaultValue={report.priorities}
          className={inputClass}
        />
      </label>

      {state.error ? (
        <p role="alert" className="m-0 text-[13px] font-medium leading-[1.45] text-accent-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          name="intent"
          value="save"
          disabled={pending}
          className="inline-flex items-center border-2 border-text px-4 py-3 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg disabled:opacity-45"
        >
          Save draft
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="inline-flex items-center border-2 border-accent-600 bg-accent-600 px-4 py-3 text-[14px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
        >
          {pending ? 'Working…' : 'Publish to client'}
        </button>
        {state.savedAt ? (
          <span role="status" className="text-[13px] font-medium text-neutral-700">
            Saved.
          </span>
        ) : null}
      </div>
      <p className="m-0 text-[12.5px] leading-[1.55] text-neutral-700">
        Publishing emails the client and locks the report — published reports
        never change.
      </p>
    </form>
  );
}
