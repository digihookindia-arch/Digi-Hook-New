import { milestoneEmailHtml } from './emailTemplate';
import { formatInr } from './money';
import { formatDocDate, proposalRef } from './proposalDoc';
import { site, SITE_URL, whatsappUrl } from './site';
import type { Payment } from './payments';

/**
 * What goes out when money actually moves: a receipt to the client and a
 * plain alert to the studio.
 *
 * Kept apart from `milestoneEmails.ts` on purpose. Those four are the sales
 * journey and share its numbered step track; a receipt is an accounting
 * document that happens to arrive by email, and putting a four-step sales
 * track on it would be nonsense — so `step` is omitted, exactly as the portal
 * emails omit it.
 *
 * The receipt states the three figures separately (quoted, tax, charged)
 * because that is what an accountant needs, and it takes them from the stored
 * payment row rather than recomputing: the rate that applied when the money
 * moved is a fact about that transaction.
 *
 * This is a receipt, not a tax invoice. It says so. The studio raises the GST
 * invoice from its own books, and promising otherwise in an automated email
 * would be promising something nobody has checked.
 */

export type PaymentMail = {
  subject: string;
  /** Plain-text fallback, sent alongside the HTML. */
  body: string;
  html: string;
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}

/**
 * The client's covering note for a tax invoice, with the PDF attached by the
 * caller. Says the same three figures as the invoice so the email is readable
 * without opening anything, and names the invoice number, which is what a
 * client's accountant will search their inbox for.
 */
export function invoiceIssuedEmail(input: {
  name: string;
  slug: string;
  payment: Payment;
  invoiceNumber: string;
}): PaymentMail {
  const { payment } = input;
  const paymentUrl = `${SITE_URL}/proposals/${input.slug}/payment`;
  const paidOn = formatDocDate(payment.paidAt ?? payment.createdAt);
  const charged = formatInr(payment.amountInr);

  return {
    subject: `Tax invoice ${input.invoiceNumber} — ${charged} received — Digi Hook`,
    body: [
      `Hi ${firstName(input.name)},`,
      '',
      `We have received your payment of ${charged} for ${payment.milestoneLabel}. Thank you.`,
      '',
      `Your GST tax invoice ${input.invoiceNumber} is attached as a PDF.`,
      '',
      `Invoice:      ${input.invoiceNumber}`,
      `Payment:      ${payment.milestoneLabel}`,
      `Date:         ${paidOn}`,
      `Taxable:      ${formatInr(payment.subtotalInr)}`,
      `GST at ${payment.gstPercent}%:   ${formatInr(payment.gstInr)}`,
      `Total paid:   ${charged}`,
      payment.paymentId ? `Gateway ref:  ${payment.paymentId}` : '',
      '',
      `Your payment page shows what is paid and what is still to come: ${paymentUrl}`,
      '',
      `${site.name}`,
      `${site.addressLine}`,
      `${site.email} · ${site.phoneDisplay}`,
    ]
      .filter((line, i, all) => line !== '' || all[i - 1] !== '')
      .join('\n'),
    html: milestoneEmailHtml({
      preheader: `Tax invoice ${input.invoiceNumber} for ${charged} — attached as a PDF.`,
      kicker: 'Payment received',
      headline: `Thank you.<br>${charged}<br>received.`,
      leadHeading: `Tax invoice ${input.invoiceNumber}`,
      // Escaped by the shell. Client-typed text never reaches `headline` or
      // `secondaryLine`, which are not escaped — the rule the portal emails
      // follow too.
      leadBody:
        `${payment.milestoneLabel}, paid on ${paidOn}. ` +
        `${formatInr(payment.subtotalInr)} plus GST at ${payment.gstPercent}% of ` +
        `${formatInr(payment.gstInr)}, giving ${charged}. ` +
        'Your GST tax invoice is attached to this email as a PDF.',
      detailLeftLabel: 'Amount paid',
      detailLeftValue: charged,
      detailRightLabel: 'Invoice',
      detailRightValue: input.invoiceNumber,
      ctaText: 'See your payment page',
      ctaHref: paymentUrl,
      secondaryLine:
        `Anything that does not look right, tell us straight away — ` +
        `<a href="tel:${site.phoneHref}" style="color:#b02510;text-decoration:underline;">${site.phoneDisplay}</a> ` +
        `or <a href="${whatsappUrl(
          `Hello Digi Hook, about invoice ${input.invoiceNumber} —`
        )}" style="color:#b02510;text-decoration:underline;">WhatsApp</a>.`,
      footerNote:
        'You are receiving this because you made a payment against your Digi Hook project.',
    }),
  };
}

/**
 * The fallback when a tax invoice cannot be issued — the studio's GSTIN or the
 * client's state is missing. A plain receipt, which says exactly what it is.
 * Never dressed up as an invoice: a client's accountant cannot file this.
 */
export function paymentReceiptEmail(input: {
  name: string;
  slug: string;
  payment: Payment;
}): PaymentMail {
  const { payment } = input;
  const paymentUrl = `${SITE_URL}/proposals/${input.slug}/payment`;
  const paidOn = formatDocDate(payment.paidAt ?? payment.createdAt);
  const charged = formatInr(payment.amountInr);

  const lines = [
    `Reference:   ${payment.receipt}`,
    `Payment:     ${payment.milestoneLabel}`,
    `Date:        ${paidOn}`,
    `Amount:      ${formatInr(payment.subtotalInr)}`,
    `GST at ${payment.gstPercent}%:  ${formatInr(payment.gstInr)}`,
    `Total paid:  ${charged}`,
    payment.paymentId ? `Gateway ref: ${payment.paymentId}` : '',
  ].filter(Boolean);

  return {
    subject: `Payment received — ${charged} — ${payment.receipt} — Digi Hook`,
    body: [
      `Hi ${firstName(input.name)},`,
      '',
      `We have received your payment of ${charged} for ${payment.milestoneLabel}. Thank you.`,
      '',
      ...lines,
      '',
      `Your payment page shows what is paid and what is still to come: ${paymentUrl}`,
      '',
      'This is a receipt, not a tax invoice. We will send the GST invoice separately.',
      '',
      `${site.name}`,
      `${site.addressLine}`,
      `${site.email} · ${site.phoneDisplay}`,
    ].join('\n'),
    html: milestoneEmailHtml({
      preheader: `Receipt for ${charged} — ${payment.milestoneLabel}, reference ${payment.receipt}.`,
      kicker: 'Payment received',
      headline: `Thank you.<br>${charged}<br>received.`,
      leadHeading: `Receipt ${payment.receipt}`,
      // Escaped by the shell. Client-typed text never reaches `headline` or
      // `secondaryLine`, which are not escaped — the same rule the portal
      // emails follow.
      leadBody:
        `${payment.milestoneLabel}, paid on ${paidOn}. ` +
        `${formatInr(payment.subtotalInr)} plus GST at ${payment.gstPercent}% of ` +
        `${formatInr(payment.gstInr)}, giving ${charged}. ` +
        'This is a receipt rather than a tax invoice — we will send the GST invoice separately.',
      detailLeftLabel: 'Amount paid',
      detailLeftValue: charged,
      detailRightLabel: 'Reference',
      detailRightValue: payment.receipt,
      ctaText: 'See your payment page',
      ctaHref: paymentUrl,
      secondaryLine:
        `Anything that does not look right, tell us straight away — ` +
        `<a href="tel:${site.phoneHref}" style="color:#b02510;text-decoration:underline;">${site.phoneDisplay}</a> ` +
        `or <a href="${whatsappUrl(
          `Hello Digi Hook, about payment ${payment.receipt} —`
        )}" style="color:#b02510;text-decoration:underline;">WhatsApp</a>.`,
      footerNote:
        'You are receiving this because you made a payment against your Digi Hook project.',
    }),
  };
}

/**
 * The studio's own alert. Deliberately plain text with a deep link — the same
 * shape as the portal's ticket alerts, because nobody on the team needs a
 * poster block to tell them money arrived.
 */
export function paymentAlertBody(input: {
  client: string;
  slug: string;
  payment: Payment;
}): { subject: string; body: string } {
  const { payment } = input;
  return {
    subject: `Payment received: ${formatInr(payment.amountInr)} from ${input.client}`,
    body: [
      `${input.client} paid ${formatInr(payment.amountInr)}.`,
      '',
      `Proposal:    ${proposalRef(input.slug)}`,
      // Every position, not just the first — one payment can settle several,
      // and "position 1" on a payment covering two is a lie the studio would
      // have to go and check.
      `Milestone:   ${payment.milestoneLabel} (position${
        payment.milestoneIndexes.length > 1 ? 's' : ''
      } ${payment.milestoneIndexes.map((i) => i + 1).join(', ')})`,
      `Quoted:      ${formatInr(payment.subtotalInr)}`,
      `GST ${payment.gstPercent}%:     ${formatInr(payment.gstInr)}`,
      `Charged:     ${formatInr(payment.amountInr)}`,
      `Receipt:     ${payment.receipt}`,
      `Razorpay:    ${payment.paymentId ?? '—'} (order ${payment.orderId})`,
      `Method:      ${payment.method ?? '—'}`,
      '',
      'The milestone has been marked paid automatically.',
      'Raise the GST invoice from the books — this system does not.',
      '',
      `${SITE_URL}/dashboard/${input.slug}`,
    ].join('\n'),
  };
}
