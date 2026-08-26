import type { Metadata } from 'next';
import Link from 'next/link';
import { SetPasswordForm } from './SetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Set your password',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * The landing page for the invite / forgot-password link. The token in the
 * query string is only *checked* when the form posts — the action verifies it
 * against the account's current hash, which is what makes a used link dead.
 */
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto max-w-[420px]">
        <h1 className="m-0 mb-3 font-heading text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
          That link is incomplete.
        </h1>
        <p className="m-0 mb-6 text-[15px] leading-[1.6] text-neutral-800">
          Open the link from your email again, or request a fresh one.
        </p>
        <Link
          href="/portal/forgot"
          className="inline-flex min-h-[44px] items-center border-2 border-text px-5 text-[14px] font-semibold leading-none transition-colors hover:bg-text hover:text-bg"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return <SetPasswordForm token={token} />;
}
