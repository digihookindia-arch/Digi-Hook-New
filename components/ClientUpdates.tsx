'use client';

import { AlertTriangle, Check, Eye, MessageCircle, Send } from 'lucide-react';
import type { MilestoneRow } from '@/lib/journey';

/**
 * The four client-facing milestones for one enquiry, with what has been sent
 * and what can be sent now.
 *
 * A client component only for the re-send confirmation — everything else is a
 * plain form posting a server action. Duplicates are the likeliest mistake
 * here, and a confirm is the right guard: clients do lose emails, so a second
 * send must stay possible, just never accidental.
 */

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

function when(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/**
 * Which record the panel is hanging off. Exactly one is set: the enquiries
 * page passes an enquiry, the proposal page passes a slug, and the resolver
 * finds the other side if there is one.
 */
export type UpdateTarget = { enquiryId: string } | { slug: string };

function query(target: UpdateTarget): string {
  return 'enquiryId' in target
    ? `enquiry=${encodeURIComponent(target.enquiryId)}`
    : `proposal=${encodeURIComponent(target.slug)}`;
}

function hidden(target: UpdateTarget) {
  return 'enquiryId' in target ? (
    <input type="hidden" name="id" value={target.enquiryId} />
  ) : (
    <input type="hidden" name="slug" value={target.slug} />
  );
}

export function ClientUpdates({
  target,
  rows,
  action,
  emailConfigured,
}: {
  target: UpdateTarget;
  rows: MilestoneRow[];
  action: (formData: FormData) => void;
  emailConfigured: boolean;
}) {
  return (
    <section className="mb-9">
      <h2 className="m-0 mb-1.5 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.025em]">
        Client updates
      </h2>
      <p className="m-0 mb-4 text-[14px] leading-[1.55] text-neutral-700">
        What this client has been told, and what you can tell them next. Sending
        an update is what moves the enquiry along — the status follows it.
      </p>

      {!emailConfigured ? (
        <p className="m-0 mb-4 border-l-2 border-accent py-1 pl-4 text-[14px] leading-[1.55] text-accent-700">
          <strong className="font-heading">Email is not configured</strong>, so
          nothing actually reaches the client — sends are logged to the server
          console instead. The buttons below still record what you meant to send.
        </p>
      ) : null}

      <div className="border-t-2 border-text">
        {rows.map((row) => (
          <Row key={row.stage} target={target} row={row} action={action} />
        ))}
      </div>
    </section>
  );
}

function Row({
  target,
  row,
  action,
}: {
  target: UpdateTarget;
  row: MilestoneRow;
  action: (formData: FormData) => void;
}) {
  const sentOk = row.last?.ok === true;
  const failed = row.last !== null && !row.last.ok;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-start gap-x-6 gap-y-3 border-b border-neutral-300 py-5">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[12px] font-semibold leading-none tracking-[0.1em] text-neutral-600">
            0{row.stage}
          </span>
          <span className="font-heading text-[17px] font-bold leading-[1.25] tracking-[-0.02em]">
            {row.title}
          </span>
          {sentOk ? (
            <Check size={15} className="text-accent-700" aria-label="Sent" />
          ) : null}
        </div>
        <p className="m-0 mt-1.5 text-[13.5px] leading-[1.5] text-neutral-700">
          {row.gist}
        </p>
      </div>

      <div className="min-w-0 text-[13.5px] leading-[1.5]">
        {sentOk && row.last ? (
          <span className="text-neutral-800">
            Sent {when(row.last.sentAt)} to{' '}
            <span className="break-all">{row.last.toAddress}</span>
          </span>
        ) : failed && row.last ? (
          <span className="text-accent-700">
            Failed {when(row.last.sentAt)} — {row.last.error}
          </span>
        ) : (
          <span className="text-neutral-600">Not sent.</span>
        )}

        {row.blocked ? (
          <div className="mt-1.5 text-neutral-600">{row.blocked}</div>
        ) : row.warning ? (
          <div className="mt-1.5 flex items-start gap-1.5 text-neutral-700">
            <AlertTriangle size={14} className="mt-0.5 flex-none" aria-hidden="true" />
            <span>{row.warning}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {row.blocked ? null : (
          <>
            <a
              href={`/dashboard/emails/preview?${query(target)}&stage=${row.stage}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 border-2 border-neutral-400 px-3 py-2.5 text-[13px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
            >
              <Eye size={14} aria-hidden="true" />
              Preview
            </a>

            {row.whatsapp ? (
              <a
                href={row.whatsapp}
                target="_blank"
                rel="noreferrer"
                title="Opens WhatsApp with this message written out — you still press send"
                className="inline-flex items-center gap-1.5 border-2 border-neutral-400 px-3 py-2.5 text-[13px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
              >
                <MessageCircle size={14} aria-hidden="true" />
                WhatsApp
              </a>
            ) : null}

            <form
              action={action}
              onSubmit={(e) => {
                if (
                  sentOk &&
                  !confirm(
                    `${row.title} was already sent to ${row.last?.toAddress}. Send it again?`
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              {hidden(target)}
              <input type="hidden" name="stage" value={row.stage} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 border-2 border-accent-600 bg-accent-600 px-3.5 py-2.5 text-[13px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
              >
                <Send size={14} aria-hidden="true" />
                {sentOk ? 'Send again' : 'Send'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
