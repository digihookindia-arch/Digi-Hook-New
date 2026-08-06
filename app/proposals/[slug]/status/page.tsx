import type { Metadata } from 'next';
import { unlockedProposal } from '@/lib/proposalAccess';
import { MilestonesView, StagesView } from '@/components/DeliveryView';
import { LockedNotice } from '../LockedNotice';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Project status',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default async function ProposalStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const proposal = await unlockedProposal(slug);
  if (!proposal) return null;
  // Acceptance gate — the greyed tab is chrome; this check is the one that
  // holds when the URL is typed directly.
  if (!proposal.acceptedAt) return <LockedNotice slug={slug} />;

  return (
    <>
      <StagesView stages={proposal.stages} />
      <MilestonesView
        milestones={proposal.milestones}
        total={proposal.content.total}
      />
    </>
  );
}
