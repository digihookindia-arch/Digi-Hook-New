import { STUDIO_INBOX, sendEmail } from './email';
import { INVOICE_BLOCK_LABELS } from './gst';
import { renderInvoicePdf } from './invoicePdf';
import {
  invoiceFilename,
  issueInvoice,
  markInvoiceEmailed,
} from './invoices';
import {
  invoiceIssuedEmail,
  paymentAlertBody,
  paymentReceiptEmail,
} from './paymentEmails';
import {
  getPaymentByOrder,
  markPaymentPaid,
  type Payment,
} from './payments';
import { getProposal, markMilestonePaid } from './proposals';
import { fetchPayment } from './razorpay';
import { sendWhatsapp } from './whatsapp';
import { paymentReceivedWhatsapp } from './whatsappMessages';

/**
 * Settling a payment: the one code path that decides money has arrived.
 *
 * Two things call it and both routinely fire for the same capture — the
 * browser's success callback, and Razorpay's webhook for the client who closed
 * the tab before it ran. So it has to be idempotent, and it is: the actual
 * transition happens in `markPaymentPaid`, whose UPDATE is conditional on the
 * row still being 'created'. Only the write that moves the row returns true,
 * and only that caller marks the milestone and sends mail. A second arrival
 * reports success and does nothing.
 *
 * Nothing here trusts what it was handed. Whoever calls has already proved the
 * signature; this then asks Razorpay directly what was captured and for how
 * much, and refuses to settle a row whose amount does not match. A page that
 * marks money received on the strength of a callback alone is a page anyone
 * can mark paid.
 */

export type SettleResult =
  | { ok: true; payment: Payment; alreadySettled: boolean }
  | { ok: false; error: string };

export async function settlePayment(input: {
  orderId: string;
  paymentId: string;
}): Promise<SettleResult> {
  const record = await getPaymentByOrder(input.orderId);
  if (!record) return { ok: false, error: 'No payment was started for that order.' };

  if (record.status === 'paid') {
    return { ok: true, payment: record, alreadySettled: true };
  }

  const remote = await fetchPayment(input.paymentId);
  if (!remote) {
    return { ok: false, error: 'We could not confirm that payment with the gateway.' };
  }

  // The three things that must line up before a rupee is called received.
  if (remote.order_id !== input.orderId) {
    console.error('[payments] order mismatch', input, remote.order_id);
    return { ok: false, error: 'That payment does not belong to this invoice.' };
  }
  if (remote.status !== 'captured' && remote.status !== 'authorized') {
    return {
      ok: false,
      error: 'The gateway has not confirmed that payment yet. It will update shortly.',
    };
  }
  if (remote.amount !== record.amountInr * 100) {
    console.error('[payments] amount mismatch', {
      order: input.orderId,
      expected: record.amountInr * 100,
      got: remote.amount,
    });
    return { ok: false, error: 'The amount paid does not match the invoice.' };
  }

  const moved = await markPaymentPaid(input.orderId, {
    paymentId: remote.id,
    method: remote.method,
  });
  const settled = await getPaymentByOrder(input.orderId);
  if (!settled) return { ok: false, error: 'The payment record went missing.' };

  // A second arrival for the same capture stops here: the row was already
  // moved, the milestone already marked, the receipt already sent.
  if (!moved) return { ok: true, payment: settled, alreadySettled: true };

  // One payment can settle several milestones - the "everything due" button.
  for (const index of settled.milestoneIndexes) {
    await markMilestonePaid(settled.proposalSlug, index);
  }
  await notify(settled);

  return { ok: true, payment: settled, alreadySettled: false };
}

/**
 * Issue the tax invoice, email it to the client, and tell the studio — all
 * best-effort, all after the write. The money is banked either way, and a mail
 * server having a bad afternoon must never surface as a failed payment to
 * someone who has just been charged.
 *
 * Two outcomes, and the difference is deliberate:
 *
 *  - Everything needed for a valid tax invoice is on file: the invoice is
 *    numbered, stored, rendered to PDF and attached to the client's email.
 *  - Something is missing (the studio's GSTIN, the client's state or billing
 *    address): the client gets a plain receipt that **says it is a receipt**,
 *    and the studio's alert names the exact field to fix. Nothing is dressed
 *    up as an invoice, because a client's accountant cannot file a receipt and
 *    finding that out in March is somebody's bad week.
 *
 * The studio can issue the invoice retrospectively from the dashboard once the
 * field is filled in — `issueInvoice` is keyed on the payment, so it numbers
 * it then rather than never.
 */
async function notify(payment: Payment): Promise<void> {
  try {
    const proposal = await getProposal(payment.proposalSlug);
    if (!proposal) return;

    // Invoices go to the accounts inbox when the client named one; everything
    // else still goes to the person we correspond with.
    const invoiceTo = proposal.invoiceEmail.trim() || proposal.clientEmail;

    const issued = await issueInvoice(proposal, payment);

    // Sent whether or not an invoice could be raised: a client who has just
    // been charged wants to know it landed, and "your invoice is delayed" is
    // a different conversation from "did my money arrive".
    await sendWhatsapp(
      paymentReceivedWhatsapp({
        name: proposal.client,
        phone: proposal.clientPhone,
        amountInr: payment.amountInr,
        invoiceNumber: issued.ok ? issued.invoice.number : null,
        slug: proposal.slug,
      })
    );

    if (issued.ok) {
      const { invoice } = issued;
      if (invoiceTo) {
        await sendEmail({
          to: invoiceTo,
          ...invoiceIssuedEmail({
            name: proposal.client,
            slug: proposal.slug,
            payment,
            invoiceNumber: invoice.number,
          }),
          attachments: [
            {
              filename: invoiceFilename(invoice),
              content: renderInvoicePdf({ invoice, payment }),
              contentType: 'application/pdf',
            },
          ],
        });
        await markInvoiceEmailed(invoice.id);
      }
    } else if (invoiceTo) {
      await sendEmail({
        to: invoiceTo,
        ...paymentReceiptEmail({
          name: proposal.client,
          slug: proposal.slug,
          payment,
        }),
      });
    }

    const alert = paymentAlertBody({
      client: proposal.client,
      slug: proposal.slug,
      payment,
    });
    await sendEmail({
      to: STUDIO_INBOX,
      subject: alert.subject,
      body: issued.ok
        ? `${alert.body}\n\nTax invoice ${issued.invoice.number} issued and emailed.`
        : [
            alert.body,
            '',
            'NO TAX INVOICE WAS ISSUED. The client has a plain receipt instead.',
            ...issued.blocks.map((block) => `  - ${INVOICE_BLOCK_LABELS[block]}`),
            '',
            'Fix the field above, then issue the invoice from the proposal page.',
          ].join('\n'),
    });
  } catch (e) {
    console.error('[payments] invoice or email failed', payment.receipt, e);
  }
}
