'use client';

import { useActionState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  TICKET_BODY_MAX,
  TICKET_SUBJECT_MAX,
  type TicketKind,
} from '@/lib/ticketRules';
import { createTicketAction, type TicketFormState } from '../actions';

const COPY: Record<
  TicketKind,
  { heading: string; subjectHint: string; bodyHint: string; button: string; pendingButton: string }
> = {
  support: {
    heading: 'Raise a ticket',
    subjectHint: 'e.g. "Contact form not sending"',
    bodyHint:
      'What is happening, where, and since when? A link to the page and what you expected to happen instead all help us move faster.',
    button: 'Send the ticket',
    pendingButton: 'Sending…',
  },
  feature: {
    heading: 'Request a feature',
    subjectHint: 'e.g. "Add a photo gallery to the services page"',
    bodyHint:
      'Describe what you would like and what it should do for your visitors. We will come back with scope, timing and a quote where one is needed.',
    button: 'Send the request',
    pendingButton: 'Sending…',
  },
};

export function NewTicketForm({
  projectId,
  kind,
}: {
  projectId: string;
  kind: TicketKind;
}) {
  const [state, action, pending] = useActionState(
    createTicketAction,
    {} as TicketFormState
  );
  const copy = COPY[kind];

  return (
    <form action={action} className="border-2 border-text bg-bg p-7">
      <h2 className="m-0 mb-5 font-heading text-[clamp(19px,2vw,24px)] font-bold leading-[1.15] tracking-[-0.025em]">
        {copy.heading}
      </h2>

      <input type="hidden" name="project" value={projectId} />
      <input type="hidden" name="kind" value={kind} />

      <label
        htmlFor={`${kind}-subject`}
        className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700"
      >
        Subject
      </label>
      <input
        id={`${kind}-subject`}
        name="subject"
        type="text"
        maxLength={TICKET_SUBJECT_MAX}
        placeholder={copy.subjectHint}
        className="w-full border-2 border-neutral-400 bg-bg p-3.5 text-[15px] leading-none text-text placeholder:text-neutral-500"
      />

      <label
        htmlFor={`${kind}-body`}
        className="mb-2 mt-5 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700"
      >
        Message
      </label>
      <textarea
        id={`${kind}-body`}
        name="body"
        rows={6}
        maxLength={TICKET_BODY_MAX}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? `${kind}-error` : undefined}
        className={`w-full border-2 bg-bg p-3.5 text-[15px] leading-[1.55] text-text ${
          state.error ? 'border-accent-700' : 'border-neutral-400'
        }`}
      />
      <p className="m-0 mt-2 text-[12.5px] leading-[1.5] text-neutral-700">{copy.bodyHint}</p>
      {state.error ? (
        <p
          id={`${kind}-error`}
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
        {pending ? copy.pendingButton : copy.button}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </form>
  );
}
