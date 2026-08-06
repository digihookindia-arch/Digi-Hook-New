import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { listEnquiries } from '@/lib/enquiries';
import { isDbConfigured } from '@/lib/db';
import { isEmailConfigured } from '@/lib/email';
import { requireSession } from '../actions';

export const dynamic = 'force-dynamic';

/** Muted for closed states so live work reads first. */
const STATUS_TONE: Record<string, string> = {
  new: 'border-accent-600 text-accent-700',
  reviewing: 'border-text text-text',
  drafted: 'border-text text-text',
  won: 'border-neutral-400 text-neutral-700',
  lost: 'border-neutral-400 text-neutral-700',
};

export default async function EnquiriesPage() {
  await requireSession();

  const configured = isDbConfigured();
  const enquiries = configured ? await listEnquiries() : [];

  return (
    <main>
      <div className="mx-auto max-w-content px-gutter py-[clamp(40px,6vh,72px)]">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5 border-b-2 border-text pb-6">
          <div>
            <div className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-700">
              Digi Hook · Internal
            </div>
            <h1 className="m-0 font-heading text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              Enquiries
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="border-2 border-neutral-400 px-4 py-3.5 text-[14px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
          >
            Proposals
          </Link>
        </div>

        {!isEmailConfigured() ? (
          <p className="m-0 mb-5 border-l-2 border-accent py-1 pl-4 text-[14.5px] leading-[1.55] text-accent-700">
            <strong className="font-heading">Email is not configured.</strong> Briefs are
            still captured here, but no acknowledgement reaches the client and no
            notification reaches the studio. Set <code>RESEND_API_KEY</code> in{' '}
            <code>.env.local</code>.
          </p>
        ) : null}

        {enquiries.length === 0 ? (
          <p className="m-0 py-12 text-[15.5px] leading-[1.6] text-neutral-700">
            No enquiries yet. Briefs submitted through the contact form land here.
          </p>
        ) : (
          <div className="border-t-2 border-text">
            {enquiries.map((e) => (
              <Link
                key={e.id}
                href={`/dashboard/enquiries/${e.id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-neutral-300 py-5 text-text transition-colors hover:bg-neutral-100"
              >
                <div className="min-w-0 flex-[1_1_320px]">
                  <div className="font-heading text-[19px] font-bold leading-[1.25] tracking-[-0.02em]">
                    {e.name}
                    {e.company ? (
                      <span className="font-sans font-medium text-neutral-700">
                        {' '}
                        · {e.company}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 text-[13.5px] leading-[1.5] text-neutral-700">
                    {e.service} · {e.email} · {e.phone}
                  </div>
                </div>
                <div className="flex flex-none items-center gap-4">
                  <span
                    className={`border-2 px-2.5 py-1 text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] ${
                      STATUS_TONE[e.status] ?? 'border-neutral-400 text-neutral-700'
                    }`}
                  >
                    {e.status}
                  </span>
                  <span className="text-[13px] leading-none text-neutral-700">
                    {new Date(e.createdAt).toLocaleDateString('en-IN')}
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
