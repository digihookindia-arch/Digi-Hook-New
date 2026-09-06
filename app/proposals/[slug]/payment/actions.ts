'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { accessCookie, verifyAccessToken } from '@/lib/auth';
import { milestoneSchedule, type ScheduleRow } from '@/lib/delivery';
import { toPaise } from '@/lib/money';
import { settlePayment } from '@/lib/paymentFlow';
import {
  createPayment,
  getPaymentByOrder,
  listPayments,
  paidMilestones,
  paymentReference,
} from '@/lib/payments';
import { getProposal, type Proposal } from '@/lib/proposals';
import { proposalRef } from '@/lib/proposalDoc';
import {
  createOrder,
  isRazorpayConfigured,
  razorpayKeyId,
  verifyCheckoutSignature,
} from '@/lib/razorpay';
import { site } from '@/lib/site';

/**
 * Taking money for one or more milestones.
 *
 * Every check that matters is here, server-side, and every one is re-derived
 * rather than trusted from the form: which proposal, whether the visitor holds
 * the access code, whether it has been accepted, which milestones are already
 * settled, and — the one that actually protects the client — how much it
 * costs. The amount is computed from the stored proposal; the browser only
 * ever names *positions*. A page that lets the browser name its own price is a
 * page you can buy a website on for one rupee.
 *
 * A payment can cover several milestones because the payment page offers one
 * button for everything that has fallen due. Overdue rows are settled together
 * or not at all — which is also why their individual buttons are disabled.
 */

/** The access-code check the whole proposal surface shares. */
async function unlocked(slug: string): Promise<Proposal | null> {
  const proposal = await getProposal(slug);
  if (!proposal) return null;

  const store = await cookies();
  const ok = verifyAccessToken(
    store.get(accessCookie(slug))?.value,
    slug,
    proposal.accessCode
  );
  return ok ? proposal : null;
}

export type StartPaymentResult =
  | {
      ok: true;
      keyId: string;
      orderId: string;
      amountPaise: number;
      receipt: string;
      description: string;
      prefill: { name: string; email: string; contact: string };
    }
  | { ok: false; error: string };

export async function startPayment(input: {
  slug: string;
  /** Milestone positions to settle. One row, or everything currently due. */
  milestoneIndexes: number[];
}): Promise<StartPaymentResult> {
  const { slug } = input;

  if (!isRazorpayConfigured()) {
    return {
      ok: false,
      error: 'Online payment is not switched on yet. We will invoice you instead.',
    };
  }

  const proposal = await unlocked(slug);
  if (!proposal) {
    return { ok: false, error: 'Enter your access code again before paying.' };
  }
  if (!proposal.acceptedAt) {
    return { ok: false, error: 'Accept the proposal before making a payment.' };
  }

  const settled = paidMilestones(await listPayments(slug));
  const schedule = milestoneSchedule(
    proposal.content.total,
    proposal.milestones,
    proposal.gstPercent,
    settled
  );

  // De-duplicated and ordered, so a crafted payload cannot charge one
  // milestone twice inside a single order.
  const wanted = [...new Set(input.milestoneIndexes)].sort((a, b) => a - b);
  if (wanted.length === 0) {
    return { ok: false, error: 'Nothing was selected to pay.' };
  }

  const rows: ScheduleRow[] = [];
  for (const index of wanted) {
    const row = schedule[index];
    if (!row) return { ok: false, error: 'That payment is not on your schedule.' };
    // Two independent records of "already paid": the milestone the studio may
    // have marked by hand after a bank transfer, and a settled row in the
    // ledger. `dueState` folds in both.
    if (row.dueState === 'paid') {
      return { ok: false, error: 'That payment is already marked as received.' };
    }
    if (row.payable === null || row.subtotal === null || row.gst === null) {
      return {
        ok: false,
        error:
          'We cannot take this one online yet — call us and we will confirm the figure.',
      };
    }
    rows.push(row);
  }

  const subtotal = rows.reduce((sum, row) => sum + (row.subtotal ?? 0), 0);
  const gst = rows.reduce((sum, row) => sum + (row.gst ?? 0), 0);
  const payable = rows.reduce((sum, row) => sum + (row.payable ?? 0), 0);
  const label =
    rows.length === 1
      ? (rows[0]?.milestone.label ?? '')
      : `${rows.length} payments: ${rows.map((row) => row.milestone.label).join(', ')}`;

  const receipt = paymentReference(slug, wanted[0] as number);

  let order;
  try {
    order = await createOrder({
      amountPaise: toPaise(payable),
      receipt,
      // Notes land in the studio's Razorpay dashboard, so a row there resolves
      // to a client and a milestone without opening this system.
      notes: {
        proposal: proposalRef(slug),
        client: proposal.client.slice(0, 100),
        milestone: label.slice(0, 100),
      },
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not open the payment.',
    };
  }

  // Written before the client reaches the checkout, so an abandoned attempt
  // leaves a row to reconcile rather than a silent gap.
  await createPayment({
    proposalSlug: slug,
    milestoneIndexes: wanted,
    milestoneLabel: label.slice(0, 400),
    subtotalInr: subtotal,
    gstPercent: proposal.gstPercent,
    gstInr: gst,
    amountInr: payable,
    orderId: order.id,
    receipt,
  });

  return {
    ok: true,
    keyId: razorpayKeyId(),
    orderId: order.id,
    amountPaise: order.amount,
    receipt,
    description: `${label} — ${site.name} (ref ${proposalRef(slug)})`.slice(0, 255),
    prefill: {
      name: proposal.client,
      email: proposal.clientEmail,
      contact: proposal.clientPhone,
    },
  };
}

export type ConfirmPaymentResult = { ok: true } | { ok: false; error: string };

/**
 * Called from the checkout's success handler. The signature proves Razorpay
 * minted these three values with our secret; `settlePayment` then confirms the
 * capture with Razorpay directly before anything is called paid.
 */
export async function confirmPayment(input: {
  slug: string;
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<ConfirmPaymentResult> {
  const proposal = await unlocked(input.slug);
  if (!proposal) return { ok: false, error: 'Enter your access code again.' };

  if (
    !verifyCheckoutSignature({
      orderId: input.orderId,
      paymentId: input.paymentId,
      signature: input.signature,
    })
  ) {
    console.error('[payments] bad checkout signature', input.orderId);
    return {
      ok: false,
      error:
        'We could not verify that payment. Nothing has been charged twice — call us.',
    };
  }

  // The order must belong to this proposal, or a client with one valid access
  // code could settle another client's invoice.
  const record = await getPaymentByOrder(input.orderId);
  if (!record || record.proposalSlug !== input.slug) {
    return { ok: false, error: 'That payment does not belong to this proposal.' };
  }

  const result = await settlePayment({
    orderId: input.orderId,
    paymentId: input.paymentId,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/proposals/${input.slug}/payment`);
  revalidatePath(`/proposals/${input.slug}/status`);
  return { ok: true };
}
