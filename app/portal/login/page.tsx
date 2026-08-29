import type { Metadata } from 'next';
import { isGoogleConfigured } from '@/lib/googleAuth';
import { LoginForm, LoginFooter } from './LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * The messages the Google callback can land back here with. Kept deliberately
 * vague about account existence — 'unknown' only fires after the visitor
 * proved they own that Google email, so naming it teaches them nothing new.
 */
const GOOGLE_NOTICES: Record<string, string> = {
  unknown:
    "That Google account's email does not have a portal account yet. Portal accounts are set up by us — call or write and we will invite you.",
  failed:
    'Google sign-in did not complete. Try again, or sign in with your email and password.',
};

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { google } = await searchParams;
  const notice = google ? GOOGLE_NOTICES[google] : undefined;

  return (
    <div className="mx-auto max-w-[420px]">
      <h1 className="m-0 mb-3 font-heading text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
        Sign in.
      </h1>
      <p className="m-0 mb-6 text-[15px] leading-[1.6] text-neutral-800">
        Your project, support plan and tickets, in one place.
      </p>

      {notice ? (
        <p
          role="alert"
          className="m-0 mb-6 border-l-2 border-accent py-1 pl-4 text-[14px] leading-[1.55] text-accent-700"
        >
          {notice}
        </p>
      ) : null}

      <LoginForm />

      {isGoogleConfigured() ? (
        <div className="mt-5 border-2 border-neutral-300 p-5">
          {/* A plain <a> on purpose: /portal/google is a route handler that
              302s to Google, so this must be a full page load — a <Link>
              would prefetch and client-navigate into a redirect. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/portal/google"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-3 border-2 border-text px-5 text-[14.5px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
          >
            {/* Google's "G", drawn inline — no external asset, no request. */}
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            Continue with Google
          </a>
          <p className="m-0 mt-3 text-[12.5px] leading-[1.55] text-neutral-700">
            Works when your portal account was set up with your Google email.
          </p>
        </div>
      ) : null}

      <LoginFooter />
    </div>
  );
}
