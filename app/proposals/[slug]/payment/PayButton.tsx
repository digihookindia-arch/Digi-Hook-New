'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock } from 'lucide-react';
import { confirmPayment, startPayment } from './actions';

/**
 * A pay button, and the whole of the browser's part in taking a payment.
 *
 * The browser never sees a price it can change. It asks the server to open a
 * payment for milestone *positions*; the server derives the amount from the
 * stored proposal, creates the Razorpay order and hands back an order id. What
 * comes out of the checkout goes straight back to the server to be verified
 * against Razorpay before anything is called paid — so the worst a tampered
 * client can do here is fail.
 *
 * `milestoneIndexes` is a list because the page offers one button for
 * everything that has fallen due. That is the same button component, given
 * more than one position.
 *
 * The checkout script is fetched on first click rather than on page load. It
 * is a third-party script on a page that opens with a formal document, and
 * most people reading a proposal are not paying an invoice that minute.
 */

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

type Checkout = {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => Checkout;
  }
}

/** Injects the checkout script once, and resolves when it is usable. */
function loadCheckout(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SRC}"]`
    );
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Could not load the payment window.')),
      { once: true }
    );
    if (!existing) {
      script.src = CHECKOUT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

export function PayButton({
  slug,
  milestoneIndexes,
  amountText,
  label,
  tone = 'primary',
  onDark = false,
  disabled = false,
  disabledReason,
}: {
  slug: string;
  milestoneIndexes: number[];
  /** The payable figure, GST included — the same string the row shows. */
  amountText: string;
  label: string;
  /** `primary` is the accent fill; `quiet` is the outlined per-row button. */
  tone?: 'primary' | 'quiet';
  /**
   * Sitting on the accent band rather than the page ground, which inverts the
   * disabled treatment — grey-on-grey vanishes there.
   */
  onDark?: boolean;
  /**
   * Rendered but not clickable. Used for rows that have fallen due: they are
   * settled together through the total-due button, not one at a time, so the
   * per-row button says so rather than disappearing.
   */
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setBusy(true);

    try {
      await loadCheckout();
      const started = await startPayment({ slug, milestoneIndexes });
      if (!started.ok) {
        setError(started.error);
        setBusy(false);
        return;
      }

      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error('Could not load the payment window.');

      const checkout = new Razorpay({
        key: started.keyId,
        order_id: started.orderId,
        amount: started.amountPaise,
        currency: 'INR',
        name: 'Digi Hook',
        description: started.description,
        prefill: started.prefill,
        notes: { receipt: started.receipt },
        // The one hard-coded colour in this codebase besides `lib/og.tsx`,
        // and for the same reason: the checkout renders in Razorpay's own
        // iframe, which cannot read our CSS custom properties. It is
        // `--color-accent-600` from `globals.css` — keep the two in sync, or
        // the payment window arrives looking like a different company's page.
        theme: { color: '#dd2b0f' },
        handler: async (response: unknown) => {
          const result = response as {
            razorpay_order_id?: string;
            razorpay_payment_id?: string;
            razorpay_signature?: string;
          };
          const confirmed = await confirmPayment({
            slug,
            orderId: result.razorpay_order_id ?? '',
            paymentId: result.razorpay_payment_id ?? '',
            signature: result.razorpay_signature ?? '',
          });
          setBusy(false);
          if (!confirmed.ok) {
            // The money may well have left their account — Razorpay's webhook
            // reconciles it either way. Never imply it did not.
            setError(
              `${confirmed.error} If your account has been debited, it is safe — the invoice will follow.`
            );
            return;
          }
          router.refresh();
        },
        modal: {
          // Closing the window is not a failure. The 'created' row stays for
          // the studio to see, and the client can simply try again.
          ondismiss: () => setBusy(false),
        },
      });

      checkout.on('payment.failed', (response: unknown) => {
        const failed = response as { error?: { description?: string } };
        setBusy(false);
        setError(
          failed.error?.description ??
            'The payment did not go through. Nothing has been charged.'
        );
      });

      checkout.open();
    } catch (e) {
      setBusy(false);
      setError(
        e instanceof Error ? e.message : 'Could not open the payment window.'
      );
    }
  }

  const styles =
    tone === 'primary'
      ? onDark
        ? 'min-h-[54px] bg-text px-7 text-[15.5px] text-bg shadow-lift hover:opacity-90'
        : 'min-h-[54px] bg-accent-600 px-7 text-[15.5px] text-white shadow-lift hover:bg-accent-500'
      : 'min-h-[46px] border-2 border-text px-5 text-[14px] text-text hover:bg-text hover:text-bg';

  // On the accent band the page's grey disabled state disappears, so it
  // inverts to a translucent white instead.
  const disabledStyles = onDark
    ? 'disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white disabled:shadow-none disabled:hover:opacity-100'
    : 'disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-surface disabled:text-neutral-600 disabled:shadow-none disabled:hover:bg-surface disabled:hover:text-neutral-600';

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={pay}
        disabled={busy || disabled}
        title={disabled ? disabledReason : undefined}
        className={`inline-flex items-center gap-2.5 rounded-panel-sm font-semibold leading-none transition-colors ${styles} ${disabledStyles}`}
      >
        <Lock size={14} strokeWidth={2.5} aria-hidden="true" />
        {/* The verb first, then the figure. "₹17,700" alone reads as a
            price tag, not as something to press — a client should not have to
            infer that the amount is a button. */}
        {busy ? 'One moment…' : `Pay now — ${amountText}`}
        <span className="sr-only"> for {label}</span>
        {!disabled && tone === 'primary' ? (
          <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
        ) : null}
      </button>

      {disabled && disabledReason ? (
        <p
          className={`m-0 mt-2 max-w-[42ch] text-[12.5px] leading-[1.5] ${
            onDark ? 'text-white/85' : 'text-neutral-700'
          }`}
        >
          {disabledReason}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="m-0 mt-2.5 max-w-[46ch] text-[13px] font-medium leading-[1.5] text-accent-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
