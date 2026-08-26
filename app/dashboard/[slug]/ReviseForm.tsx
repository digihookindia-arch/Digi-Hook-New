'use client';

import { useActionState } from 'react';
import { Sparkles } from 'lucide-react';
import { reviseProposalAction, type DraftState } from '../actions';

/** Plain-English revision box — the AI editing surface for the team. */
export function ReviseForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(
    reviseProposalAction,
    {} as DraftState
  );

  return (
    <form action={action} className="border-2 border-text bg-bg p-[clamp(20px,3vw,32px)]">
      <input type="hidden" name="slug" value={slug} />
      <h2 className="m-0 mb-2 font-heading text-[19px] font-bold leading-[1.25] tracking-[-0.02em]">
        Ask Claude to change it
      </h2>
      <p className="m-0 mb-3 max-w-[60ch] text-[13.5px] leading-[1.5] text-neutral-700">
        Say what to change in your own words. Only that change is applied — the rest of
        the proposal stays as it is.
      </p>
      {/* The payment schedule, the asset list and the work stages are studio
          columns beside the proposal — Claude cannot write them, so a payment
          instruction typed here comes back with nothing changed. */}
      <p className="m-0 mb-4 max-w-[60ch] text-[13.5px] leading-[1.5] text-neutral-700">
        This edits the proposal document only. The{' '}
        <strong className="font-semibold text-text">payment schedule</strong>, the asset
        list and the work stages are edited under <em>Delivery</em> below. For a small,
        exact change to the document itself — a figure, a typo — <em>Edit the document
        directly</em> below is faster than describing it here.
      </p>
      <label htmlFor="instruction" className="sr-only">
        What should Claude change?
      </label>
      <textarea
        id="instruction"
        name="instruction"
        rows={4}
        placeholder="Add two more pages and the content management tool. Make the timeline three weeks."
        className="w-full resize-y border-2 border-neutral-400 bg-bg p-3.5 text-[15px] leading-[1.5] text-text"
      />

      {state.error ? (
        <p
          role="alert"
          className="m-0 mt-4 border-l-2 border-accent py-1 pl-4 text-[14.5px] leading-[1.55] text-accent-700"
        >
          {state.error}
        </p>
      ) : state.unchanged ? (
        <p
          role="status"
          className="m-0 mt-4 border-l-2 border-accent py-1 pl-4 text-[14.5px] leading-[1.55] text-accent-700"
        >
          Claude returned the proposal unchanged — nothing was saved. Payment terms
          are the usual reason: change those in the payment schedule under{' '}
          <em>Delivery</em> below, not here. Otherwise, try{' '}
          <em>Edit the document directly</em> below and make the change by hand.
        </p>
      ) : state.revisedAt ? (
        <p
          role="status"
          className="m-0 mt-4 border-l-2 border-text py-1 pl-4 text-[14.5px] leading-[1.55] text-neutral-800"
        >
          Revised at {new Date(state.revisedAt).toLocaleTimeString('en-IN')}. The
          preview below and the client&apos;s copy are both updated.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-5 py-3.5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
      >
        <Sparkles size={16} aria-hidden="true" />
        {pending ? 'Revising…' : 'Revise'}
      </button>
    </form>
  );
}
