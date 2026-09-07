import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { milestoneSchedule, parseAmount, totalDue } from '@/lib/delivery';
import { formatInr, gstOn } from '@/lib/money';
import {
  formatDocDate,
  isExpired,
  proposalRef,
  timelineSummary,
  validUntil,
} from '@/lib/proposalDoc';
import type { Proposal } from '@/lib/proposals';
import { paidMilestones, type Payment } from '@/lib/payments';

/**
 * The cover. A full-bleed dark band carrying the document's identity, the
 * three or four facts a client wants before reading a word, and the one thing
 * to do next.
 *
 * This replaced a kicker, an h1 and a four-column detail grid sitting loose on
 * the page — the same information, but arranged so that opening the link feels
 * like being handed a document rather than a web page. The client's direction,
 * 2026-09-06: a premium printed document, with the bold full-width blocks of a
 * proposal tool.
 *
 * On the dark ground the palette inverts, per the contrast rules in CLAUDE.md:
 * `neutral-400` for supporting text (`neutral-600`/`700` disappear against it)
 * and `accent-400` for the kicker, which holds up on dark where bare `accent`
 * does not.
 *
 * Every figure here is derived, never stored twice. The headline total comes
 * through the same `milestoneSchedule` the payment tab charges against, so the
 * number on the cover and the number on the button cannot drift.
 */

function Fact({
  label,
  value,
  note,
  lead,
}: {
  label: string;
  value: string;
  note?: string;
  lead?: boolean;
}) {
  return (
    <div>
      <div className="mb-2.5 text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-400">
        {label}
      </div>
      <div
        className={`font-heading font-extrabold leading-[1.05] tracking-[-0.03em] text-bg ${
          lead ? 'text-[clamp(26px,3.2vw,38px)]' : 'text-[clamp(17px,1.7vw,20px)]'
        }`}
      >
        {value}
      </div>
      {note ? (
        <div className="mt-2 text-[13px] leading-[1.5] text-neutral-400">{note}</div>
      ) : null}
    </div>
  );
}

export function ProposalCover({
  proposal,
  payments,
}: {
  proposal: Proposal;
  payments: Payment[];
}) {
  const ref = proposalRef(proposal.slug);
  const accepted = Boolean(proposal.acceptedAt);
  const lapsed = !accepted && isExpired(proposal.updatedAt);
  const until = validUntil(proposal.updatedAt);
  const timeline = timelineSummary(proposal.content.timeline);

  const subtotal = parseAmount(proposal.content.total);
  const grand = subtotal === null ? null : gstOn(subtotal, proposal.gstPercent);

  // What the cover's call to action offers, in the same order the payment
  // stage does: everything that has fallen due, else the next thing payable.
  // Same source as that page, so the figure on the button is the figure that
  // gets charged.
  const schedule = milestoneSchedule(
    proposal.content.total,
    proposal.milestones,
    proposal.gstPercent,
    paidMilestones(payments)
  );
  const due = totalDue(schedule);
  // A row worth nothing is not the next thing to pay. Razorpay's floor is one
  // rupee, so "Next: ₹0" offers something that cannot be collected — the same
  // guard the payment stage and `totalDue` already apply.
  const nextUp = schedule.find(
    (row) => row.dueState !== 'paid' && row.payable !== null && row.payable >= 1
  );

  return (
    <section className="bg-text text-bg">
      <div className="mx-auto max-w-[1140px] px-gutter py-[clamp(44px,7vw,80px)]">
        <div className="mb-7 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.18em] text-accent-400">
            Proposal · Ref {ref}
          </span>
          <span
            className={`inline-flex min-h-[26px] items-center rounded-full border px-3 text-[11px] font-semibold uppercase leading-none tracking-[0.1em] ${
              accepted
                ? 'border-transparent bg-accent-600 text-white'
                : lapsed
                  ? 'border-neutral-600 text-neutral-400'
                  : 'border-accent-400 text-accent-400'
            }`}
          >
            {accepted
              ? 'Accepted'
              : lapsed
                ? 'Price needs confirming'
                : 'Awaiting your decision'}
          </span>
        </div>

        <h1 className="m-0 max-w-[20ch] font-heading text-[clamp(34px,6vw,68px)] font-extrabold leading-[0.98] tracking-[-0.045em] text-bg">
          {proposal.content.title}
        </h1>

        <p className="m-0 mt-5 max-w-[60ch] text-[clamp(15.5px,1.7vw,18px)] leading-[1.6] text-neutral-400">
          Prepared for <span className="text-bg">{proposal.client}</span> by Digi
          Hook. {accepted
            ? 'Agreed and under way — the stages on the left track everything from here.'
            : 'Read it, ask us anything, and accept when you are happy.'}
        </p>

        <div className="mt-[clamp(32px,4vw,52px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-8 gap-y-9 border-t border-neutral-700 pt-[clamp(28px,3.5vw,40px)]">
          {grand ? (
            <Fact
              label="Total payable"
              value={formatInr(grand.total)}
              note={`${formatInr(grand.subtotal)} + ${formatInr(grand.gst)} GST at ${grand.gstPercent}%`}
              lead
            />
          ) : (
            <Fact
              label="Project total"
              value={proposal.content.total}
              note={`Exclusive of GST at ${proposal.gstPercent}%`}
              lead
            />
          )}

          {timeline ? (
            <Fact
              label="Delivery"
              value={timeline}
              note={`${proposal.content.timeline.length} stages, from start to launch`}
            />
          ) : null}

          <Fact
            label="Issued"
            value={formatDocDate(proposal.updatedAt)}
            note={`Reference ${ref}`}
          />

          <Fact
            label={accepted ? 'Accepted on' : 'Price held until'}
            value={
              accepted
                ? formatDocDate(proposal.acceptedAt as string)
                : until
                  ? formatDocDate(until.toISOString())
                  : '—'
            }
            note={
              accepted
                ? undefined
                : lapsed
                  ? 'Past that date — call us and we will confirm it.'
                  : 'After that, call us to confirm the figures.'
            }
          />
        </div>

        {/* One next action, and only one. Before acceptance that is reading to
            the end and agreeing; after it, the payment that is actually due. */}
        <div data-print-hide className="mt-[clamp(28px,3.5vw,44px)]">
          {!accepted ? (
            <a
              href="#accept"
              className="inline-flex min-h-[54px] items-center gap-3 rounded-panel-sm bg-accent-600 px-7 text-[15.5px] font-semibold leading-none text-white shadow-lift transition-colors hover:bg-accent-500"
            >
              Accept this proposal
              <ArrowRight size={17} strokeWidth={2.5} aria-hidden="true" />
            </a>
          ) : due ? (
            <Link
              href={`/proposals/${proposal.slug}/payment`}
              className="inline-flex min-h-[54px] items-center gap-3 rounded-panel-sm bg-accent-600 px-7 text-[15.5px] font-semibold leading-none text-white shadow-lift transition-colors hover:bg-accent-500"
            >
              Pay now — {formatInr(due.payable)} due
              <ArrowRight size={17} strokeWidth={2.5} aria-hidden="true" />
            </Link>
          ) : nextUp ? (
            <Link
              href={`/proposals/${proposal.slug}/payment`}
              className="inline-flex min-h-[54px] items-center gap-3 rounded-panel-sm border-2 border-bg px-7 text-[15.5px] font-semibold leading-none text-bg transition-colors hover:bg-bg hover:text-text"
            >
              Next: {nextUp.payableText} — {nextUp.milestone.label}
              <ArrowRight size={17} strokeWidth={2.5} aria-hidden="true" />
            </Link>
          ) : (
            <p className="m-0 text-[15px] leading-[1.6] text-neutral-400">
              Everything on the schedule is settled. Nothing is waiting on you.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
