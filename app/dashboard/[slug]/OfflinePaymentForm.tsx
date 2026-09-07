'use client';

import { useActionState, useState } from 'react';
import { Landmark } from 'lucide-react';
import type { ScheduleRow } from '@/lib/delivery';
import {
  recordOfflinePaymentAction,
  type OfflinePaymentState,
} from '../actions';
import { Label, inputClass } from './EditorKit';

/**
 * Records a payment that arrived in the bank rather than through the site.
 *
 * Most clients pay by NEFT or UPI, so this is the ordinary route to a tax
 * invoice rather than an exception — and without it a bank payment could not be
 * invoiced at all, because invoices are keyed to a payment row and only the
 * checkout was writing them.
 *
 * It offers only the rows that can actually be settled: anything already paid,
 * or with no rupee figure behind it, is not in the list. The amount is never
 * typed — the server derives it from the schedule — so the figure on the
 * invoice cannot drift from the figure the client agreed to.
 */
export function OfflinePaymentForm({
  slug,
  rows,
}: {
  slug: string;
  /** Unsettled rows with a real figure. Empty means nothing to record. */
  rows: ScheduleRow[];
}) {
  const [state, action, pending] = useActionState(
    recordOfflinePaymentAction,
    {} as OfflinePaymentState
  );
  const [index, setIndex] = useState(String(rows[0]?.index ?? ''));

  if (rows.length === 0) {
    return (
      <p className="m-0 border-2 border-neutral-300 p-[18px] text-[13.5px] leading-[1.55] text-neutral-700">
        Every payment on the schedule is either settled already or has no rupee
        figure behind it, so there is nothing to record here.
      </p>
    );
  }

  const chosen = rows.find((row) => String(row.index) === index);
  // Today, as a plain date — the money almost always arrived before anyone
  // gets round to recording it, so this is a starting point, not a default
  // to be trusted.
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="border-2 border-text">
      <div className="flex flex-wrap items-center gap-2.5 bg-text px-[18px] py-3.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-bg">
        <Landmark size={14} aria-hidden="true" />
        Payment received in the bank
      </div>

      <div className="p-[18px]">
        <p className="m-0 mb-5 max-w-[72ch] text-[13.5px] leading-[1.6] text-neutral-700">
          For a transfer, UPI push or cheque that did not go through the site.
          It raises the tax invoice, emails it, and marks the milestone paid —
          the same as a card payment, so the client sees no difference.
        </p>

        <input type="hidden" name="slug" value={slug} />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
          <label className="block">
            <Label>Which payment</Label>
            <select
              name="milestoneIndex"
              className={inputClass}
              value={index}
              onChange={(e) => setIndex(e.target.value)}
            >
              {rows.map((row) => (
                <option key={row.index} value={row.index}>
                  {row.milestone.label} — {row.payableText}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <Label>How it was paid</Label>
            <input
              name="method"
              required
              defaultValue="Bank transfer"
              placeholder="Bank transfer, UPI, cheque 004123"
              className={inputClass}
            />
          </label>

          <label className="block">
            <Label>Date the money arrived</Label>
            <input
              type="date"
              name="paidOn"
              required
              defaultValue={today}
              max={today}
              className={inputClass}
            />
          </label>
        </div>

        {/* The figure is shown, never typed. Typing it twice is how an invoice
            ends up disagreeing with the schedule the client signed. */}
        {chosen ? (
          <p className="m-0 mt-4 text-[13.5px] leading-[1.6] text-neutral-700">
            Invoice will be raised for{' '}
            <strong className="font-semibold text-text">{chosen.payableText}</strong>{' '}
            — {chosen.subtotalText} plus {chosen.gstText} GST. Taken from the
            schedule, not typed.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-[44px] items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-5 text-[14px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700 disabled:opacity-45"
          >
            {pending ? 'Recording…' : 'Record payment and raise the invoice'}
          </button>

          {state.recorded ? (
            <span role="status" className="text-[13.5px] leading-[1.45] text-neutral-700">
              Recorded as {state.recorded}. Reload to see the invoice.
            </span>
          ) : null}
        </div>

        {state.error ? (
          <p
            role="alert"
            className="m-0 mt-3 max-w-[68ch] text-[13.5px] font-medium leading-[1.5] text-accent-700"
          >
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
