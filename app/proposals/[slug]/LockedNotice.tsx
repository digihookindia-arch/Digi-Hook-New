import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';

/**
 * Shown when a gated stage is reached by URL before the proposal is accepted.
 * The stages are greyed out in the contents column, but a typed or bookmarked
 * URL still executes this page — so the page itself says no, not just the
 * chrome.
 */
export function LockedNotice({ slug }: { slug: string }) {
  return (
    <div className="rounded-panel bg-panel p-[clamp(24px,4vw,44px)] shadow-panel">
      <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface text-neutral-700">
        <Lock size={18} aria-hidden="true" />
      </span>
      <h2 className="m-0 max-w-[20ch] font-heading text-[clamp(22px,2.8vw,32px)] font-extrabold leading-[1.08] tracking-[-0.035em]">
        This opens once the proposal is accepted.
      </h2>
      <p className="m-0 mt-4 max-w-[56ch] text-[15.5px] leading-[1.7] text-neutral-800">
        Once you accept, the other two stages open: where the work has got to,
        and the payment schedule with your invoices and receipts — live, for the
        whole project. We will call you within 24 hours of accepting.
      </p>
      <Link
        href={`/proposals/${slug}`}
        className="mt-7 inline-flex min-h-[48px] items-center gap-2.5 rounded-panel-sm bg-text px-5 text-[14.5px] font-semibold leading-none text-bg transition-opacity hover:opacity-90"
      >
        Back to the proposal
        <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
      </Link>
    </div>
  );
}
