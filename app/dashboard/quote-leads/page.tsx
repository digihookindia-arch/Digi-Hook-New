import Link from 'next/link';
import {
  BUDGET_RULES,
  CONTACT_TIME_QUESTION,
  formatInr,
  getQuestions,
  TYPE_QUESTION,
  type QuoteQuestion,
} from '@/content/quote';
import { isDbConfigured } from '@/lib/db';
import { listQuoteLeads, type QuoteLead } from '@/lib/quoteLeads';
import { requireSession } from '../actions';

export const dynamic = 'force-dynamic';

const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function optionLabel(question: QuoteQuestion | undefined, id: string): string {
  return question?.options.find((o) => o.id === id)?.title ?? id;
}

function typeLabel(lead: QuoteLead): string {
  return optionLabel(TYPE_QUESTION, lead.websiteType);
}

function budgetLabel(lead: QuoteLead): string {
  if (lead.budgetAgreed === 'yes') {
    const rule = BUDGET_RULES[lead.websiteType];
    return rule ? `${formatInr(rule.min)}–${formatInr(rule.max)} · range OK` : 'Range OK';
  }
  const amount = parseInt(lead.budget, 10);
  return Number.isFinite(amount) ? `${formatInr(amount)} · their number` : lead.budget;
}

/** Branch answers, excluding fields already shown in their own cells. */
function detailRows(lead: QuoteLead): { label: string; value: string }[] {
  const skip = new Set(['websiteType']);
  const rows: { label: string; value: string }[] = [];
  for (const q of getQuestions(lead.websiteType)) {
    if (skip.has(q.key)) continue;
    const raw = lead.answers[q.key];
    if (raw === undefined) continue;
    let value: string;
    if (Array.isArray(raw)) {
      value = raw.map((id) => optionLabel(q, id)).join(', ');
    } else if (q.mode === 'text') {
      value = raw;
    } else {
      value = optionLabel(q, raw);
    }
    rows.push({ label: q.title, value });
  }
  return rows;
}

function sourceLabel(lead: QuoteLead): string {
  const s = lead.source;
  if (!s) return 'Direct';
  const parts = [s.utm_source, s.utm_campaign].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  if (s.fbclid) return 'Meta (fbclid)';
  if (s.gclid) return 'Google (gclid)';
  return 'Direct';
}

export default async function QuoteLeadsPage() {
  await requireSession();

  const configured = isDbConfigured();
  const leads = configured ? await listQuoteLeads() : [];

  return (
    <main>
      <div className="mx-auto max-w-content px-gutter py-[clamp(40px,6vh,72px)]">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5 border-b-2 border-text pb-6">
          <div>
            <div className="mb-3 text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-accent-700">
              Digi Hook · Internal
            </div>
            <h1 className="m-0 font-heading text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              Quote leads
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/enquiries"
              className="border-2 border-neutral-400 px-4 py-3.5 text-[14px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
            >
              Enquiries
            </Link>
            <Link
              href="/dashboard"
              className="border-2 border-neutral-400 px-4 py-3.5 text-[14px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
            >
              Proposals
            </Link>
          </div>
        </div>

        {leads.length === 0 ? (
          <p className="m-0 py-12 text-[15.5px] leading-[1.6] text-neutral-700">
            No quote leads yet. Submissions from /get-quote land here.
          </p>
        ) : (
          <div className="border-t-2 border-text">
            {leads.map((lead) => (
              <div key={lead.id} className="border-b border-neutral-300 py-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <div className="min-w-0 flex-[1_1_320px]">
                    <div className="font-heading text-[19px] font-bold leading-[1.25] tracking-[-0.02em]">
                      {lead.name}
                      <span className="font-sans font-medium text-neutral-700"> · {lead.business}</span>
                    </div>
                    <div className="mt-1.5 text-[13.5px] leading-[1.5] text-neutral-700">
                      {typeLabel(lead)} · {budgetLabel(lead)} ·{' '}
                      {optionLabel(CONTACT_TIME_QUESTION, lead.contactTime)} ·{' '}
                      <a
                        href={`https://wa.me/91${lead.phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whitespace-nowrap font-semibold text-accent-700 underline"
                      >
                        +91 {lead.phone}
                      </a>{' '}
                      ·{' '}
                      <a href={`mailto:${lead.email}`} className="underline">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-4">
                    <span className="border-2 border-accent-600 px-2.5 py-1 text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-accent-700">
                      {lead.status}
                    </span>
                    <span className="text-[13px] leading-none text-neutral-700">
                      {DATE_FORMAT.format(new Date(lead.createdAt))}
                    </span>
                    <span className="text-[13px] leading-none text-neutral-700">
                      {sourceLabel(lead)}
                    </span>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-x-8 gap-y-2.5">
                  {detailRows(lead).map((row) => (
                    <div key={row.label} className="text-[13.5px] leading-[1.5]">
                      <dt className="font-semibold text-neutral-700">{row.label}</dt>
                      <dd className="m-0">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
