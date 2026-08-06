import Link from 'next/link';
import { Lock } from 'lucide-react';

/**
 * Shown when a gated tab is reached by URL before the proposal is accepted.
 * The tabs are greyed out in the nav, but a typed or bookmarked URL still
 * executes this page — so the page itself says no, not just the chrome.
 */
export function LockedNotice({ slug }: { slug: string }) {
  return (
    <div className="border-2 border-neutral-300 p-7">
      <div className="mb-3 flex items-center gap-2.5">
        <Lock size={16} aria-hidden="true" className="text-neutral-700" />
        <h2 className="m-0 font-heading text-[clamp(19px,2vw,24px)] font-bold leading-[1.15] tracking-[-0.025em]">
          This opens once the proposal is accepted.
        </h2>
      </div>
      <p className="m-0 mb-5 max-w-[56ch] text-[15px] leading-[1.6] text-neutral-800">
        Once you accept, this tab shows what we need from you and how the work
        and payments are going — live, for the whole project.
      </p>
      <Link
        href={`/proposals/${slug}`}
        className="inline-flex min-h-[44px] items-center border-2 border-text px-5 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
      >
        Back to the proposal
      </Link>
    </div>
  );
}
