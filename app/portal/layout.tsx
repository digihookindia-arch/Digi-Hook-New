import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { CLIENT_COOKIE, verifyClientSessionToken } from '@/lib/auth';
import { clientSignOut } from './actions';

export const dynamic = 'force-dynamic';

/**
 * Client-portal chrome: the kicker line and a sign-out button. Deliberately
 * minimal — each page carries its own heading, and the per-page
 * `requireClient()` is the gate; this layout is presentation only.
 *
 * Blocked from search and absent from the sitemap, like the dashboard and
 * proposals. Each page re-states the robots metadata rather than relying on
 * inheritance, because a page exporting its own metadata replaces what it
 * inherits wholesale.
 */
export const metadata: Metadata = {
  title: 'Client portal',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const signedIn = Boolean(
    verifyClientSessionToken(store.get(CLIENT_COOKIE)?.value)
  );

  return (
    <main>
      <div className="mx-auto max-w-[860px] px-gutter py-[clamp(40px,7vh,88px)]">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-700">
            Digi Hook · Client portal
          </div>
          {signedIn ? (
            <form action={clientSignOut}>
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center border-2 border-neutral-400 px-4 text-[13px] font-semibold leading-none text-neutral-700 transition-colors hover:border-text hover:text-text"
              >
                Sign out
              </button>
            </form>
          ) : null}
        </div>
        {children}
      </div>
    </main>
  );
}
