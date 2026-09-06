import { getInvoice } from '@/lib/invoices';
import { invoicePdfResponse } from '@/lib/invoicePdf';
import { listPayments } from '@/lib/payments';
import { requireSession } from '../../../actions';

export const dynamic = 'force-dynamic';

/**
 * The studio's copy of a tax invoice.
 *
 * Same document, different proof: `requireSession()` rather than the client's
 * access cookie. Middleware only checks that a session cookie exists, so the
 * real check is here — the same rule as every dashboard page.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; invoiceId: string }> }
) {
  await requireSession();
  const { slug, invoiceId } = await params;

  const invoice = await getInvoice(invoiceId);
  if (!invoice || invoice.proposalSlug !== slug) {
    return new Response('Not found', { status: 404 });
  }

  const payment = (await listPayments(slug)).find((p) => p.id === invoice.paymentId);
  if (!payment) return new Response('Not found', { status: 404 });

  return invoicePdfResponse(invoice, payment);
}
