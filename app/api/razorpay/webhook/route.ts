import { NextResponse } from 'next/server';
import { markPaymentFailed } from '@/lib/payments';
import { settlePayment } from '@/lib/paymentFlow';
import { isWebhookConfigured, verifyWebhookSignature } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

/**
 * Razorpay's webhook — the backstop for the client who pays and then closes
 * the tab before the browser callback runs. Without it that payment sits as a
 * 'created' row while the money is in the studio's account.
 *
 * Plays dead when `RAZORPAY_WEBHOOK_SECRET` is unset, the same guard the cron
 * routes use: an endpoint that cannot verify who is calling it must not act on
 * what it is told. 404, not 500 — an unconfigured endpoint should look like an
 * endpoint that does not exist.
 *
 * The signature is computed over the *raw* body, so the text is read once and
 * parsed afterwards. Re-serialising the parsed object changes the digest and
 * every event would fail verification.
 *
 * Always returns 200 once the signature checks out, including for events we do
 * nothing with. Razorpay retries a non-2xx for days, and a retry storm over an
 * event we were never going to act on helps nobody. Real failures go to the
 * log, where the studio can see them.
 */
export async function POST(request: Request) {
  if (!isWebhookConfigured()) {
    return new NextResponse('Not found', { status: 404 });
  }

  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const raw = await request.text();

  if (!verifyWebhookSignature(raw, signature)) {
    console.error('[razorpay] webhook signature rejected');
    return new NextResponse('Unauthorised', { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          error_description?: string;
        };
      };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    console.error('[razorpay] webhook body was not JSON');
    return NextResponse.json({ ok: true });
  }

  const entity = event.payload?.payment?.entity;
  const orderId = entity?.order_id;
  const paymentId = entity?.id;

  if (!orderId || !paymentId) return NextResponse.json({ ok: true });

  if (event.event === 'payment.captured') {
    // Idempotent by construction — see `settlePayment`. If the browser
    // callback already settled this, nothing happens here.
    const result = await settlePayment({ orderId, paymentId });
    if (!result.ok) {
      console.error('[razorpay] webhook could not settle', orderId, result.error);
    }
    return NextResponse.json({ ok: true });
  }

  if (event.event === 'payment.failed') {
    await markPaymentFailed(
      orderId,
      entity?.error_description ?? 'Declined at the gateway.'
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
