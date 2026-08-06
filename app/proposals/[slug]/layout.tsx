import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { proposalAccess } from '@/lib/proposalAccess';
import { site } from '@/lib/site';
import { UnlockForm } from './UnlockForm';
import { ProposalTabs } from './ProposalTabs';

export const dynamic = 'force-dynamic';

/**
 * Client-facing proposal chrome, shared by all three tabs: the access-code
 * gate, the title block and the "call us" footer.
 *
 * Blocked from search engines and kept out of the sitemap — the rest of the
 * site is built to be indexed aggressively, and a client's pricing must never
 * end up in those results. Each page below re-states this rather than relying
 * on inheritance, because a page that exports its own metadata replaces what it
 * inherits wholesale.
 */
export const metadata: Metadata = {
  title: 'Project proposal',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default async function ProposalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await proposalAccess(slug);
  if (access.state === 'missing') notFound();

  return (
    <main>
      <div className="mx-auto max-w-[860px] px-gutter py-[clamp(40px,7vh,88px)]">
        <div className="mb-8 text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-700">
          Digi Hook · Proposal
        </div>

        {access.state === 'locked' ? (
          <>
            <h1 className="m-0 mb-5 max-w-[18ch] font-heading text-[clamp(30px,4.4vw,56px)] font-extrabold leading-[1.0] tracking-[-0.045em]">
              This proposal is protected.
            </h1>
            <p className="m-0 mb-8 max-w-[52ch] text-[16.5px] leading-[1.6] text-neutral-800">
              Enter the access code we sent you. If you do not have it, call us on{' '}
              <a
                href={`tel:${site.phoneHref}`}
                className="border-b border-accent text-accent-700"
              >
                {site.phoneDisplay}
              </a>
              .
            </p>
            <UnlockForm slug={slug} />
          </>
        ) : (
          <>
            <h1 className="m-0 mb-6 font-heading text-[clamp(30px,4.4vw,60px)] font-extrabold leading-[1.0] tracking-[-0.045em]">
              {access.proposal.content.title}
            </h1>

            {/* Prepared for / prepared by, as on the studio's own proposal
                documents. Two columns that stack fluidly rather than at a
                breakpoint. */}
            <div className="mb-9 grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-x-8 gap-y-6 border-y-2 border-text py-6">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                  Prepared for
                </div>
                <div className="font-heading text-[17px] font-bold leading-[1.25] tracking-[-0.02em]">
                  {access.proposal.client}
                </div>
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                  Prepared by
                </div>
                <div className="font-heading text-[17px] font-bold leading-[1.25] tracking-[-0.02em]">
                  {site.name}
                </div>
                <div className="mt-1.5 text-[13px] leading-[1.55] text-neutral-700">
                  {site.addressLine}
                  <br />
                  {site.email} · {site.phoneDisplay}
                </div>
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                  Date
                </div>
                <div className="text-[13.5px] leading-[1.55] text-neutral-800">
                  {new Date(access.proposal.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div className="mt-1.5 text-[13px] leading-[1.55] text-neutral-700">
                  Ref {slug.slice(0, 8).toUpperCase()}
                </div>
              </div>
            </div>

            <ProposalTabs slug={slug} accepted={Boolean(access.proposal.acceptedAt)} />

            {children}

            <div className="mt-12 border-t-2 border-text pt-7">
              <h2 className="m-0 mb-3 font-heading text-[clamp(20px,2.2vw,28px)] font-bold leading-[1.15] tracking-[-0.028em]">
                Questions on any of this?
              </h2>
              <p className="m-0 mb-4 max-w-[52ch] text-[15.5px] leading-[1.6] text-neutral-800">
                Call us and we will walk through it line by line. Nothing here is fixed
                until you are happy with it.
              </p>
              <a
                href={`tel:${site.phoneHref}`}
                className="font-heading text-[clamp(20px,2vw,28px)] font-bold leading-none tracking-[-0.025em] text-accent-700"
              >
                {site.phoneDisplay}
              </a>
              <div className="mt-4 text-[13.5px] leading-[1.6] text-neutral-700">
                {site.addressLine}
                <br />
                {site.hoursLine}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
