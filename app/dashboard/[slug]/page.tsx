import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trash2, ExternalLink } from 'lucide-react';
import { getProposal } from '@/lib/proposals';
import { ProposalView } from '@/components/ProposalView';
import {
  requireSession,
  removeProposal,
  setAcceptedAction,
  setAssetsSharedAction,
} from '../actions';
import { ReviseForm } from './ReviseForm';
import { DeliveryEditor } from './DeliveryEditor';

export const dynamic = 'force-dynamic';

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireSession();
  const { slug } = await params;

  const proposal = await getProposal(slug);
  if (!proposal) notFound();

  return (
    <main>
      <div className="mx-auto max-w-content px-gutter py-[clamp(40px,6vh,72px)]">
        <Link
          href="/dashboard"
          className="mb-7 inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase leading-none tracking-[0.1em] text-accent-700"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Proposals
        </Link>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b-2 border-text pb-6">
          <div className="min-w-0">
            <h1 className="m-0 mb-2 font-heading text-[clamp(26px,3.4vw,42px)] font-extrabold leading-[1.05] tracking-[-0.038em]">
              {proposal.content.title}
            </h1>
            <div className="text-[13.5px] leading-[1.5] text-neutral-700">
              {proposal.client} · updated{' '}
              {new Date(proposal.updatedAt).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/proposals/${proposal.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 border-2 border-text px-4 py-3 text-[13.5px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
            >
              <ExternalLink size={14} aria-hidden="true" />
              Open client view
            </Link>
            <form action={removeProposal}>
              <input type="hidden" name="slug" value={proposal.slug} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 border-2 border-neutral-400 px-4 py-3 text-[13.5px] font-medium leading-none text-neutral-800 transition-colors hover:border-accent-700 hover:text-accent-700"
              >
                <Trash2 size={14} aria-hidden="true" />
                Delete
              </button>
            </form>
          </div>
        </div>

        {/* What the team sends the client. */}
        <div className="mb-9 border-2 border-text">
          <div className="bg-text px-[18px] py-3.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-bg">
            Share with the client
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
            <div className="border-b border-neutral-300 p-[18px]">
              <div className="mb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-neutral-700">
                Link
              </div>
              <code className="block break-all text-[13.5px] leading-[1.5] text-text">
                /proposals/{proposal.slug}
              </code>
            </div>
            <div className="border-b border-l border-neutral-300 p-[18px]">
              <div className="mb-2 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-neutral-700">
                Access code
              </div>
              <div className="font-heading text-[24px] font-extrabold leading-none tracking-[-0.02em] text-accent-700">
                {proposal.accessCode}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-300 p-[18px]">
            <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-neutral-700">
              Acceptance
            </span>
            {proposal.acceptedAt ? (
              <>
                <span className="text-[13.5px] font-semibold leading-none text-accent-700">
                  Accepted {new Date(proposal.acceptedAt).toLocaleDateString('en-IN')}
                </span>
                <form action={setAcceptedAction}>
                  <input type="hidden" name="slug" value={proposal.slug} />
                  <input type="hidden" name="accepted" value="no" />
                  <button
                    type="submit"
                    className="border-2 border-neutral-400 px-3 py-2 text-[12.5px] font-medium leading-none text-neutral-800 transition-colors hover:border-accent-700 hover:text-accent-700"
                  >
                    Mark as not accepted
                  </button>
                </form>
              </>
            ) : (
              <>
                <span className="text-[13.5px] leading-none text-neutral-700">
                  Not accepted yet — the client&apos;s other two tabs stay locked.
                </span>
                <form action={setAcceptedAction}>
                  <input type="hidden" name="slug" value={proposal.slug} />
                  <input type="hidden" name="accepted" value="yes" />
                  <button
                    type="submit"
                    className="border-2 border-text px-3 py-2 text-[12.5px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
                  >
                    Mark accepted (e.g. agreed on a call)
                  </button>
                </form>
              </>
            )}
          </div>
          <p className="m-0 p-[18px] text-[13.5px] leading-[1.55] text-neutral-700">
            The page is blocked from search engines and needs the code to open. Send
            both to the client. The same code opens all three tabs —{' '}
            <Link
              href={`/proposals/${proposal.slug}/assets`}
              target="_blank"
              className="border-b border-accent text-accent-700"
            >
              what we need
            </Link>{' '}
            and{' '}
            <Link
              href={`/proposals/${proposal.slug}/status`}
              target="_blank"
              className="border-b border-accent text-accent-700"
            >
              status
            </Link>{' '}
            included.
          </p>
        </div>

        <div className="mb-10">
          <ReviseForm slug={proposal.slug} />
        </div>

        {/* Studio-kept records behind the client's other two tabs. Claude never
            writes these, and revising the proposal above leaves them alone. */}
        <div className="mb-10 border-t-2 border-text pt-8">
          <div className="mb-6 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
            Delivery
          </div>

          {/* Publishing the asset list is its own step: the client sees a
              "within 24 hours" notice until this is pressed, so the list they
              get is one the studio actually edited down for their project. */}
          <div className="mb-7 border-2 border-text">
            <div className="bg-text px-[18px] py-3.5 text-[11.5px] font-semibold uppercase leading-[1.3] tracking-[0.14em] text-bg">
              What we need — visible to the client?
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-[18px]">
              {proposal.assetsSharedAt ? (
                <>
                  <span className="text-[13.5px] font-semibold leading-none text-accent-700">
                    Shared {new Date(proposal.assetsSharedAt).toLocaleDateString('en-IN')}
                  </span>
                  <span className="text-[13.5px] leading-[1.5] text-neutral-700">
                    The client can see the list below.
                  </span>
                  <form action={setAssetsSharedAction}>
                    <input type="hidden" name="slug" value={proposal.slug} />
                    <input type="hidden" name="shared" value="no" />
                    <button
                      type="submit"
                      className="border-2 border-neutral-400 px-3 py-2 text-[12.5px] font-medium leading-none text-neutral-800 transition-colors hover:border-accent-700 hover:text-accent-700"
                    >
                      Unshare
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <span className="text-[13.5px] leading-[1.5] text-neutral-700">
                    Not shared yet.{' '}
                    {proposal.acceptedAt
                      ? 'The client is seeing “we will send this within 24 hours”.'
                      : 'The client cannot open this tab until they accept.'}{' '}
                    Edit the list below first, then share.
                  </span>
                  <form action={setAssetsSharedAction}>
                    <input type="hidden" name="slug" value={proposal.slug} />
                    <input type="hidden" name="shared" value="yes" />
                    <button
                      type="submit"
                      className="inline-flex min-h-[40px] items-center border-2 border-accent-600 bg-accent-600 px-4 text-[12.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
                    >
                      Share this list with the client
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          <DeliveryEditor
            slug={proposal.slug}
            total={proposal.content.total}
            initialAssets={proposal.assets}
            initialMilestones={proposal.milestones}
            initialStages={proposal.stages}
          />
        </div>

        <div className="border-t-2 border-text pt-8">
          <div className="mb-6 text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-accent-700">
            Preview
          </div>
          <ProposalView content={proposal.content} milestones={proposal.milestones} />
        </div>
      </div>
    </main>
  );
}
