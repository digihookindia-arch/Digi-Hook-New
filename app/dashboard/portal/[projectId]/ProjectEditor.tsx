'use client';

import { useActionState } from 'react';
import type { PortalProject } from '@/lib/portalProjects';
import { updateProjectAction, type PortalAdminState } from '../actions';

const inputClass =
  'w-full border-2 border-neutral-400 bg-bg p-3 text-[14.5px] leading-none text-text';

const labelClass =
  'mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700';

/**
 * The whole client-visible record in one form: business name, live date and
 * support window, and the payment summary. What is saved here is exactly
 * what the client's overview page renders.
 */
export function ProjectEditor({ project }: { project: PortalProject }) {
  const [state, action, pending] = useActionState(
    updateProjectAction,
    {} as PortalAdminState
  );

  return (
    <form action={action} className="border-2 border-text p-6">
      <h2 className="m-0 mb-5 font-heading text-[19px] font-bold leading-[1.2] tracking-[-0.02em]">
        Project details
      </h2>

      <input type="hidden" name="id" value={project.id} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
        <label className="block">
          <span className={labelClass}>Business name</span>
          <input
            name="business"
            type="text"
            defaultValue={project.businessName}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Live date</span>
          <input
            name="live_at"
            type="date"
            defaultValue={project.liveAt ?? ''}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Support days</span>
          <input
            name="support_days"
            type="number"
            min={0}
            max={3650}
            defaultValue={project.supportDays}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Project total (₹)</span>
          <input
            name="total_inr"
            type="number"
            min={0}
            placeholder="Leave empty to hide payments"
            defaultValue={project.totalInr ?? ''}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Paid so far (₹)</span>
          <input
            name="paid_inr"
            type="number"
            min={0}
            defaultValue={project.paidInr}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Live site URL</span>
          <input
            name="site_url"
            type="url"
            placeholder="https://client-site.in"
            defaultValue={project.siteUrl ?? ''}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Server start date</span>
          <input
            name="server_at"
            type="date"
            defaultValue={project.serverAt ?? ''}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Server days</span>
          <input
            name="server_days"
            type="number"
            min={0}
            max={3650}
            defaultValue={project.serverDays}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Stats code</span>
          <input
            name="stats_code"
            type="text"
            placeholder="e.g. sharma-legal"
            defaultValue={project.statsCode ?? ''}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Stats API token</span>
          <input
            name="stats_token"
            type="text"
            placeholder="From the GoatCounter site"
            defaultValue={project.statsToken ?? ''}
            className={inputClass}
          />
        </label>
      </div>

      <p className="m-0 mt-3 text-[12.5px] leading-[1.55] text-neutral-700">
        The support countdown starts on the live date; the server countdown on
        the server start date. Leave the total empty and the client sees no
        payments panel. Site URL turns on the website-status card; stats code
        + token (lowercase letters, digits, hyphens — see the GoatCounter
        runbook) turn on the traffic panel.
      </p>

      {state.error ? (
        <p role="alert" className="m-0 mt-3 text-[13px] font-medium leading-[1.45] text-accent-700">
          {state.error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center border-2 border-accent-600 bg-accent-600 px-5 py-3.5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
        >
          {pending ? 'Saving…' : 'Save project details'}
        </button>
        {state.savedAt ? (
          <span role="status" className="text-[13.5px] font-medium text-neutral-700">
            Saved. The client sees this now.
          </span>
        ) : null}
      </div>
    </form>
  );
}
