'use client';

import { useActionState } from 'react';
import { IndianRupee } from 'lucide-react';
import type { Ticket } from '@/lib/tickets';
import { sendQuoteAction, type QuoteState } from '../actions';

/**
 * The studio's half of the quote loop. Sending (or revising) a quote emails
 * the client an approve link; approval itself only ever happens on the
 * client's side of the portal.
 */
export function QuoteForm({ ticket }: { ticket: Ticket }) {
  const [state, action, pending] = useActionState(sendQuoteAction, {} as QuoteState);

  return (
    <form action={action} className="border-2 border-text p-6">
      <h2 className="m-0 mb-1.5 font-heading text-[19px] font-bold leading-[1.2] tracking-[-0.02em]">
        {ticket.quotedAt ? 'Revise the quote' : 'Send a quote'}
      </h2>
      <p className="m-0 mb-5 text-[13.5px] leading-[1.55] text-neutral-700">
        The client gets the amount, your scope note and an approve button by
        email and on their portal. Work waits for their approval.
      </p>

      <input type="hidden" name="id" value={ticket.id} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
        <label className="block">
          <span className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
            Amount (₹, before GST)
          </span>
          <input
            name="quote_inr"
            type="number"
            min={1}
            defaultValue={ticket.quoteInr ?? ''}
            className="w-full border-2 border-neutral-400 bg-bg p-3 text-[14.5px] leading-none text-text"
          />
        </label>
        <label className="block [grid-column:span_2]">
          <span className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
            Scope note (what the amount covers)
          </span>
          <input
            name="quote_note"
            type="text"
            maxLength={1000}
            defaultValue={ticket.quoteNote}
            className="w-full border-2 border-neutral-400 bg-bg p-3 text-[14.5px] leading-none text-text"
          />
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="m-0 mt-3 text-[13px] font-medium leading-[1.45] text-accent-700">
          {state.error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 border-2 border-accent-600 bg-accent-600 px-5 py-3.5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
        >
          <IndianRupee size={15} aria-hidden="true" />
          {pending ? 'Sending…' : ticket.quotedAt ? 'Send revised quote' : 'Send quote'}
        </button>
        {state.savedAt ? (
          <span role="status" className="text-[13.5px] font-medium text-neutral-700">
            Sent. The client has it by email and on their portal.
          </span>
        ) : null}
      </div>
    </form>
  );
}
