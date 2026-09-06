import { AlertTriangle, Save } from 'lucide-react';
import { GST_STATES, INVOICE_BLOCK_LABELS } from '@/lib/gst';
import { invoiceBlocksFor } from '@/lib/invoices';
import type { Proposal } from '@/lib/proposals';
import { updateBillingAction } from '../actions';
import { Label, inputClass } from './EditorKit';

/**
 * The client's billing identity — everything a GST tax invoice needs beyond
 * the money itself.
 *
 * The state is the field that matters and the one nothing can infer: it is the
 * place of supply, and it decides CGST+SGST versus IGST on every invoice for
 * this project. Until it is set, a payment clearing produces a plain receipt
 * and an email to the studio saying why, so this panel leads with exactly what
 * is missing rather than making somebody work it out in March.
 */
export function BillingForm({ proposal }: { proposal: Proposal }) {
  const blocks = invoiceBlocksFor(proposal);

  return (
    <div className="border-2 border-neutral-300">
      <div className="border-b border-neutral-300 p-[18px]">
        <h3 className="m-0 font-heading text-[16px] font-bold leading-[1.2] tracking-[-0.02em]">
          Billing details for the tax invoice
        </h3>
        <p className="m-0 mt-2 max-w-[70ch] text-[13px] leading-[1.55] text-neutral-700">
          Used only on the GST invoice, which is generated and emailed
          automatically the moment a payment clears.
        </p>
      </div>

      {blocks.length > 0 ? (
        <div className="flex flex-wrap items-start gap-3 border-b border-neutral-300 bg-neutral-100 p-[18px]">
          <AlertTriangle
            size={16}
            aria-hidden="true"
            className="mt-[2px] text-accent-700"
          />
          <div className="min-w-0 flex-[1_1_320px]">
            <p className="m-0 text-[13.5px] font-semibold leading-[1.5] text-accent-700">
              No tax invoice can be issued for this project yet.
            </p>
            <ul className="m-0 mt-2 grid list-none gap-1 p-0">
              {blocks.map((block) => (
                <li key={block} className="text-[13px] leading-[1.5] text-neutral-800">
                  {INVOICE_BLOCK_LABELS[block]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <form action={updateBillingAction} className="p-[18px]">
        <input type="hidden" name="slug" value={proposal.slug} />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
          <label className="block">
            <Label>Client state (place of supply)</Label>
            <select
              name="clientState"
              className={inputClass}
              defaultValue={proposal.clientState ?? ''}
            >
              <option value="">Not set</option>
              {GST_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <Label>Client GSTIN (optional)</Label>
            <input
              name="clientGstin"
              className={inputClass}
              defaultValue={proposal.clientGstin}
              placeholder="09ABCDE1234F1Z5"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <Label>Billing address</Label>
          <textarea
            name="billingAddress"
            rows={3}
            className={inputClass}
            defaultValue={proposal.clientAddress}
            placeholder="Street, city, state, PIN"
          />
        </label>

        <p className="m-0 mt-3 max-w-[70ch] text-[12.5px] leading-[1.55] text-neutral-700">
          An unregistered client is fine — leave the GSTIN blank and the invoice
          says so. The state is still required either way, because it decides the
          tax split.
        </p>

        <button
          type="submit"
          className="mt-4 inline-flex min-h-[44px] items-center gap-2.5 border-2 border-text px-5 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
        >
          <Save size={15} aria-hidden="true" />
          Save billing details
        </button>
      </form>
    </div>
  );
}
