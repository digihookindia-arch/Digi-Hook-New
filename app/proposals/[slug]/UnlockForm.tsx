'use client';

import { useActionState } from 'react';
import { ArrowRight } from 'lucide-react';
import { unlockProposal } from './actions';

export function UnlockForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(
    unlockProposal,
    {} as { error?: string }
  );

  return (
    <form action={action} className="border-2 border-text bg-bg p-7">
      <input type="hidden" name="slug" value={slug} />
      <label
        htmlFor="code"
        className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700"
      >
        Access code
      </label>
      <input
        id="code"
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? 'code-error' : undefined}
        className={`w-full max-w-[220px] border-2 bg-bg p-3.5 font-heading text-[19px] font-bold leading-none tracking-[0.1em] text-text ${
          state.error ? 'border-accent-700' : 'border-neutral-400'
        }`}
      />
      {state.error ? (
        <p
          id="code-error"
          role="alert"
          className="m-0 mt-2 text-[13px] font-medium leading-[1.45] text-accent-700"
        >
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-5 py-3.5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
      >
        {pending ? 'Checking…' : 'Open the proposal'}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </form>
  );
}
