import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay, over plain `fetch` — no SDK.
 *
 * The whole surface this project needs is three REST calls and two HMAC
 * checks, and the official package pulls a dependency tree for that. Same
 * judgement as `lib/searchConsole.ts` signing its own service-account JWT.
 *
 * Dormant until `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set, exactly
 * like SMTP in `lib/email.ts`: with no keys the payment tab says plainly that
 * online payment is not switched on and the studio will invoice instead. It
 * never pretends a payment route exists.
 *
 * Nothing here trusts the browser. The checkout handler posts back an order
 * id, a payment id and a signature; `verifyCheckoutSignature` proves those
 * three were minted by Razorpay with our secret, and `fetchPayment` then asks
 * Razorpay directly what was actually captured and for how much. A page that
 * marks money received on the strength of a client-side callback alone is a
 * page anyone can mark paid.
 */

const API = 'https://api.razorpay.com/v1';

const KEY_ID = process.env.RAZORPAY_KEY_ID ?? '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';

export function isRazorpayConfigured(): boolean {
  return Boolean(KEY_ID && KEY_SECRET);
}

/**
 * True once the webhook can be trusted. Payments still work without it — the
 * browser callback is the primary path — but a client who closes the tab
 * mid-redirect is only reconciled by the webhook, so the dashboard says when
 * this is missing rather than leaving the gap invisible.
 */
export function isWebhookConfigured(): boolean {
  return Boolean(WEBHOOK_SECRET);
}

/** The publishable half of the pair. Safe to hand to the browser; the secret is not. */
export function razorpayKeyId(): string {
  return KEY_ID;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`;
}

/** Constant-time compare that tolerates length mismatch without throwing. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string | null;
};

/**
 * Creates the order the checkout is opened against. `amountPaise` is what
 * Razorpay will collect — the GST-inclusive figure, because that is what the
 * client owes.
 *
 * `receipt` is our own reference and is capped at 40 characters by Razorpay;
 * it is what ties their dashboard row back to a proposal and a milestone.
 */
export async function createOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (!isRazorpayConfigured()) throw new Error('Razorpay is not configured.');

  const response = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
      // The client should not be able to pay the same milestone twice by
      // reopening a stale checkout window.
      payment_capture: 1,
    }),
  });

  if (!response.ok) {
    // Razorpay's error bodies carry the merchant's own account details in some
    // cases, so the text goes to the server log and never to the client.
    const detail = await response.text().catch(() => '');
    console.error('[razorpay] order failed', response.status, detail.slice(0, 500));
    throw new Error('Razorpay would not open a payment for this. Try again shortly.');
  }

  return (await response.json()) as RazorpayOrder;
}

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  /** created | authorized | captured | refunded | failed */
  status: string;
  method: string | null;
  email: string | null;
  contact: string | null;
};

export async function fetchPayment(paymentId: string): Promise<RazorpayPayment | null> {
  if (!isRazorpayConfigured()) return null;

  const response = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
  });
  if (!response.ok) {
    console.error('[razorpay] payment lookup failed', paymentId, response.status);
    return null;
  }
  return (await response.json()) as RazorpayPayment;
}

/**
 * Proves the browser's success callback came from Razorpay: they sign
 * `order_id|payment_id` with the key secret, which only the two of us hold.
 */
export function verifyCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!KEY_SECRET) return false;
  return safeEqual(
    sign(`${input.orderId}|${input.paymentId}`, KEY_SECRET),
    input.signature
  );
}

/**
 * The webhook is signed over the raw request body with a *different* secret,
 * set when the endpoint is registered in the Razorpay dashboard. The body must
 * be the exact bytes received — re-serialising parsed JSON changes the digest.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  return safeEqual(sign(rawBody, WEBHOOK_SECRET), signature);
}
