import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import {
  cleanGstin,
  cleanStateCode,
  financialYear,
  invoiceBlocks,
  invoiceNumber,
  taxSplit,
  type InvoiceBlock,
} from './gst';
import type { Payment } from './payments';
import type { Proposal } from './proposals';
import { site } from './site';

/**
 * GST tax invoices — numbering, storage, and the one function that decides
 * whether one can honestly be issued.
 *
 * Everything an invoice states is frozen at issue time. A tax invoice is a
 * legal record of what was stated on a date, so re-deriving the client's
 * address or the tax split from today's proposal row would quietly rewrite
 * history the first time somebody corrects a typo.
 *
 * Nothing here guesses. If the studio's GSTIN is unset, or the client's state
 * is unknown, `issueInvoice` refuses and names the missing field — because an
 * invoice with the wrong place of supply is worse than no invoice at all: the
 * client's accountant will file it.
 */

export type Invoice = {
  id: string;
  number: string;
  financialYear: string;
  sequence: number;
  paymentId: string;
  proposalSlug: string;
  issuedAt: string;
  supplierGstin: string;
  supplierState: string;
  clientName: string;
  clientAddress: string;
  clientGstin: string | null;
  placeOfSupply: string;
  description: string;
  sacCode: string;
  taxableInr: number;
  gstPercent: number;
  cgstInr: number;
  sgstInr: number;
  igstInr: number;
  totalInr: number;
  emailedAt: string | null;
};

type Row = {
  id: string;
  number: string;
  financial_year: string;
  sequence: number;
  payment_id: string;
  proposal_slug: string;
  issued_at: string;
  supplier_gstin: string;
  supplier_state: string;
  client_name: string;
  client_address: string;
  client_gstin: string | null;
  place_of_supply: string;
  description: string;
  sac_code: string;
  taxable_inr: number;
  gst_percent: number;
  cgst_inr: number;
  sgst_inr: number;
  igst_inr: number;
  total_inr: number;
  emailed_at: string | null;
};

function toInvoice(row: Row): Invoice {
  return {
    id: row.id,
    number: row.number,
    financialYear: row.financial_year,
    sequence: row.sequence,
    paymentId: row.payment_id,
    proposalSlug: row.proposal_slug,
    issuedAt: row.issued_at,
    supplierGstin: row.supplier_gstin,
    supplierState: row.supplier_state,
    clientName: row.client_name,
    clientAddress: row.client_address,
    clientGstin: row.client_gstin || null,
    placeOfSupply: row.place_of_supply,
    description: row.description,
    sacCode: row.sac_code,
    taxableInr: row.taxable_inr,
    gstPercent: row.gst_percent,
    cgstInr: row.cgst_inr,
    sgstInr: row.sgst_inr,
    igstInr: row.igst_inr,
    totalInr: row.total_inr,
    emailedAt: row.emailed_at,
  };
}

/**
 * Why this payment cannot be invoiced yet, or an empty list if it can.
 *
 * Exported so the dashboard can show the studio the missing field *before* a
 * client pays, rather than after — which is the difference between a
 * five-second fix and an apologetic email.
 */
export function invoiceBlocksFor(proposal: Proposal): InvoiceBlock[] {
  return invoiceBlocks({
    supplierGstin: site.gstin,
    placeOfSupplyCode: proposal.clientState,
    clientAddress: proposal.clientAddress,
  });
}

export async function getInvoiceForPayment(
  paymentId: string
): Promise<Invoice | null> {
  const row = getDb()
    .prepare('SELECT * FROM invoices WHERE payment_id = ?')
    .get(paymentId) as Row | undefined;
  return row ? toInvoice(row) : null;
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const row = getDb()
    .prepare('SELECT * FROM invoices WHERE id = ?')
    .get(id) as Row | undefined;
  return row ? toInvoice(row) : null;
}

export async function listInvoices(proposalSlug: string): Promise<Invoice[]> {
  const rows = getDb()
    .prepare('SELECT * FROM invoices WHERE proposal_slug = ? ORDER BY issued_at DESC')
    .all(proposalSlug) as Row[];
  return rows.map(toInvoice);
}

export async function markInvoiceEmailed(id: string): Promise<void> {
  getDb()
    .prepare('UPDATE invoices SET emailed_at = ? WHERE id = ?')
    .run(new Date().toISOString(), id);
}

export type IssueResult =
  | { ok: true; invoice: Invoice; alreadyIssued: boolean }
  | { ok: false; blocks: InvoiceBlock[] };

/**
 * Issues the tax invoice for a settled payment.
 *
 * The number is allocated and the row written inside one transaction, and the
 * sequence is read as `MAX(sequence) + 1` for the financial year *within* that
 * transaction — Rule 46 wants a consecutive series, and two payments clearing
 * in the same second must not both be told they are number 7. SQLite's write
 * lock makes that safe here; the UNIQUE index on `number` is the backstop that
 * turns any remaining race into a failed insert rather than a duplicate.
 *
 * Idempotent: a payment already invoiced returns its existing invoice. The
 * browser callback and the webhook both reach this, and a client must never
 * receive two invoices with different numbers for one payment.
 */
export async function issueInvoice(
  proposal: Proposal,
  payment: Payment
): Promise<IssueResult> {
  const existing = await getInvoiceForPayment(payment.id);
  if (existing) return { ok: true, invoice: existing, alreadyIssued: true };

  const blocks = invoiceBlocksFor(proposal);
  if (blocks.length > 0) return { ok: false, blocks };

  // Checked by `invoiceBlocks` above; re-read here so the types are honest
  // rather than asserted.
  const supplierGstin = cleanGstin(site.gstin);
  const placeOfSupply = cleanStateCode(proposal.clientState);
  if (!supplierGstin || !placeOfSupply) return { ok: false, blocks };

  const issuedAt = new Date();
  const fy = financialYear(issuedAt);
  const split = taxSplit({
    taxableValue: payment.subtotalInr,
    gstPercent: payment.gstPercent,
    supplierStateCode: site.gstStateCode,
    placeOfSupplyCode: placeOfSupply,
  });

  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const last = db
      .prepare('SELECT MAX(sequence) AS top FROM invoices WHERE financial_year = ?')
      .get(fy) as { top: number | null } | undefined;
    // Opens the year at `invoiceSequenceStart` and counts up from there.
    // Never below what has already been issued: a repeated number is the one
    // failure the consecutive-series rule exists to prevent, so the stored
    // maximum always wins over a start that was later set too low.
    const floor = Math.max(last?.top ?? 0, site.invoiceSequenceStart - 1);
    const sequence = floor + 1;

    const invoice: Invoice = {
      id: randomUUID(),
      number: invoiceNumber(fy, sequence),
      financialYear: fy,
      sequence,
      paymentId: payment.id,
      proposalSlug: proposal.slug,
      issuedAt: issuedAt.toISOString(),
      supplierGstin,
      supplierState: site.gstStateCode,
      // The entity the invoice is raised against. Falls back to the contact
      // name for proposals filled in before the client could supply one.
      clientName: proposal.clientLegalName.trim() || proposal.client,
      clientAddress: proposal.clientAddress.trim(),
      clientGstin: cleanGstin(proposal.clientGstin),
      placeOfSupply,
      // What the client is actually being billed for, in words they will
      // recognise from the proposal they signed.
      description: `${payment.milestoneLabel} — ${proposal.content.title}`,
      sacCode: site.sacCode,
      taxableInr: payment.subtotalInr,
      gstPercent: payment.gstPercent,
      cgstInr: split.cgst,
      sgstInr: split.sgst,
      igstInr: split.igst,
      totalInr: payment.amountInr,
      emailedAt: null,
    };

    db.prepare(
      `INSERT INTO invoices
         (id, number, financial_year, sequence, payment_id, proposal_slug,
          issued_at, supplier_gstin, supplier_state, client_name,
          client_address, client_gstin, place_of_supply, description, sac_code,
          taxable_inr, gst_percent, cgst_inr, sgst_inr, igst_inr, total_inr)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      invoice.id,
      invoice.number,
      invoice.financialYear,
      invoice.sequence,
      invoice.paymentId,
      invoice.proposalSlug,
      invoice.issuedAt,
      invoice.supplierGstin,
      invoice.supplierState,
      invoice.clientName,
      invoice.clientAddress,
      invoice.clientGstin,
      invoice.placeOfSupply,
      invoice.description,
      invoice.sacCode,
      invoice.taxableInr,
      invoice.gstPercent,
      invoice.cgstInr,
      invoice.sgstInr,
      invoice.igstInr,
      invoice.totalInr
    );

    db.exec('COMMIT');
    return { ok: true, invoice, alreadyIssued: false };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** The filename a client sees on the attachment and on the download. */
export function invoiceFilename(invoice: Invoice): string {
  return `Tax-invoice-${invoice.number.replace(/\//g, '-')}.pdf`;
}
