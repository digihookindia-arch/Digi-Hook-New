'use client';

import { useActionState } from 'react';
import { Sparkles } from 'lucide-react';
import { createProposal, type DraftState } from '../actions';

/**
 * Split out of the page so the page itself can stay a server component and
 * prefill these fields from an enquiry (`/dashboard/new?enquiry=<id>`).
 */
export function NewProposalForm({
  defaultClient = '',
  defaultBrief = '',
  defaultBudget = '',
  enquiryId,
}: {
  defaultClient?: string;
  defaultBrief?: string;
  defaultBudget?: string;
  enquiryId?: string;
}) {
  const [state, action, pending] = useActionState(createProposal, {} as DraftState);

  return (
    <form action={action} className="border-2 border-text bg-bg p-[clamp(20px,3vw,32px)]">
      {/* Carried through so the proposal can be linked back to its enquiry. */}
      {enquiryId ? <input type="hidden" name="enquiry" value={enquiryId} /> : null}

      <div className="mb-6">
        <label
          htmlFor="client"
          className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700"
        >
          Client
        </label>
        <input
          id="client"
          name="client"
          type="text"
          defaultValue={defaultClient}
          placeholder="Business name"
          className="w-full max-w-[440px] border-2 border-neutral-400 bg-bg p-3.5 text-[15px] leading-none text-text"
        />
      </div>

      <div className="mb-6">
        <label
          htmlFor="budget"
          className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700"
        >
          Budget agreed with the client
        </label>
        <p className="m-0 mb-3 max-w-[60ch] text-[13.5px] leading-[1.5] text-neutral-700">
          If you already settled on a number, put it here — Claude prices the proposal
          to match it instead of guessing from the standard list. Leave blank to use the
          standard house price.
        </p>
        <input
          id="budget"
          name="budget"
          type="text"
          defaultValue={defaultBudget}
          placeholder="e.g. ₹25,000"
          className="w-full max-w-[280px] border-2 border-neutral-400 bg-bg p-3.5 text-[15px] leading-none text-text"
        />
      </div>

      <div>
        <label
          htmlFor="brief"
          className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700"
        >
          The brief
        </label>
        <p className="m-0 mb-3 max-w-[60ch] text-[13.5px] leading-[1.5] text-neutral-700">
          What they do, what they need, roughly how many pages, whether they want a
          store or a content management tool, and anything they told you on the call.
        </p>
        <textarea
          id="brief"
          name="brief"
          rows={defaultBrief ? 16 : 9}
          defaultValue={defaultBrief}
          placeholder="A dental clinic in Noida. Wants a 6-page site with appointment enquiries, and to be found for 'dentist near me'. They want to edit their own timings. No online payments."
          className="w-full resize-y border-2 border-neutral-400 bg-bg p-3.5 text-[15px] leading-[1.5] text-text"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="m-0 mt-5 border-l-2 border-accent py-1 pl-4 text-[14.5px] leading-[1.55] text-accent-700"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-7 inline-flex items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-6 py-4 text-[15px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
      >
        <Sparkles size={16} aria-hidden="true" />
        {pending ? 'Claude is drafting…' : 'Draft the proposal'}
      </button>
      {pending ? (
        <p className="m-0 mt-3 text-[12.5px] leading-[1.5] text-neutral-700">
          This takes a few seconds. Do not close the tab.
        </p>
      ) : null}
    </form>
  );
}
