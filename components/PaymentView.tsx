import { AlertCircle, Check, Download, Landmark, ShieldCheck } from 'lucide-react';
import { PayButton } from '@/app/proposals/[slug]/payment/PayButton';
import {
  dueDateLabel,
  milestoneSchedule,
  scheduleTotals,
  totalDue,
  type DueState,
  type Milestone,
  type ScheduleRow,
} from '@/lib/delivery';
import { formatInr } from '@/lib/money';
import { formatDocDate } from '@/lib/proposalDoc';
import type { Invoice } from '@/lib/invoices';
import { collectedInr, paidMilestones, type Payment } from '@/lib/payments';
import { site } from '@/lib/site';

/**
 * The Payment stage: what is owed, what has fallen due, what has been paid,
 * and the buttons that settle it.
 *
 * The rule that shapes the page (client's direction, 2026-09-06): a payment
 * whose due date has passed stops being an individual transaction and becomes
 * part of one running **total due**. Its own button greys out and the client
 * settles everything overdue in a single payment — because chasing three
 * separate late payments one checkout at a time is how a client ends up paying
 * none of them. Payments not yet due keep their own button, so anyone who
 * wants to pay early still can.
 *
 * Every figure says "payable" where it includes GST and "quoted" where it does
 * not, and both are always shown together. A client should never have to work
 * out which of two numbers on a page is the one that leaves their account.
 *
 * When Razorpay is not configured the page says so plainly and points at the
 * invoice route instead. It never renders a dead button, and it never invents
 * bank details the studio has not published.
 */

const PILL_STYLES: Record<DueState, string> = {
  paid: 'bg-accent-600 text-white',
  due: 'bg-accent-100 text-accent-700',
  upcoming: 'bg-surface text-neutral-700',
  undated: 'bg-surface text-neutral-700',
};

const PILL_LABELS: Record<DueState, string> = {
  paid: 'Paid',
  due: 'Due now',
  upcoming: 'Upcoming',
  undated: 'Not yet due',
};

function StatusPill({ state }: { state: DueState }) {
  // White on accent-600 measures 4.74:1 and passes AA; bare accent would not.
  return (
    <span
      className={`inline-flex min-h-[24px] items-center rounded-full px-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.1em] ${PILL_STYLES[state]}`}
    >
      {PILL_LABELS[state]}
    </span>
  );
}

/** One figure in the summary band. */
function Figure({
  label,
  value,
  note,
  emphasis,
}: {
  label: string;
  value: string;
  note?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex-[1_1_180px] rounded-panel p-5 ${
        emphasis ? 'bg-text text-bg shadow-lift' : 'bg-panel shadow-panel'
      }`}
    >
      <div
        className={`mb-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] ${
          emphasis ? 'text-accent-400' : 'text-accent-700'
        }`}
      >
        {label}
      </div>
      <div className="font-heading text-[clamp(24px,3vw,32px)] font-extrabold leading-none tracking-[-0.035em]">
        {value}
      </div>
      {note ? (
        <div
          className={`mt-2 text-[12.5px] leading-[1.5] ${
            emphasis ? 'text-neutral-400' : 'text-neutral-700'
          }`}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
}

export function PaymentView({
  slug,
  total,
  milestones,
  gstPercent,
  payments,
  invoices,
  razorpayLive,
}: {
  slug: string;
  total: string;
  milestones: Milestone[];
  gstPercent: number;
  payments: Payment[];
  invoices: Invoice[];
  /** Whether the studio's gateway keys are set. False hides every pay button. */
  razorpayLive: boolean;
}) {
  const settled = paidMilestones(payments);
  const schedule = milestoneSchedule(total, milestones, gstPercent, settled);
  const totals = scheduleTotals(schedule);
  const due = totalDue(schedule);
  const receipts = payments.filter((p) => p.status === 'paid');

  const paidRows = schedule.filter((row) => row.dueState === 'paid');
  const paidTotal = paidRows.every((row) => row.payable !== null)
    ? paidRows.reduce((sum, row) => sum + (row.payable ?? 0), 0)
    : null;
  const balance = totals && paidTotal !== null ? totals.payable - paidTotal : null;

  /**
   * Why a Pay now button cannot be pressed, or undefined when it can.
   *
   * The button is always rendered, never hidden. A client who cannot see a
   * payment control has no way to know the page takes payments at all — and a
   * disabled control with a stated reason is honest, where a control that
   * looks live and does nothing is not.
   */
  const payBlockedBecause = (isDue: boolean): string | undefined => {
    if (!razorpayLive) {
      return 'Card and UPI payment is being switched on for this project. Until it is, we will send you an invoice for this — or call us and we will take it over the phone.';
    }
    if (isDue) {
      return 'Past its due date, so it is collected with everything else due — use the total above.';
    }
    return undefined;
  };

  const invoiceFor = (payment: Payment) =>
    invoices.find((invoice) => invoice.paymentId === payment.id);
  const paymentFor = (row: ScheduleRow) =>
    receipts.find((p) => p.milestoneIndexes.includes(row.index));

  return (
    <section>
      <div className="mb-3 text-[13px] font-extrabold uppercase leading-none tracking-[0.16em] text-accent-700">
        04
      </div>
      <h2 className="m-0 font-heading text-[clamp(24px,3vw,38px)] font-extrabold leading-[1.06] tracking-[-0.035em]">
        Payment
      </h2>
      <p className="m-0 mt-5 max-w-[64ch] text-[clamp(15.5px,1.6vw,17.5px)] leading-[1.7] text-neutral-800">
        Every figure below is the quoted amount plus GST at {gstPercent}%. Anything
        that has reached its due date is collected together as one payment; the
        rest you can pay early if you want to.
      </p>

      {totals ? (
        <div className="mt-8 flex flex-wrap gap-4">
          <Figure
            label="Project total"
            value={formatInr(totals.payable)}
            note={`${formatInr(totals.subtotal)} + ${formatInr(totals.gst)} GST`}
          />
          <Figure
            label="Paid so far"
            value={paidTotal === null ? '—' : formatInr(paidTotal)}
            note={`${paidRows.length} of ${schedule.length} payments`}
          />
          <Figure
            label="Still to pay"
            value={balance === null ? '—' : formatInr(balance)}
            note={balance === 0 ? 'Nothing outstanding.' : 'GST included'}
            emphasis
          />
        </div>
      ) : null}

      {/* The running total of everything that has reached its due date. This
          is the page's one call to action whenever it exists — every row it
          covers has its own button disabled, so there is exactly one way to
          settle them and no way to pay the same milestone twice. */}
      {due ? (
        <div className="mt-6 overflow-hidden rounded-panel bg-accent-600 text-white shadow-lift">
          <div className="p-[clamp(22px,3.5vw,36px)]">
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <AlertCircle size={16} strokeWidth={2.5} aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.16em]">
                Total due now
              </span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
              <div>
                <div className="font-heading text-[clamp(30px,4.5vw,48px)] font-extrabold leading-[0.95] tracking-[-0.04em]">
                  {formatInr(due.payable)}
                </div>
                <div className="mt-2.5 max-w-[46ch] text-[13.5px] leading-[1.6] text-white/85">
                  {formatInr(due.subtotal)} + {formatInr(due.gst)} GST, covering{' '}
                  {due.rows.map((row) => row.milestone.label).join(' and ')}.
                </div>
              </div>
              <PayButton
                slug={slug}
                milestoneIndexes={due.rows.map((row) => row.index)}
                amountText={formatInr(due.payable)}
                label="everything due"
                onDark
                disabled={!razorpayLive}
                disabledReason={payBlockedBecause(false)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {schedule.length === 0 ? (
        <p className="m-0 mt-8 rounded-panel bg-panel p-6 text-[15px] leading-[1.6] text-neutral-700 shadow-panel">
          The payment schedule will appear here once it is agreed.
        </p>
      ) : (
        <ol className="m-0 mt-10 grid list-none gap-3.5 p-0">
          {schedule.map((row) => {
            const paid = row.dueState === 'paid';
            const isDue = row.dueState === 'due';
            const payment = paymentFor(row);
            const invoice = payment ? invoiceFor(payment) : undefined;
            const dateLabel = dueDateLabel(row);

            return (
              <li key={`${row.milestone.label}-${row.index}`}>
                <div
                  className={`break-inside-avoid overflow-hidden rounded-panel bg-panel ${
                    isDue ? 'shadow-lift ring-2 ring-accent-600' : 'shadow-panel'
                  }`}
                >
                  <div className="grid grid-cols-[46px_minmax(0,1fr)] gap-3 p-[clamp(18px,2.5vw,26px)]">
                    <div
                      className={`font-heading text-[20px] font-extrabold leading-none ${
                        paid ? 'text-accent' : 'text-neutral-500'
                      }`}
                    >
                      {String(row.index + 1).padStart(2, '0')}
                    </div>

                    <div>
                      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                          <h3 className="m-0 font-heading text-[17.5px] font-bold leading-[1.2] tracking-[-0.025em]">
                            {row.milestone.label}
                          </h3>
                          <StatusPill state={row.dueState} />
                          {dateLabel ? (
                            <span
                              className={`text-[12.5px] font-semibold leading-none ${
                                isDue ? 'text-accent-700' : 'text-neutral-700'
                              }`}
                            >
                              {dateLabel}
                            </span>
                          ) : null}
                        </div>

                        <div className="text-right">
                          {row.payableText ? (
                            <div className="font-heading text-[clamp(19px,2.2vw,24px)] font-extrabold leading-none tracking-[-0.03em]">
                              {row.payableText}
                            </div>
                          ) : null}
                          {row.subtotalText && row.gstText ? (
                            <div className="mt-1.5 text-[12.5px] leading-[1.45] text-neutral-700">
                              {row.subtotalText} + {row.gstText} GST
                              {row.milestone.percent > 0
                                ? ` · ${row.milestone.percent}%`
                                : ''}
                            </div>
                          ) : row.milestone.percent > 0 ? (
                            <div className="mt-1.5 text-[12.5px] leading-[1.45] text-neutral-700">
                              {row.milestone.percent}% of project
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {row.milestone.note ? (
                        <p className="m-0 max-w-[58ch] text-[14.5px] leading-[1.65] text-neutral-800">
                          {row.milestone.note}
                        </p>
                      ) : null}

                      {paid ? (
                        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13.5px] leading-[1.5] text-neutral-700">
                            <Check
                              size={14}
                              strokeWidth={3}
                              aria-hidden="true"
                              className="text-accent"
                            />
                            {payment
                              ? `Received ${formatDocDate(
                                  payment.paidAt ?? payment.createdAt
                                )}`
                              : 'Received — thank you.'}
                          </p>
                          {invoice ? (
                            <a
                              href={`/proposals/${slug}/payment/invoice/${invoice.id}`}
                              data-print-hide
                              className="inline-flex min-h-[36px] items-center gap-2 rounded-panel-sm bg-surface px-3.5 text-[12.5px] font-semibold leading-none text-neutral-800 transition-colors hover:bg-neutral-200"
                            >
                              <Download size={13} aria-hidden="true" />
                              Tax invoice {invoice.number}
                            </a>
                          ) : null}
                        </div>
                      ) : row.payable !== null ? (
                        <div className="mt-5">
                          <PayButton
                            slug={slug}
                            milestoneIndexes={[row.index]}
                            amountText={row.payableText ?? ''}
                            label={row.milestone.label}
                            tone="quiet"
                            disabled={!razorpayLive || isDue}
                            disabledReason={payBlockedBecause(isDue)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* How to pay, told once and honestly — including when the gateway is
          not switched on, where the only truthful answer is "we will invoice
          you". Never a dead button, never invented bank details. */}
      <div className="mt-10 rounded-panel bg-panel p-[clamp(22px,3.5vw,32px)] shadow-panel">
        <h3 className="m-0 mb-3.5 flex flex-wrap items-center gap-2.5 font-heading text-[18px] font-bold leading-[1.2] tracking-[-0.025em]">
          {razorpayLive ? (
            <ShieldCheck size={18} aria-hidden="true" className="text-accent" />
          ) : (
            <Landmark size={17} aria-hidden="true" className="text-neutral-700" />
          )}
          {razorpayLive ? 'Paying online' : 'How to pay'}
        </h3>
        <p className="m-0 max-w-[64ch] text-[15px] leading-[1.7] text-neutral-800">
          {razorpayLive
            ? 'Payments are handled by Razorpay — UPI, cards, net banking or a wallet. Your card details go to them and never reach us or this page. A GST tax invoice is emailed the moment a payment clears, and this page updates itself.'
            : 'Online payment is not switched on for this project yet. Tell us which payment you want to settle and we will send an invoice with the details on it.'}
        </p>
        <p className="m-0 mt-3.5 max-w-[64ch] text-[13.5px] leading-[1.65] text-neutral-700">
          Anything that does not look right, call us on{' '}
          <a
            href={`tel:${site.phoneHref}`}
            className="border-b border-accent text-accent-700"
          >
            {site.phoneDisplay}
          </a>
          {site.gstin ? ` · GSTIN ${site.gstin}` : ''}.
        </p>
      </div>

      {/* The ledger. Only settled rows: a client has no use for our failed and
          abandoned attempts, and showing them would read as charges. */}
      {receipts.length > 0 ? (
        <div className="mt-12">
          <h3 className="m-0 mb-5 font-heading text-[clamp(19px,2.2vw,24px)] font-bold leading-[1.2] tracking-[-0.03em]">
            Payments received
          </h3>
          <div className="overflow-hidden rounded-panel bg-panel shadow-panel">
            <div className="overflow-x-auto">
              <div className="grid min-w-[620px] grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.6fr)] border-b border-neutral-300 bg-surface text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-800">
                <div className="px-5 py-3.5">Date</div>
                <div className="px-5 py-3.5">Tax invoice</div>
                <div className="px-5 py-3.5">Payment</div>
                <div className="px-5 py-3.5 text-right">Amount</div>
              </div>
              {receipts.map((payment) => {
                const invoice = invoiceFor(payment);
                return (
                  <div
                    key={payment.id}
                    className="grid min-w-[620px] grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.6fr)] border-b border-neutral-200 last:border-b-0"
                  >
                    <div className="px-5 py-4 text-[14px] leading-[1.5] text-neutral-800">
                      {formatDocDate(payment.paidAt ?? payment.createdAt)}
                    </div>
                    <div className="px-5 py-4">
                      {invoice ? (
                        <a
                          href={`/proposals/${slug}/payment/invoice/${invoice.id}`}
                          className="font-heading text-[13.5px] font-bold leading-[1.35] tracking-[-0.01em] text-accent-700 underline underline-offset-4"
                        >
                          {invoice.number}
                        </a>
                      ) : (
                        <span className="text-[13.5px] leading-[1.4] text-neutral-700">
                          Receipt {payment.receipt}
                          <span className="mt-1 block text-[12px] text-neutral-600">
                            Invoice to follow
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="px-5 py-4 text-[14px] leading-[1.5] text-neutral-800">
                      {payment.milestoneLabel}
                    </div>
                    <div className="px-5 py-4 text-right">
                      <div className="font-heading text-[15px] font-extrabold leading-none tracking-[-0.02em]">
                        {formatInr(payment.amountInr)}
                      </div>
                      <div className="mt-1 text-[12.5px] leading-[1.45] text-neutral-700">
                        incl. {formatInr(payment.gstInr)} GST
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="m-0 mt-4 text-[13.5px] leading-[1.6] text-neutral-700">
            {formatInr(collectedInr(payments))} received online across{' '}
            {receipts.length} {receipts.length === 1 ? 'payment' : 'payments'}. Each
            GST tax invoice was emailed when the payment cleared, and every one is
            downloadable above.
          </p>
        </div>
      ) : null}
    </section>
  );
}
