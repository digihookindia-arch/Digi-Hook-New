import { amountInWords, stateName } from './gst';
import { invoiceFilename, type Invoice } from './invoices';
import type { Payment } from './payments';
import { Pdf } from './pdf';
import { site } from './site';

/**
 * Renders a GST tax invoice as a one-page A4 PDF.
 *
 * The layout is the conventional Indian one, in the order an accountant reads
 * it: supplier block, invoice identity, bill-to and place of supply, the line
 * item with its SAC code and taxable value, the tax split, the total, and the
 * amount in words. Nothing decorative — this is a document that gets filed,
 * not looked at.
 *
 * Money is printed as plain grouped digits with the currency named in the
 * column heading, because the base-14 fonts have no rupee glyph (see
 * `lib/pdf.ts`). That is also how most Indian invoicing software prints it.
 *
 * Every figure comes off the stored invoice row, never off today's proposal —
 * the row was frozen at issue time precisely so this stays reproducible.
 */

/** Grouped Indian digits, no symbol: "1,85,000.00". */
function inr(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}.00`;
}

function longDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const LEFT = 42;
const RIGHT = 553;
const WIDTH = RIGHT - LEFT;

export function renderInvoicePdf(input: {
  invoice: Invoice;
  payment: Payment;
}): Buffer {
  const { invoice, payment } = input;
  const pdf = new Pdf();
  const intra = invoice.igstInr === 0;

  /* ── head band ───────────────────────────────────────────────────────── */
  pdf.fill(0, 0, pdf.width, 76, 0.12);
  pdf.text(LEFT, 34, site.legalName, { font: 'bold', size: 19, grey: 1 });
  pdf.text(LEFT, 54, site.tagline, { size: 8.5, grey: 0.75 });
  pdf.text(RIGHT - 118, 34, 'TAX INVOICE', { font: 'bold', size: 15, grey: 1 });
  pdf.text(RIGHT - 118, 54, 'Original for recipient', { size: 8.5, grey: 0.75 });

  /* ── supplier and invoice identity ───────────────────────────────────── */
  let y = 106;
  pdf.text(LEFT, y, 'SUPPLIER', { font: 'bold', size: 8, grey: 0.4 });
  pdf.text(LEFT + 300, y, 'INVOICE', { font: 'bold', size: 8, grey: 0.4 });

  y += 15;
  pdf.text(LEFT, y, site.legalName, { font: 'bold', size: 10 });
  pdf.text(LEFT + 300, y, 'Number', { size: 9, grey: 0.4 });
  pdf.text(LEFT + 380, y, invoice.number, { font: 'bold', size: 10 });

  y += 13;
  pdf.text(LEFT, y, site.address.street, { size: 9, grey: 0.25 });
  pdf.text(LEFT + 300, y, 'Date', { size: 9, grey: 0.4 });
  pdf.text(LEFT + 380, y, longDate(invoice.issuedAt), { size: 9, grey: 0.25 });

  y += 13;
  pdf.text(
    LEFT,
    y,
    `${site.address.locality}, ${site.address.region} ${site.address.postalCode}`,
    { size: 9, grey: 0.25 }
  );
  pdf.text(LEFT + 300, y, 'Reference', { size: 9, grey: 0.4 });
  pdf.text(LEFT + 380, y, payment.receipt, { size: 9, grey: 0.25 });

  y += 13;
  pdf.text(LEFT, y, `${site.email} · ${site.phoneDisplay}`, { size: 9, grey: 0.25 });
  pdf.text(LEFT + 300, y, 'Place of supply', { size: 9, grey: 0.4 });
  pdf.text(
    LEFT + 380,
    y,
    `${stateName(invoice.placeOfSupply) ?? '—'} (${invoice.placeOfSupply})`,
    { size: 9, grey: 0.25 }
  );

  y += 13;
  pdf.text(LEFT, y, `GSTIN ${invoice.supplierGstin}`, { font: 'bold', size: 9 });
  pdf.text(LEFT + 300, y, 'Reverse charge', { size: 9, grey: 0.4 });
  pdf.text(LEFT + 380, y, 'No', { size: 9, grey: 0.25 });

  /* ── bill to ─────────────────────────────────────────────────────────── */
  y += 26;
  pdf.rule(LEFT, y, WIDTH, { grey: 0.8 });
  y += 20;
  pdf.text(LEFT, y, 'BILL TO', { font: 'bold', size: 8, grey: 0.4 });
  y += 15;
  pdf.text(LEFT, y, invoice.clientName, { font: 'bold', size: 11 });
  y += 14;
  y = pdf.paragraph(LEFT, y, invoice.clientAddress, {
    width: 300,
    size: 9,
    grey: 0.25,
  });
  if (invoice.clientGstin) {
    pdf.text(LEFT, y + 2, `GSTIN ${invoice.clientGstin}`, { font: 'bold', size: 9 });
    y += 16;
  } else {
    pdf.text(LEFT, y + 2, 'Unregistered recipient', { size: 9, grey: 0.45 });
    y += 16;
  }

  /* ── the line item ───────────────────────────────────────────────────── */
  y += 16;
  pdf.fill(LEFT, y - 11, WIDTH, 22, 0.92);
  pdf.text(LEFT + 8, y + 3, '#', { font: 'bold', size: 8, grey: 0.3 });
  pdf.text(LEFT + 26, y + 3, 'DESCRIPTION', { font: 'bold', size: 8, grey: 0.3 });
  pdf.text(LEFT + 330, y + 3, 'SAC', { font: 'bold', size: 8, grey: 0.3 });
  pdf.text(RIGHT - 118, y + 3, 'TAXABLE VALUE (INR)', {
    font: 'bold',
    size: 8,
    grey: 0.3,
  });

  y += 30;
  pdf.text(LEFT + 8, y, '1', { size: 9.5, grey: 0.25 });
  const afterDescription = pdf.paragraph(LEFT + 26, y, invoice.description, {
    width: 290,
    size: 9.5,
    grey: 0,
  });
  pdf.text(LEFT + 330, y, invoice.sacCode, { size: 9.5, grey: 0.25 });
  pdf.textRight(RIGHT, y, inr(invoice.taxableInr), { font: 'bold', size: 10 });

  y = Math.max(afterDescription, y + 14);
  pdf.text(LEFT + 26, y, `Proposal reference ${invoice.proposalSlug.slice(0, 8).toUpperCase()}`, {
    size: 8.5,
    grey: 0.45,
  });

  /* ── the tax split ───────────────────────────────────────────────────── */
  y += 22;
  pdf.rule(LEFT, y, WIDTH, { grey: 0.8 });

  const labelX = RIGHT - 250;
  const row = (label: string, value: string, bold = false) => {
    y += 18;
    pdf.text(labelX, y, label, { size: 9.5, grey: bold ? 0 : 0.35, font: bold ? 'bold' : 'regular' });
    pdf.textRight(RIGHT, y, value, { size: bold ? 10.5 : 9.5, font: bold ? 'bold' : 'regular' });
  };

  row('Taxable value', inr(invoice.taxableInr));
  if (intra) {
    // Half the rate each — the statutory split for a supply inside the
    // supplier's own state.
    const half = invoice.gstPercent / 2;
    row(`CGST @ ${half}%`, inr(invoice.cgstInr));
    row(`SGST @ ${half}%`, inr(invoice.sgstInr));
  } else {
    row(`IGST @ ${invoice.gstPercent}%`, inr(invoice.igstInr));
  }

  y += 12;
  pdf.rule(labelX, y, RIGHT - labelX, { grey: 0.6 });
  row('TOTAL (INR)', inr(invoice.totalInr), true);

  y += 16;
  pdf.rule(LEFT, y, WIDTH, { grey: 0.8 });

  /* ── words, and how it was paid ──────────────────────────────────────── */
  y += 20;
  pdf.text(LEFT, y, 'Amount in words', { font: 'bold', size: 8, grey: 0.4 });
  y += 14;
  pdf.text(LEFT, y, amountInWords(invoice.totalInr), { size: 10 });

  y += 26;
  pdf.text(LEFT, y, 'Payment', { font: 'bold', size: 8, grey: 0.4 });
  y += 14;
  pdf.text(
    LEFT,
    y,
    `Received ${longDate(payment.paidAt ?? payment.createdAt)}` +
      `${payment.method ? ` by ${payment.method}` : ''} via Razorpay.`,
    { size: 9.5, grey: 0.25 }
  );
  if (payment.paymentId) {
    y += 13;
    pdf.text(LEFT, y, `Gateway reference ${payment.paymentId}`, {
      size: 9,
      grey: 0.45,
    });
  }

  /* ── foot ────────────────────────────────────────────────────────────── */
  const footY = pdf.height - 74;
  pdf.rule(LEFT, footY, WIDTH, { grey: 0.85 });
  pdf.paragraph(
    LEFT,
    footY + 16,
    'This is a computer-generated tax invoice and is valid without a signature. ' +
      'Tax is not payable under reverse charge. Please quote the invoice number on any correspondence.',
    { width: WIDTH, size: 8, grey: 0.45 }
  );
  pdf.text(LEFT, pdf.height - 26, `${site.legalName} · ${site.url}`, {
    size: 8,
    grey: 0.55,
  });

  return pdf.toBuffer();
}

/**
 * The invoice as an HTTP response. Shared by the client's download route and
 * the studio's, which differ only in how they prove the caller may have it.
 */
export function invoicePdfResponse(invoice: Invoice, payment: Payment): Response {
  const body = renderInvoicePdf({ invoice, payment });
  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(body.length),
      // `inline` so it opens in the browser's own viewer; the filename is
      // still what a save produces.
      'Content-Disposition': `inline; filename="${invoiceFilename(invoice)}"`,
      // A tax invoice must never sit in a shared cache.
      'Cache-Control': 'private, no-store',
    },
  });
}
