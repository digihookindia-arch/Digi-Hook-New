import type { Metadata } from 'next';
import { unlockedProposal } from '@/lib/proposalAccess';
import { listInvoices } from '@/lib/invoices';
import { listPayments } from '@/lib/payments';
import { isRazorpayConfigured } from '@/lib/razorpay';
import { PaymentView } from '@/components/PaymentView';
import { LockedNotice } from '../LockedNotice';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payment',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default async function ProposalPaymentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const proposal = await unlockedProposal(slug);
  if (!proposal) return null;
  // Acceptance gate — the greyed tab is chrome; this check is the one that
  // holds when the URL is typed directly. Nothing is billable against a
  // project nobody has agreed to.
  if (!proposal.acceptedAt) return <LockedNotice slug={slug} />;

  return (
    <PaymentView
      slug={slug}
      total={proposal.content.total}
      milestones={proposal.milestones}
      gstPercent={proposal.gstPercent}
      payments={await listPayments(slug)}
      invoices={await listInvoices(slug)}
      razorpayLive={isRazorpayConfigured()}
      billing={{
        legalName: proposal.clientLegalName,
        gstin: proposal.clientGstin,
        state: proposal.clientState,
        address: proposal.clientAddress,
        invoiceEmail: proposal.invoiceEmail,
        contactName: proposal.client,
      }}
    />
  );
}
