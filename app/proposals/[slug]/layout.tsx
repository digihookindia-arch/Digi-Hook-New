import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { listPayments } from '@/lib/payments';
import { proposalAccess } from '@/lib/proposalAccess';
import { proposalRef } from '@/lib/proposalDoc';
import { site } from '@/lib/site';
import { UnlockForm } from './UnlockForm';
import { ProposalCover } from './ProposalCover';
import { ProposalNav } from './ProposalNav';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

/**
 * Client-facing proposal chrome, shared by all four stages: the access-code
 * gate, the letterhead, the cover band, the contents column and the sign-off.
 *
 * The marketing header and footer are deliberately absent — `SiteChrome`
 * excludes `/proposals` — so this is the whole page. A client reading the
 * document they are being asked to sign should not also be looking at a
 * "Request a project scope" button for the thing they are already buying.
 *
 * Blocked from search engines and kept out of the sitemap, because a client's
 * pricing must never end up in those results. Each page below re-states this
 * rather than relying on inheritance, since a page that exports its own
 * metadata replaces what it inherits wholesale.
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

  const ref = proposalRef(slug);

  if (access.state === 'locked') {
    return (
      <main>
        <Letterhead reference={ref} printable={false} />
        <div className="mx-auto max-w-[720px] px-gutter py-[clamp(48px,9vh,104px)]">
          <div className="rounded-panel bg-panel p-[clamp(28px,5vw,48px)] shadow-panel">
            <h1 className="m-0 mb-5 max-w-[18ch] font-heading text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              This proposal is protected.
            </h1>
            <p className="m-0 mb-8 max-w-[52ch] text-[16.5px] leading-[1.65] text-neutral-800">
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
          </div>
        </div>
      </main>
    );
  }

  const proposal = access.proposal;
  const accepted = Boolean(proposal.acceptedAt);

  return (
    <main>
      <Letterhead reference={ref} printable />
      <ProposalCover proposal={proposal} payments={await listPayments(slug)} />

      <ProposalNav slug={slug} accepted={accepted} />

      <div className="mx-auto max-w-[900px] px-gutter py-[clamp(36px,5vw,64px)]">
        {children}

        <div className="mt-[clamp(48px,6vw,80px)] rounded-panel bg-panel p-[clamp(26px,4vw,44px)] shadow-panel">
          <h2 className="m-0 mb-3 font-heading text-[clamp(21px,2.4vw,30px)] font-bold leading-[1.12] tracking-[-0.03em]">
            Questions on any of this?
          </h2>
          <p className="m-0 mb-6 max-w-[52ch] text-[15.5px] leading-[1.65] text-neutral-800">
            Call us and we will walk through it line by line. Nothing here is
            fixed until you are happy with it.
          </p>

          <div className="flex flex-wrap items-start gap-x-12 gap-y-6">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                Talk to us
              </div>
              <a
                href={`tel:${site.phoneHref}`}
                className="font-heading text-[clamp(21px,2.2vw,28px)] font-bold leading-none tracking-[-0.03em] text-accent-700"
              >
                {site.phoneDisplay}
              </a>
              <div className="mt-2.5 text-[13.5px] leading-[1.6] text-neutral-700">
                {site.email}
                <br />
                {site.hoursLine}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
                Prepared by
              </div>
              <div className="font-heading text-[16px] font-bold leading-[1.3] tracking-[-0.02em]">
                {site.legalName}
              </div>
              <div className="mt-2 text-[13.5px] leading-[1.6] text-neutral-700">
                {site.addressLine}
                {/* Rendered only when the studio has supplied one. A
                    document that adds GST without naming the registration
                    it is collected under is not one an accountant can
                    file, and an invented number is worse than none. */}
                {site.gstin ? (
                  <>
                    <br />
                    GSTIN {site.gstin}
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <p className="m-0 mt-8 border-t border-neutral-200 pt-5 text-[12px] leading-[1.55] text-neutral-700">
            Reference {ref} · Prepared for {proposal.client}. This document is
            confidential.
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * The letterhead. Not navigation — it identifies the document and who issued
 * it, and carries the one control someone reading a formal document actually
 * wants. Hidden from the locked view, where there is nothing yet to print.
 */
function Letterhead({
  reference,
  printable,
}: {
  reference: string;
  printable: boolean;
}) {
  return (
    <div className="border-b border-neutral-300 bg-panel">
      <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-gutter py-4">
        {/* 1000x238 source; the width/height pair holds that ratio so the
            reserved box is the right shape while the logo loads. */}
        <Image
          src="/logo.png"
          alt="Digi Hook"
          width={151}
          height={36}
          priority
          className="h-[clamp(28px,4.5vw,36px)] w-auto flex-none mix-blend-multiply"
        />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-[11.5px] font-semibold uppercase leading-none tracking-[0.16em] text-neutral-700">
            Proposal · Ref {reference}
          </span>
          {printable ? <PrintButton /> : null}
        </div>
      </div>
    </div>
  );
}
