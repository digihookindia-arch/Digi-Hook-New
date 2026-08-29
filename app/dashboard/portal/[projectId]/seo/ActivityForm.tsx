'use client';

import { useActionState } from 'react';
import { SEO_CATEGORIES, SEO_CATEGORY_LABELS } from '@/lib/seoWork';
import { addSeoActivityAction, type PortalAdminState } from '../../actions';

const inputClass =
  'w-full border-2 border-neutral-400 bg-bg p-3 text-[14.5px] leading-[1.4] text-text';

const labelClass =
  'mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700';

/**
 * One client-visible work entry. The validator refuses vague text, so the
 * form surfaces that refusal instead of silently swallowing it — the
 * no-vague-entries rule is the whole point of the log.
 */
export function ActivityForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    addSeoActivityAction,
    {} as PortalAdminState
  );

  return (
    <form action={action} className="border-2 border-text p-6">
      <h3 className="m-0 mb-5 font-heading text-[17px] font-bold leading-[1.2] tracking-[-0.02em]">
        Log a piece of work
      </h3>
      <input type="hidden" name="project" value={projectId} />

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
        <label className="block">
          <span className={labelClass}>Category</span>
          <select name="category" className={inputClass} defaultValue="technical">
            {SEO_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {SEO_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Work date</span>
          <input name="happened_on" type="date" className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Evidence (URL or note)</span>
          <input
            name="evidence"
            type="text"
            placeholder="https://client-site.in/services"
            className={inputClass}
          />
        </label>
      </div>

      <label className="mb-4 block">
        <span className={labelClass}>What was done — be specific, the client reads this</span>
        <textarea name="work" rows={2} required className={inputClass} />
      </label>
      <label className="mb-4 block">
        <span className={labelClass}>Why it was worth doing</span>
        <textarea name="reason" rows={2} required className={inputClass} />
      </label>
      <label className="mb-4 block">
        <span className={labelClass}>Result, if already observable (can be added later)</span>
        <input name="result" type="text" className={inputClass} />
      </label>

      {state.error ? (
        <p role="alert" className="m-0 mb-3 text-[13px] font-medium leading-[1.45] text-accent-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center border-2 border-accent-600 bg-accent-600 px-5 py-3 text-[14px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
        >
          {pending ? 'Saving…' : 'Add to the log'}
        </button>
        {state.savedAt ? (
          <span role="status" className="text-[13px] font-medium text-neutral-700">
            Logged. The client sees it on their SEO tab.
          </span>
        ) : null}
      </div>
    </form>
  );
}
