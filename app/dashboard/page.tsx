import Link from 'next/link';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { listProposals } from '@/lib/proposals';
import { newEnquiryCount } from '@/lib/enquiries';
import { newQuoteLeadCount } from '@/lib/quoteLeads';
import { isDbConfigured, dbFile } from '@/lib/db';
import { isClaudeConfigured } from '@/lib/claude';
import { requireSession, removeProposal, signOut } from './actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await requireSession();

  const configured = isDbConfigured();
  const proposals = configured ? await listProposals() : [];
  const newCount = configured ? await newEnquiryCount() : 0;
  const newQuoteCount = configured ? await newQuoteLeadCount() : 0;

  return (
    <main>
      <div className="mx-auto max-w-content px-gutter py-[clamp(40px,6vh,72px)]">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5 border-b-2 border-text pb-6">
          <div>
            <div className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-700">
              Digi Hook · Internal
            </div>
            <h1 className="m-0 font-heading text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              Proposals
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/enquiries"
              className="inline-flex items-center gap-2 border-2 border-text px-4 py-3.5 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
            >
              Enquiries
              {newCount > 0 ? (
                <span className="border-2 border-accent-600 bg-accent-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                  {newCount}
                </span>
              ) : null}
            </Link>
            <Link
              href="/dashboard/quote-leads"
              className="inline-flex items-center gap-2 border-2 border-text px-4 py-3.5 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
            >
              Quote leads
              {newQuoteCount > 0 ? (
                <span className="border-2 border-accent-600 bg-accent-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                  {newQuoteCount}
                </span>
              ) : null}
            </Link>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-5 py-3.5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
            >
              <Plus size={16} aria-hidden="true" />
              New proposal
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="border-2 border-neutral-400 px-4 py-3.5 text-[14px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {!configured ? (
          <Notice>
            <strong className="font-heading">The proposal database is unwritable.</strong>{' '}
            Could not open <code>{dbFile}</code>. Check the folder permissions, or set{' '}
            <code>SQLITE_PATH</code> in <code>.env.local</code> to somewhere writable and
            restart the server — proposals cannot be stored until then.
          </Notice>
        ) : null}
        {!isClaudeConfigured() ? (
          <Notice>
            <strong className="font-heading">ANTHROPIC_API_KEY is not set.</strong> Add it
            to <code>.env.local</code> to let Claude draft and revise proposals.
          </Notice>
        ) : null}

        {configured && proposals.length === 0 ? (
          <p className="m-0 py-12 text-[15.5px] leading-[1.6] text-neutral-700">
            No proposals yet. Create the first one — you give Claude the basics, it
            writes the draft, and you get a link to share.
          </p>
        ) : null}

        {proposals.length > 0 ? (
          <div className="border-t-2 border-text">
            {proposals.map((p) => (
              <div
                key={p.slug}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-b border-neutral-300 py-5"
              >
                <div className="min-w-0 flex-[1_1_320px]">
                  <Link
                    href={`/dashboard/${p.slug}`}
                    className="font-heading text-[19px] font-bold leading-[1.25] tracking-[-0.02em] text-text transition-colors hover:text-accent-700"
                  >
                    {p.content.title}
                  </Link>
                  <div className="mt-1.5 text-[13.5px] leading-[1.5] text-neutral-700">
                    {p.client} · {new Date(p.createdAt).toLocaleDateString('en-IN')} ·
                    access code <span className="font-heading font-bold">{p.accessCode}</span>
                  </div>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Link
                    href={`/proposals/${p.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 border-2 border-neutral-400 px-3.5 py-2.5 text-[13px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    View
                  </Link>
                  <form action={removeProposal}>
                    <input type="hidden" name="slug" value={p.slug} />
                    <button
                      type="submit"
                      aria-label={`Delete the proposal for ${p.client}`}
                      className="inline-flex items-center gap-2 border-2 border-neutral-400 px-3.5 py-2.5 text-[13px] font-medium leading-none text-neutral-800 transition-colors hover:border-accent-700 hover:text-accent-700"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 mb-5 border-l-2 border-accent py-1 pl-4 text-[14.5px] leading-[1.55] text-accent-700">
      {children}
    </p>
  );
}
