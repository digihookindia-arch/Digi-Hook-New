import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Trash2 } from 'lucide-react';
import { ENQUIRY_STATUSES } from '@/lib/enquiries';
import { getJourney } from '@/lib/journey';
import { isEmailConfigured } from '@/lib/email';
import { ClientUpdates } from '@/components/ClientUpdates';
import { requireSession } from '../../actions';
import { updateEnquiryStatus, removeEnquiry, sendMilestoneAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function EnquiryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();

  const { id } = await params;
  const journey = await getJourney(id);
  // getJourney resolves from the enquiry, so a journey here always has one.
  if (!journey?.enquiry) notFound();
  const { enquiry } = journey;

  return (
    <main>
      <div className="mx-auto max-w-content px-gutter py-[clamp(40px,6vh,72px)]">
        <Link
          href="/dashboard/enquiries"
          className="mb-8 inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase leading-none tracking-[0.1em] text-accent-700"
        >
          ← Enquiries
        </Link>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b-2 border-text pb-6">
          <div>
            <h1 className="m-0 mb-2 font-heading text-[clamp(28px,3.6vw,46px)] font-extrabold leading-[1.03] tracking-[-0.04em]">
              {enquiry.name}
            </h1>
            <div className="text-[14.5px] leading-[1.6] text-neutral-800">
              {enquiry.company ? `${enquiry.company} · ` : ''}
              {enquiry.service} · {new Date(enquiry.createdAt).toLocaleString('en-IN')}
            </div>
          </div>
          <Link
            href={`/dashboard/new?enquiry=${enquiry.id}`}
            className="inline-flex items-center gap-2.5 border-2 border-accent-600 bg-accent-600 px-5 py-3.5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
          >
            Draft proposal
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {/* Contact details first — this is what you act on. */}
        <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4 border-2 border-text p-6">
          <Field label="Email">
            <a href={`mailto:${enquiry.email}`} className="text-accent-700">
              {enquiry.email}
            </a>
          </Field>
          <Field label="Phone">
            <a href={`tel:${enquiry.phone}`} className="text-accent-700">
              {enquiry.phone}
            </a>
          </Field>
          {enquiry.company ? <Field label="Company">{enquiry.company}</Field> : null}
        </div>

        <ClientUpdates
          target={{ enquiryId: enquiry.id }}
          rows={journey.rows}
          action={sendMilestoneAction}
          emailConfigured={isEmailConfigured()}
        />

        <h2 className="m-0 mb-4 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.025em]">
          The brief
        </h2>
        <div className="mb-9 border-t-2 border-text">
          {enquiry.summary.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-6 gap-y-1 border-b border-neutral-300 py-3.5"
            >
              <div className="text-[13px] font-semibold uppercase leading-[1.4] tracking-[0.08em] text-neutral-700">
                {row.label}
              </div>
              <div className="text-[15px] leading-[1.55] text-text [grid-column:span_2]">
                {row.value}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6 border-t-2 border-text pt-6">
          <form action={updateEnquiryStatus} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={enquiry.id} />
            <label className="block">
              <span className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
                Status
              </span>
              <select
                name="status"
                defaultValue={enquiry.status}
                className="border-2 border-neutral-400 bg-bg px-3.5 py-3 text-[14.5px] leading-none text-text"
              >
                {ENQUIRY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="border-2 border-text px-4 py-3 text-[14px] font-semibold leading-none text-text transition-colors hover:bg-text hover:text-bg"
            >
              Update
            </button>
          </form>

          {enquiry.proposalSlug ? (
            <Link
              href={`/dashboard/${enquiry.proposalSlug}`}
              className="text-[14px] font-semibold text-accent-700"
            >
              View the proposal drafted from this →
            </Link>
          ) : null}

          <form action={removeEnquiry}>
            <input type="hidden" name="id" value={enquiry.id} />
            <button
              type="submit"
              aria-label={`Delete the enquiry from ${enquiry.name}`}
              className="inline-flex items-center gap-2 border-2 border-neutral-400 px-3.5 py-3 text-[13px] font-medium leading-none text-neutral-800 transition-colors hover:border-accent-700 hover:text-accent-700"
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em] text-neutral-700">
        {label}
      </div>
      <div className="text-[15.5px] font-medium leading-[1.4]">{children}</div>
    </div>
  );
}
