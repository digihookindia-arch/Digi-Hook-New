'use client';

import { useActionState } from 'react';
import { FileText } from 'lucide-react';
import { issueInvoiceAction, type IssueInvoiceState } from '../actions';

/**
 * Issues a tax invoice for a payment that settled before the billing details
 * were on file, and emails it.
 *
 * The retrospective half of the flow in `lib/paymentFlow.ts`: a payment that
 * clears without a place of supply gets a plain receipt, and this is how it
 * gets its invoice once the studio fills the field in. `issueInvoice` is keyed
 * on the payment, so pressing this twice returns the same invoice rather than
 * burning a second number on one payment.
 */
export function IssueInvoiceButton({
  slug,
  paymentId,
}: {
  slug: string;
  paymentId: string;
}) {
  const [state, action, pending] = useActionState(
    issueInvoiceAction,
    {} as IssueInvoiceState
  );

  if (state.issued) {
    return (
      <span className="text-[12.5px] leading-[1.4] text-neutral-800">
        Issued {state.issued}. Reload to open it.
      </span>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="paymentId" value={paymentId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[34px] items-center gap-2 border-2 border-neutral-400 px-3 text-[12.5px] font-semibold leading-none text-neutral-800 transition-colors hover:border-text disabled:opacity-45"
      >
        <FileText size={13} aria-hidden="true" />
        {pending ? 'Issuing…' : 'Issue invoice'}
      </button>
      {state.error ? (
        <p
          role="alert"
          className="m-0 mt-2 max-w-[30ch] text-[12px] leading-[1.45] text-accent-700"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
