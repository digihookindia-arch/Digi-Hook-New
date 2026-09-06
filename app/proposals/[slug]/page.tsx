import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { unlockedProposal } from '@/lib/proposalAccess';
import { formatDocDate } from '@/lib/proposalDoc';
import { ProposalView } from '@/components/ProposalView';
import { AcceptProposal } from './AcceptProposal';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Project proposal',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The layout renders the gate; this returns null when locked so nothing is
  // built into the response for a visitor who has not entered the code.
  const proposal = await unlockedProposal(slug);
  if (!proposal) return null;

  return (
    <>
      <ProposalView
        content={proposal.content}
        milestones={proposal.milestones}
        gstPercent={proposal.gstPercent}
      />

      {proposal.acceptedAt ? (
        <section className="mt-[clamp(44px,6vw,76px)] overflow-hidden rounded-panel bg-panel p-[clamp(24px,4vw,44px)] shadow-panel">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-600 text-white">
              <Check size={17} strokeWidth={3} aria-hidden="true" />
            </span>
            <h2 className="m-0 font-heading text-[clamp(21px,2.4vw,30px)] font-bold leading-[1.12] tracking-[-0.03em]">
              Accepted on {formatDocDate(proposal.acceptedAt)}
            </h2>
          </div>
          <p className="m-0 mb-6 max-w-[56ch] text-[15.5px] leading-[1.65] text-neutral-800">
            {proposal.assetsSharedAt
              ? 'The other three stages are open — “What we need” lists everything we need from you, and “Payment” carries the schedule and your receipts.'
              : 'The other three stages are open. We will post the list of what we need from you within 24 hours.'}
          </p>
          <Link
            href={`/proposals/${slug}/payment`}
            data-print-hide
            className="inline-flex min-h-[48px] items-center gap-2.5 rounded-panel-sm bg-text px-5 text-[14.5px] font-semibold leading-none text-bg transition-opacity hover:opacity-90"
          >
            Go to payment
            <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <AcceptProposal slug={slug} />
      )}
    </>
  );
}
