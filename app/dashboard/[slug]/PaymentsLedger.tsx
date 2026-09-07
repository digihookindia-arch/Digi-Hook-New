import { collectedInr, type Payment } from '@/lib/payments';
import type { Invoice } from '@/lib/invoices';
import { formatInr } from '@/lib/money';
import { isReachable } from '@/lib/phone';
import { IssueInvoiceButton } from './IssueInvoiceButton';
import { istDate, istDateTime } from '@/lib/when';

/**
 * The studio's view of the payment ledger — every attempt, not only the
 * settled ones.
 *
 * The client's Payment tab shows receipts alone, because failed and abandoned
 * attempts read as charges to the person who made them. Here they are the
 * point: a run of failures is a client who cannot pay, and an old 'created'
 * row is a payment worth chasing.
 *
 * It also says, plainly, when the gateway or its webhook is not configured.
 * Both are quiet failures otherwise — no keys means every client sees "we will
 * invoice you" and nobody upstairs finds out, and no webhook means a client
 * who closes the tab mid-payment stays unreconciled.
 */

const TONES: Record<Payment['status'], string> = {
  paid: 'border-accent-600 bg-accent-600 text-white',
  created: 'border-neutral-400 text-neutral-700',
  failed: 'border-neutral-400 text-neutral-700',
};

const LABELS: Record<Payment['status'], string> = {
  paid: 'Paid',
  created: 'Not completed',
  failed: 'Failed',
};

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 mb-5 border-2 border-neutral-300 bg-neutral-100 p-[18px] text-[13.5px] font-medium leading-[1.55] text-accent-700">
      {children}
    </p>
  );
}

export function PaymentsLedger({
  slug,
  payments,
  invoices,
  gatewayLive,
  webhookLive,
  contact,
}: {
  slug: string;
  payments: Payment[];
  invoices: Invoice[];
  gatewayLive: boolean;
  webhookLive: boolean;
  /**
   * What the checkout can prefill. Blank fields are screens the client has to
   * fill in themselves at the worst possible moment - mid-payment - so the
   * gap is worth saying out loud here rather than discovering it from a
   * client's complaint.
   */
  contact: { email: string; phone: string; payable: boolean };
}) {
  const received = collectedInr(payments);

  const missing = [
    contact.email ? null : 'email address',
    contact.phone ? null : 'phone number',
  ].filter(Boolean) as string[];

  // Checked with the sender's own rule, not just for emptiness: a number that
  // is present but unusable looks filled in on the page and silently reaches
  // nobody.
  const unreachable = Boolean(contact.phone) && !isReachable(contact.phone);

  return (
    <div>
      {unreachable ? (
        <Notice>
          The phone number on file is not one WhatsApp can reach, so payment and
          acceptance messages are being skipped for this client. It needs a
          country code or a full ten-digit mobile — fix it in the contact panel
          above.
        </Notice>
      ) : null}

      {contact.payable && missing.length > 0 ? (
        <Notice>
          No {missing.join(' or ')} on file for this client. Razorpay prefills the
          checkout from the proposal, so they will be asked to type{' '}
          {missing.length === 1 ? 'it' : 'them'} in mid-payment — and the receipt
          has nowhere to go. Add {missing.length === 1 ? 'it' : 'them'} in the
          contact panel above.
        </Notice>
      ) : null}

      {!gatewayLive ? (
        <Notice>
          Razorpay is not configured — set RAZORPAY_KEY_ID and
          RAZORPAY_KEY_SECRET. Until then the client&rsquo;s Payment tab says we
          will invoice them, and no payment can be taken here.
        </Notice>
      ) : !webhookLive ? (
        <Notice>
          Razorpay is live but RAZORPAY_WEBHOOK_SECRET is not set. Payments
          still work; a client who closes the tab before the confirmation
          returns will show as &ldquo;not completed&rdquo; here even though the
          money arrived. Point a webhook at /api/razorpay/webhook to close that
          gap.
        </Notice>
      ) : null}

      {payments.length === 0 ? (
        <p className="m-0 border-2 border-neutral-300 p-6 text-[15px] leading-[1.6] text-neutral-700">
          Nothing has been paid online against this proposal yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto border-t-2 border-text">
            <div className="grid min-w-[860px] grid-cols-[minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_minmax(0,0.7fr)] bg-text text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-bg">
              <div className="px-4 py-3">Started</div>
              <div className="border-l border-neutral-700 px-4 py-3">Reference</div>
              <div className="border-l border-neutral-700 px-4 py-3">Milestone</div>
              <div className="border-l border-neutral-700 px-4 py-3">Status</div>
              <div className="border-l border-neutral-700 px-4 py-3">Tax invoice</div>
              <div className="border-l border-neutral-700 px-4 py-3 text-right">
                Amount
              </div>
            </div>
            {payments.map((payment) => {
              const invoice = invoices.find((i) => i.paymentId === payment.id);
              return (
              <div
                key={payment.id}
                className="grid min-w-[860px] grid-cols-[minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_minmax(0,0.7fr)] border-b border-neutral-300"
              >
                <div className="px-4 py-4 text-[13.5px] leading-[1.5] text-neutral-800">
                  {istDateTime(payment.createdAt)}
                </div>
                <div className="border-l border-neutral-300 px-4 py-4 font-heading text-[13px] font-bold leading-[1.35] tracking-[-0.01em]">
                  {payment.receipt}
                  <div className="mt-1 break-all text-[12px] font-normal leading-[1.4] text-neutral-700">
                    {payment.paymentId ?? payment.orderId}
                  </div>
                </div>
                <div className="border-l border-neutral-300 px-4 py-4 text-[13.5px] leading-[1.5] text-neutral-800">
                  {payment.milestoneLabel}
                  {payment.method ? (
                    <div className="mt-1 text-[12px] uppercase tracking-[0.08em] text-neutral-700">
                      {payment.method}
                    </div>
                  ) : null}
                </div>
                <div className="border-l border-neutral-300 px-4 py-4">
                  <span
                    className={`inline-flex min-h-[24px] items-center border-2 px-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.1em] ${
                      TONES[payment.status]
                    }`}
                  >
                    {LABELS[payment.status]}
                  </span>
                  {payment.failureReason ? (
                    <div className="mt-1.5 text-[12px] leading-[1.45] text-neutral-700">
                      {payment.failureReason}
                    </div>
                  ) : null}
                </div>
                {/* Issued automatically when the payment clears, so an empty
                    cell here means something was missing at the time - the
                    button issues it retrospectively and emails it. */}
                <div className="border-l border-neutral-300 px-4 py-4">
                  {invoice ? (
                    <>
                      <a
                        href={`/dashboard/${slug}/invoice/${invoice.id}`}
                        className="font-heading text-[13px] font-bold leading-[1.35] tracking-[-0.01em] text-accent-700 underline underline-offset-4"
                      >
                        {invoice.number}
                      </a>
                      {/* An invoice raised while there was no address on file
                          exists but was never sent, and nothing else in the UI
                          would ever offer to send it. Add the email, press
                          this. */}
                      {invoice.emailedAt ? (
                        <div className="mt-1 text-[12px] leading-[1.4] text-neutral-700">
                          Emailed{' '}
                          {istDate(invoice.emailedAt)}
                        </div>
                      ) : (
                        <div className="mt-2">
                          <IssueInvoiceButton
                            slug={slug}
                            paymentId={payment.id}
                            label="Not emailed — send it"
                          />
                        </div>
                      )}
                    </>
                  ) : payment.status === 'paid' ? (
                    <IssueInvoiceButton slug={slug} paymentId={payment.id} />
                  ) : (
                    <span className="text-[12.5px] leading-[1.4] text-neutral-700">
                      &mdash;
                    </span>
                  )}
                </div>
                <div className="border-l border-neutral-300 px-4 py-4 text-right">
                  <div className="font-heading text-[15px] font-extrabold leading-none tracking-[-0.02em]">
                    {formatInr(payment.amountInr)}
                  </div>
                  <div className="mt-1 text-[12px] leading-[1.45] text-neutral-700">
                    {formatInr(payment.subtotalInr)} + {formatInr(payment.gstInr)}{' '}
                    GST at {payment.gstPercent}%
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          <p className="m-0 mt-4 text-[13.5px] leading-[1.6] text-neutral-700">
            {formatInr(received)} received online. Raise the GST invoices from
            the books — this system issues receipts, not tax invoices.
          </p>
        </>
      )}
    </div>
  );
}
