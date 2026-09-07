import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { unlockedProposal } from '@/lib/proposalAccess';
import { site } from '@/lib/site';
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
        <section className="mt-[clamp(44px,6vw,76px)] overflow-hidden rounded-panel bg-panel p-[clamp(24px,4vw,44px)] shadow-lift">
          <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-600 text-white">
            <Check size={22} strokeWidth={3} aria-hidden="true" />
          </span>
          <h2 className="m-0 max-w-[22ch] font-heading text-[clamp(24px,3.2vw,36px)] font-extrabold leading-[1.04] tracking-[-0.04em]">
            Thank you — the proposal is accepted.
          </h2>
          <p className="m-0 mt-4 max-w-[58ch] text-[clamp(15.5px,1.6vw,17.5px)] leading-[1.7] text-neutral-800">
            Accepted on {formatDocDate(proposal.acceptedAt)}. Our team will
            contact you <strong className="font-semibold">within 24 hours</strong>{' '}
            to talk through the next steps and everything we need from you to
            get started.
          </p>
          <p className="m-0 mt-4 max-w-[58ch] text-[15px] leading-[1.7] text-neutral-800">
            Nothing is needed from you until then. The Status and Payment stages
            above are now open — Status tracks the build as it moves, and Payment
            carries the schedule, your invoices and receipts.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/proposals/${slug}/payment`}
              data-print-hide
              className="inline-flex min-h-[48px] items-center gap-2.5 rounded-panel-sm bg-text px-5 text-[14.5px] font-semibold leading-none text-bg transition-opacity hover:opacity-90"
            >
              See the payment schedule
              <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
            </Link>
            <a
              href={`tel:${site.phoneHref}`}
              className="text-[14.5px] font-semibold leading-none text-accent-700 underline underline-offset-4"
            >
              Or call us now on {site.phoneDisplay}
            </a>
          </div>
        </section>
      ) : (
        <AcceptProposal slug={slug} />
      )}
    </>
  );
}
