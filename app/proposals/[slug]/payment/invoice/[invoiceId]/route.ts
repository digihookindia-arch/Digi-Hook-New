import { cookies } from 'next/headers';
import { accessCookie, verifyAccessToken } from '@/lib/auth';
import { getInvoice } from '@/lib/invoices';
import { invoicePdfResponse } from '@/lib/invoicePdf';
import { listPayments } from '@/lib/payments';
import { getProposal } from '@/lib/proposals';

export const dynamic = 'force-dynamic';

/**
 * Serves a client their own tax invoice as a PDF.
 *
 * The whole ownership chain is re-checked here, in this order: the proposal
 * exists, this visitor holds its access cookie, and the invoice belongs to
 * *this* proposal. A guessed invoice id from another client must 404, not
 * download — the same rule the portal's attachment routes follow.
 *
 * Rendered on demand rather than stored. The invoice row is frozen at issue
 * time, so re-rendering is deterministic, and a PDF sitting on disk would be
 * one more thing to back up and one more thing to leak.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; invoiceId: string }> }
) {
  const { slug, invoiceId } = await params;

  const proposal = await getProposal(slug);
  if (!proposal) return new Response('Not found', { status: 404 });

  const store = await cookies();
  const unlocked = verifyAccessToken(
    store.get(accessCookie(slug))?.value,
    slug,
    proposal.accessCode
  );
  if (!unlocked) return new Response('Not found', { status: 404 });

  const invoice = await getInvoice(invoiceId);
  if (!invoice || invoice.proposalSlug !== slug) {
    return new Response('Not found', { status: 404 });
  }

  // The invoice states how the money arrived, and that comes off the payment
  // row rather than the invoice.
  const payment = (await listPayments(slug)).find((p) => p.id === invoice.paymentId);
  if (!payment) return new Response('Not found', { status: 404 });

  return invoicePdfResponse(invoice, payment);
}
