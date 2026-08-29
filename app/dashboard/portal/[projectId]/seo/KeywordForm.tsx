'use client';

import { useActionState } from 'react';
import { KEYWORDS_CAP } from '@/lib/seoWork';
import { addKeywordAction, type PortalAdminState } from '../../actions';

/**
 * Adds one tracked keyword. The cap and duplicate refusals come back as
 * readable errors rather than silently dropping the input.
 */
export function KeywordForm({ projectId, count }: { projectId: string; count: number }) {
  const [state, action, pending] = useActionState(
    addKeywordAction,
    {} as PortalAdminState
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="project" value={projectId} />
      <input
        name="keyword"
        type="text"
        required
        placeholder='e.g. "web design noida"'
        className="min-w-0 flex-[1_1_260px] border-2 border-neutral-400 bg-bg p-3 text-[14px] leading-none text-text"
      />
      <button
        type="submit"
        disabled={pending || count >= KEYWORDS_CAP}
        className="inline-flex items-center border-2 border-text px-4 py-3.5 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg disabled:opacity-45"
      >
        {pending ? 'Adding…' : `Add keyword (${count}/${KEYWORDS_CAP})`}
      </button>
      {state.error ? (
        <p role="alert" className="m-0 w-full text-[13px] font-medium leading-[1.45] text-accent-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
