'use client';

import { useActionState } from 'react';
import { ArrowRight } from 'lucide-react';
import { TICKET_BODY_MAX } from '@/lib/ticketRules';
import { clientReplyAction, type TicketFormState } from '../actions';

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(
    clientReplyAction,
    {} as TicketFormState
  );

  return (
    <form action={action} className="mt-8">
      <input type="hidden" name="ticket" value={ticketId} />

      <label
        htmlFor="reply-body"
        className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700"
      >
        Reply
      </label>
      <textarea
        id="reply-body"
        name="body"
        rows={4}
        maxLength={TICKET_BODY_MAX}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? 'reply-error' : undefined}
        className={`w-full border-2 bg-bg p-3.5 text-[15px] leading-[1.55] text-text ${
          state.error ? 'border-accent-700' : 'border-neutral-400'
        }`}
      />
      {state.error ? (
        <p
          id="reply-error"
          role="alert"
          className="m-0 mt-2 text-[13px] font-medium leading-[1.45] text-accent-700"
        >
          {state.error}
        </p>
      ) : null}

      <input
        name="files"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,application/pdf"
        aria-label="Attach screenshots or files"
        className="mt-3 w-full border-2 border-neutral-400 bg-bg p-3 text-[13.5px] leading-none text-neutral-800 file:mr-3 file:border-0 file:bg-text file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:uppercase file:text-bg"
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-5 py-3.5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
      >
        {pending ? 'Sending…' : 'Send reply'}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </form>
  );
}
