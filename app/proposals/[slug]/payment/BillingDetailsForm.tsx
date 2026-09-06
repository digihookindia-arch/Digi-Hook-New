'use client';

import { useActionState, useState } from 'react';
import { Check, FileText, Pencil } from 'lucide-react';
import { GST_STATES, stateName } from '@/lib/gst';
import { saveBillingDetails, type BillingState } from './actions';

/**
 * The client's own billing details, filled in by them on the payment stage.
 *
 * They know this better than the studio does: the registered entity name is
 * rarely the person we have been emailing, and only they can get their own
 * GSTIN right. Collecting it here — beside the money, before they pay — is the
 * moment they are actually thinking about invoices.
 *
 * Saved details collapse to a summary with an Edit button rather than staying
 * as an open form. A form that never closes reads as unfinished work, and this
 * one is usually filled in once and never touched again.
 *
 * Editing later is safe and the copy says so: every invoice freezes its own
 * copy of these fields at issue time, so a correction changes the next invoice
 * and never rewrites one already sent.
 */
export function BillingDetailsForm({
  slug,
  legalName,
  gstin,
  state,
  address,
  invoiceEmail,
  fallbackName,
}: {
  slug: string;
  legalName: string;
  gstin: string;
  state: string | null;
  address: string;
  invoiceEmail: string;
  /** The contact name, offered as a starting point when no legal name is set. */
  fallbackName: string;
}) {
  const [state_, action, pending] = useActionState(
    saveBillingDetails,
    {} as BillingState
  );

  // A rejected submission is re-seeded from what was typed, not from what is
  // stored — otherwise React 19's post-action form reset throws it away.
  const v = state_.values;
  const saved = Boolean(state && address);
  // Opens automatically when nothing is on file, because that is the case
  // where the client has something to do.
  const [editing, setEditing] = useState(!saved);

  // A successful save closes the form; left open it shows the values it has
  // just stored, which reads as though nothing happened. Adjusted during
  // render rather than in an effect — React's documented way to react to a
  // changed input, and it avoids a second paint showing the stale form.
  const [lastSavedAt, setLastSavedAt] = useState(state_.savedAt);
  if (state_.savedAt !== lastSavedAt) {
    setLastSavedAt(state_.savedAt);
    setEditing(false);
  }

  const field =
    'mt-1.5 block w-full rounded-panel-sm border-2 border-neutral-300 bg-bg px-3.5 py-2.5 text-[14.5px] leading-[1.4] text-text transition-colors focus:border-accent-600';
  const label =
    'block text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700';

  if (saved && !editing) {
    return (
      <div className="mt-6 rounded-panel bg-panel p-[clamp(20px,3vw,28px)] shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h3 className="m-0 mb-3 flex flex-wrap items-center gap-2.5 font-heading text-[17px] font-bold leading-[1.2] tracking-[-0.025em]">
              <Check size={16} strokeWidth={3} aria-hidden="true" className="text-accent" />
              Invoice details saved
            </h3>
            <div className="text-[14.5px] leading-[1.65] text-neutral-800">
              <div className="font-semibold">{legalName || fallbackName}</div>
              <div className="whitespace-pre-line text-neutral-700">{address}</div>
              <div className="mt-1.5 text-neutral-700">
                {gstin ? `GSTIN ${gstin}` : 'Not GST registered'} ·{' '}
                {stateName(state) ?? '—'}
              </div>
              {invoiceEmail ? (
                <div className="mt-1.5 text-neutral-700">
                  Invoices go to {invoiceEmail}
                </div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-panel-sm border-2 border-neutral-400 px-4 text-[13.5px] font-semibold leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
          >
            <Pencil size={13} aria-hidden="true" />
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-panel bg-panel p-[clamp(20px,3.5vw,32px)] shadow-panel">
      <h3 className="m-0 mb-2.5 flex flex-wrap items-center gap-2.5 font-heading text-[18px] font-bold leading-[1.2] tracking-[-0.025em]">
        <FileText size={17} aria-hidden="true" className="text-accent" />
        {saved ? 'Edit your invoice details' : 'Who should the invoice be made out to?'}
      </h3>
      <p className="m-0 mb-6 max-w-[62ch] text-[14.5px] leading-[1.65] text-neutral-800">
        We need these to raise a proper GST tax invoice. Fill them in before you
        pay and the invoice arrives correct the first time — you can change them
        later, and doing so never alters an invoice already sent.
      </p>

      {/* Keyed on the attempt, so a rejected submission remounts with the
          values above rather than React's post-action reset to empty. */}
      <form action={action} key={state_.error ?? state_.savedAt ?? 'first'}>
        <input type="hidden" name="slug" value={slug} />

        <label className="block">
          <span className={label}>Billed to</span>
          <input
            name="legalName"
            required
            defaultValue={v?.legalName ?? (legalName || fallbackName)}
            placeholder="Your company's registered name, or your own"
            className={field}
          />
        </label>

        <label className="mt-5 block">
          <span className={label}>Billing address</span>
          <textarea
            name="address"
            rows={3}
            required
            defaultValue={v?.address ?? address}
            placeholder="Street, city, state, PIN code"
            className={field}
          />
        </label>

        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-5">
          <label className="block">
            <span className={label}>State</span>
            <select
              name="state"
              required
              defaultValue={v?.state ?? (state ?? '')}
              className={field}
            >
              <option value="">Choose your state</option>
              {GST_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-[12.5px] leading-[1.45] text-neutral-700">
              Decides how GST is split on your invoice.
            </span>
          </label>

          <label className="block">
            <span className={label}>GSTIN (optional)</span>
            <input
              name="gstin"
              defaultValue={v?.gstin ?? gstin}
              placeholder="09ABCDE1234F1Z5"
              className={field}
            />
            <span className="mt-1.5 block text-[12.5px] leading-[1.45] text-neutral-700">
              Leave blank if you are not registered — that is perfectly normal.
            </span>
          </label>
        </div>

        <label className="mt-5 block">
          <span className={label}>Send invoices to (optional)</span>
          <input
            name="invoiceEmail"
            type="email"
            defaultValue={v?.invoiceEmail ?? invoiceEmail}
            placeholder="accounts@yourcompany.com"
            className={field}
          />
          <span className="mt-1.5 block text-[12.5px] leading-[1.45] text-neutral-700">
            If your accounts team should get the invoice rather than you.
          </span>
        </label>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-[48px] items-center gap-2.5 rounded-panel-sm bg-text px-6 text-[14.5px] font-semibold leading-none text-bg transition-opacity hover:opacity-90 disabled:opacity-45"
          >
            <Check size={15} strokeWidth={3} aria-hidden="true" />
            {pending ? 'Saving…' : 'Save invoice details'}
          </button>

          {saved ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[13.5px] font-semibold leading-none text-neutral-700 underline underline-offset-4"
            >
              Cancel
            </button>
          ) : null}

          {state_.savedAt ? (
            <span role="status" className="text-[13.5px] leading-[1.45] text-neutral-700">
              Saved.
            </span>
          ) : null}
        </div>

        {state_.error ? (
          <p
            role="alert"
            className="m-0 mt-4 max-w-[62ch] text-[14px] font-medium leading-[1.55] text-accent-700"
          >
            {state_.error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
