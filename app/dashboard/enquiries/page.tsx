import Link from 'next/link';
import { ArrowRight, MessageSquare } from 'lucide-react';
import {
  listEnquiries,
  noteCounts,
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_SOURCE_LABELS,
  type Enquiry,
  type EnquiryStatus,
} from '@/lib/enquiries';
import { isDbConfigured } from '@/lib/db';
import { isEmailConfigured } from '@/lib/email';
import { isLeadSheetConfigured, isReadingPublicly, leadSheetBlockers } from '@/lib/leadSheet';
import { requireSession } from '../actions';

export const dynamic = 'force-dynamic';

/** Muted for closed states so live work reads first. */
const STATUS_TONE: Record<EnquiryStatus, string> = {
  new: 'border-accent-600 text-accent-700',
  reviewing: 'border-text text-text',
  'no-response': 'border-neutral-400 text-neutral-700',
  busy: 'border-text text-text',
  drafted: 'border-text text-text',
  'proposal-sent': 'border-text text-text',
  won: 'border-neutral-400 text-neutral-700',
  lost: 'border-neutral-400 text-neutral-700',
};

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireSession();

  const { status } = await searchParams;
  const configured = isDbConfigured();
  const all = configured ? await listEnquiries() : [];
  const notes = configured ? await noteCounts() : new Map<string, number>();

  // An unknown status in the URL shows everything rather than an empty page:
  // this filter is a convenience, and a hand-edited link should not look like
  // a lost pipeline.
  const active = ENQUIRY_STATUSES.includes(status as EnquiryStatus)
    ? (status as EnquiryStatus)
    : null;
  const enquiries = active ? all.filter((e) => e.status === active) : all;

  const counts = new Map<EnquiryStatus, number>();
  for (const e of all) counts.set(e.status, (counts.get(e.status) ?? 0) + 1);

  const sheetBlockers = leadSheetBlockers();

  return (
    <main>
      <div className="mx-auto max-w-content px-gutter py-[clamp(40px,6vh,72px)]">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5 border-b-2 border-text pb-6">
          <div>
            <div className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-700">
              Digi Hook · Internal
            </div>
            <h1 className="m-0 font-heading text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              Leads
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
            notification reaches the studio. Set <code>SMTP_USER</code> and{' '}
            <code>SMTP_PASS</code> in <code>.env.local</code>.
          </p>
        ) : null}

        {/* The sheet is the studio's main source of leads, so a broken import
            has to be visible on this page rather than only in a cron log. */}
        {!isLeadSheetConfigured() ? (
          <div className="mb-5 border-l-2 border-neutral-400 py-1 pl-4">
            <p className="m-0 text-[14.5px] leading-[1.55] text-neutral-800">
              <strong className="font-heading">Meta lead ads are not connected.</strong>{' '}
              Rows from the ad form are not being imported.
            </p>
            <ul className="m-0 mt-1.5 list-none p-0">
              {sheetBlockers.map((blocker) => (
                <li
                  key={blocker}
                  className="text-[14px] leading-[1.55] text-neutral-700"
                >
                  {blocker}
                </li>
              ))}
            </ul>
          </div>
        ) : isReadingPublicly() ? (
          <p className="m-0 mb-5 border-l-2 border-accent py-1 pl-4 text-[14.5px] leading-[1.55] text-accent-700">
            <strong className="font-heading">
              The lead sheet is being read with no credentials.
            </strong>{' '}
            It has to be published to anyone with the link for that to work — names,
            email addresses and phone numbers included. Restrict the sheet, share it
            with a service account, and set <code>GSC_KEY_FILE</code>.
          </p>
        ) : null}

        {all.length === 0 ? (
          <p className="m-0 py-12 text-[15.5px] leading-[1.6] text-neutral-700">
            No leads yet. Briefs from the contact form and rows from the Meta lead
            form both land here.
          </p>
        ) : (
          <>
            <div className="mb-7 flex flex-wrap gap-2">
              <Filter href="/dashboard/enquiries" label="All" count={all.length} on={!active} />
              {ENQUIRY_STATUSES.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => (
                <Filter
                  key={s}
                  href={`/dashboard/enquiries?status=${s}`}
                  label={ENQUIRY_STATUS_LABELS[s]}
                  count={counts.get(s) ?? 0}
                  on={active === s}
                />
              ))}
            </div>

            {enquiries.length === 0 ? (
              <p className="m-0 py-12 text-[15.5px] leading-[1.6] text-neutral-700">
                Nothing at this stage.
              </p>
            ) : (
              <div className="border-t-2 border-text">
                {enquiries.map((e) => (
                  <Row key={e.id} enquiry={e} notes={notes.get(e.id) ?? 0} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Filter({
  href,
  label,
  count,
  on,
}: {
  href: string;
  label: string;
  count: number;
  on: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={on ? 'page' : undefined}
      className={`border-2 px-3.5 py-2.5 text-[13.5px] font-semibold leading-none transition-colors ${
        on
          ? 'border-text bg-text text-bg'
          : 'border-neutral-400 text-neutral-800 hover:border-text hover:text-text'
      }`}
    >
      {label}{' '}
      <span className={on ? 'text-neutral-400' : 'text-neutral-700'}>{count}</span>
    </Link>
  );
}

function Row({ enquiry: e, notes }: { enquiry: Enquiry; notes: number }) {
  return (
    <Link
      href={`/dashboard/enquiries/${e.id}`}
      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-neutral-300 py-5 text-text transition-colors hover:bg-neutral-100"
    >
      <div className="min-w-0 flex-[1_1_320px]">
        <div className="font-heading text-[19px] font-bold leading-[1.25] tracking-[-0.02em]">
          {e.name}
          {e.company ? (
            <span className="font-sans font-medium text-neutral-700"> · {e.company}</span>
          ) : null}
        </div>
        <div className="mt-1.5 text-[13.5px] leading-[1.5] text-neutral-700">
          {e.service}
          {e.email ? ` · ${e.email}` : ''}
          {e.phone ? ` · ${e.phone}` : ''}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12.5px] leading-[1.4] text-neutral-700">
          <span>{ENQUIRY_SOURCE_LABELS[e.source]}</span>
          {notes > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare size={12} aria-hidden="true" />
              {notes} {notes === 1 ? 'note' : 'notes'}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-none items-center gap-4">
        <span
          className={`border-2 px-2.5 py-1 text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] ${STATUS_TONE[e.status]}`}
        >
          {ENQUIRY_STATUS_LABELS[e.status]}
        </span>
        <span className="text-[13px] leading-none text-neutral-700">
          {new Date(e.createdAt).toLocaleDateString('en-IN')}
        </span>
        <ArrowRight size={16} aria-hidden="true" />
      </div>
    </Link>
  );
}
