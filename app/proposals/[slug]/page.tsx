import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { unlockedProposal } from '@/lib/proposalAccess';
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
      <ProposalView content={proposal.content} milestones={proposal.milestones} />

      {proposal.acceptedAt ? (
        <div className="mt-12 flex flex-wrap items-baseline gap-x-3 gap-y-2 border-2 border-accent-600 p-6">
          <Check size={17} strokeWidth={3} aria-hidden="true" className="self-center text-accent" />
          <p className="m-0 text-[15px] font-semibold leading-[1.5]">
            Accepted on{' '}
            {new Date(proposal.acceptedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            .
          </p>
          <p className="m-0 text-[14px] leading-[1.5] text-neutral-700">
            {proposal.assetsSharedAt
              ? 'The tabs above are open — “What we need” lists everything we need from you.'
              : 'The tabs above are now open. We will post the list of what we need from you within 24 hours.'}
          </p>
        </div>
      ) : (
        <AcceptProposal slug={slug} />
      )}
    </>
  );
}
