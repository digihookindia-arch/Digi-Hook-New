import type { Metadata } from 'next';
import { unlockedProposal } from '@/lib/proposalAccess';
import { StagesView } from '@/components/DeliveryView';
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

  // Work only. The payment schedule moved to its own tab when online payment
  // arrived — two copies of the same money on adjacent tabs is how a client
  // ends up reading a stale one.
  return <StagesView stages={proposal.stages} />;
}
