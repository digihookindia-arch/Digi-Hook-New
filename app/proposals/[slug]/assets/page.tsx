import type { Metadata } from 'next';
import { unlockedProposal } from '@/lib/proposalAccess';
import { AssetsView } from '@/components/DeliveryView';
import { LockedNotice } from '../LockedNotice';
import { PendingNotice } from './PendingNotice';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'What we need from you',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default async function ProposalAssetsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const proposal = await unlockedProposal(slug);
  if (!proposal) return null;
  // Three states, in order: not accepted → accepted but the studio has not
  // published the list yet → the real list.
  if (!proposal.acceptedAt) return <LockedNotice slug={slug} />;
  if (!proposal.assetsSharedAt) return <PendingNotice />;

  return <AssetsView assets={proposal.assets} />;
}
