import { randomUUID } from 'node:crypto';
import { getDb } from './db';

/**
 * The payment ledger behind a proposal's Payment tab.
 *
 * Rows are written *before* the client reaches the checkout and are only ever
 * moved forward — created → paid, or created → failed. Nothing is deleted and
 * nothing is rewritten, because this is the record the studio reconciles a
 * bank statement against.
 *
 * Amounts are whole rupees, stored as the three figures a receipt has to be
 * able to state independently: what the proposal quoted, the tax added, and
 * what was charged. Deriving any of the three from the others later — after a
 * GST rate change, say — would restate history.
 */

export const PAYMENT_STATUSES = ['created', 'paid', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type Payment = {
  id: string;
  proposalSlug: string;
  /**
   * The first milestone this payment settles. Kept alongside the full set
   * below because most payments settle exactly one, and every index-based
   * lookup predates the "pay everything due" button.
   */
  milestoneIndex: number;
  /** Every milestone position this payment settles. Never empty. */
  milestoneIndexes: number[];
  milestoneLabel: string;
  subtotalInr: number;
  gstPercent: number;
  gstInr: number;
  amountInr: number;
  orderId: string;
  paymentId: string | null;
  method: string | null;
  status: PaymentStatus;
  failureReason: string;
  receipt: string;
  createdAt: string;
  paidAt: string | null;
};

type Row = {
  id: string;
  proposal_slug: string;
  milestone_index: number;
  milestone_indexes: string | null;
  milestone_label: string;
  subtotal_inr: number;
  gst_percent: number;
  gst_inr: number;
  amount_inr: number;
  order_id: string;
  payment_id: string | null;
  method: string | null;
  status: string;
  failure_reason: string | null;
  receipt: string;
  created_at: string;
  paid_at: string | null;
};

/**
 * The milestone positions a stored payment settles. Falls back to the single
 * index for rows written before the column existed, and to that same index if
 * the JSON is ever unreadable - a payment always settles at least one thing,
 * and an empty set would silently un-pay a milestone.
 */
function parseIndexes(json: string | null, fallback: number): number[] {
  if (!json) return [fallback];
  try {
    const parsed = JSON.parse(json);
    const indexes = Array.isArray(parsed)
      ? parsed.filter((n): n is number => Number.isInteger(n) && n >= 0)
      : [];
    return indexes.length > 0 ? indexes : [fallback];
  } catch {
    return [fallback];
  }
}

function toPayment(row: Row): Payment {
  return {
    id: row.id,
    proposalSlug: row.proposal_slug,
    milestoneIndex: row.milestone_index,
    // Rows written before the column existed carry only the single index.
    milestoneIndexes: parseIndexes(row.milestone_indexes, row.milestone_index),
    milestoneLabel: row.milestone_label,
    subtotalInr: row.subtotal_inr,
    gstPercent: row.gst_percent,
    gstInr: row.gst_inr,
    amountInr: row.amount_inr,
    orderId: row.order_id,
    paymentId: row.payment_id,
    method: row.method,
    status: (PAYMENT_STATUSES as readonly string[]).includes(row.status)
      ? (row.status as PaymentStatus)
      : 'created',
    failureReason: row.failure_reason ?? '',
    receipt: row.receipt,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

/**
 * The reference printed on the client's receipt and set as the Razorpay
 * receipt field, so a row in their dashboard resolves to a proposal and a
 * milestone without opening ours. Razorpay caps this at 40 characters.
 */
export function paymentReference(slug: string, milestoneIndex: number): string {
  return `DH-${slug.slice(0, 8).toUpperCase()}-M${milestoneIndex + 1}-${Date.now()
    .toString(36)
    .toUpperCase()}`;
}

export async function createPayment(input: {
  proposalSlug: string;
  milestoneIndexes: number[];
  milestoneLabel: string;
  subtotalInr: number;
  gstPercent: number;
  gstInr: number;
  amountInr: number;
  orderId: string;
  receipt: string;
}): Promise<Payment> {
  const first = input.milestoneIndexes[0];
  if (first === undefined) throw new Error('A payment must settle a milestone.');

  const payment: Payment = {
    id: randomUUID(),
    ...input,
    milestoneIndex: first,
    paymentId: null,
    method: null,
    status: 'created',
    failureReason: '',
    createdAt: new Date().toISOString(),
    paidAt: null,
  };

  getDb()
    .prepare(
      `INSERT INTO payments
         (id, proposal_slug, milestone_index, milestone_indexes, milestone_label,
          subtotal_inr, gst_percent, gst_inr, amount_inr, order_id, status,
          receipt, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?)`
    )
    .run(
      payment.id,
      payment.proposalSlug,
      payment.milestoneIndex,
      JSON.stringify(payment.milestoneIndexes),
      payment.milestoneLabel,
      payment.subtotalInr,
      payment.gstPercent,
      payment.gstInr,
      payment.amountInr,
      payment.orderId,
      payment.receipt,
      payment.createdAt
    );

  return payment;
}

export async function getPaymentByOrder(orderId: string): Promise<Payment | null> {
  const row = getDb()
    .prepare('SELECT * FROM payments WHERE order_id = ?')
    .get(orderId) as Row | undefined;
  return row ? toPayment(row) : null;
}

export async function listPayments(proposalSlug: string): Promise<Payment[]> {
  const rows = getDb()
    .prepare(
      'SELECT * FROM payments WHERE proposal_slug = ? ORDER BY created_at DESC'
    )
    .all(proposalSlug) as Row[];
  return rows.map(toPayment);
}

/**
 * Settles an attempt as paid. Guarded on the row still being 'created', so the
 * browser callback and the webhook — which routinely both arrive — cannot
 * double-record the same capture or email the client twice. Returns true only
 * for the write that actually moved it.
 */
export async function markPaymentPaid(
  orderId: string,
  input: { paymentId: string; method: string | null }
): Promise<boolean> {
  const result = getDb()
    .prepare(
      `UPDATE payments
          SET status = 'paid', payment_id = ?, method = ?, paid_at = ?
        WHERE order_id = ? AND status = 'created'`
    )
    .run(input.paymentId, input.method, new Date().toISOString(), orderId);
  return Number(result.changes) > 0;
}

export async function markPaymentFailed(
  orderId: string,
  reason: string
): Promise<void> {
  getDb()
    .prepare(
      `UPDATE payments
          SET status = 'failed', failure_reason = ?
        WHERE order_id = ? AND status = 'created'`
    )
    .run(reason.slice(0, 300), orderId);
}

/* ── what the client-facing page asks ───────────────────────────────────── */

/** Milestone positions with a settled payment against them. */
export function paidMilestones(payments: Payment[]): Set<number> {
  return new Set(
    payments
      .filter((p) => p.status === 'paid')
      .flatMap((p) => p.milestoneIndexes)
  );
}

/** Total collected online, GST included — what actually left the client's account. */
export function collectedInr(payments: Payment[]): number {
  return payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountInr, 0);
}
