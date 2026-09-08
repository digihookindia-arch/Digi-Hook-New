import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Trash2 } from 'lucide-react';
import {
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_SOURCE_LABELS,
  listEnquiryNotes,
} from '@/lib/enquiries';
import { getJourney } from '@/lib/journey';
import { isEmailConfigured } from '@/lib/email';
import {
  FOLLOW_UP_LABELS,
  followUpState,
  formatFollowUp,
  formatInstantIst,
} from '@/lib/leadCrm';
import { formatWhatsappNumber } from '@/lib/phone';
import { SITE_URL } from '@/lib/site';
import { ClientUpdates } from '@/components/ClientUpdates';
import { FollowUpPicker } from '@/components/FollowUpPicker';
import { requireSession } from '../../actions';
import { removeEnquiry, sendMilestoneAction, updateLeadAction } from '../actions';
import { istShort } from '@/lib/when';

export const dynamic = 'force-dynamic';

// Pinned to Noida. Without a timeZone this renders in the server's zone,
// which is UTC in production - so an evening note would be filed yesterday.
const noteTime = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

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
  const notes = await listEnquiryNotes(enquiry.id);

  // The first line of the brief is the website type, which is what the
  // follow-up messages name back at the person.
  const wants = enquiry.summary[0]?.value ?? enquiry.service;
  const reachable = formatWhatsappNumber(enquiry.phone);
  const due = followUpState(enquiry.followUpAt);

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
              {enquiry.service} · Enquired {formatInstantIst(enquiry.submittedAt ?? enquiry.createdAt)}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <span className="border-2 border-neutral-400 px-2.5 py-1 text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
                {ENQUIRY_SOURCE_LABELS[enquiry.source]}
              </span>
              {/* An overdue call is the one thing on this page that should
                  interrupt you, so it is the only thing wearing the accent. */}
              {due !== 'none' ? (
                <span
                  className={`border-2 px-2.5 py-1 text-[11.5px] font-semibold uppercase leading-none tracking-[0.1em] ${
                    due === 'overdue'
                      ? 'border-accent-600 text-accent-700'
                      : 'border-text text-text'
                  }`}
                >
                  {due === 'upcoming'
                    ? formatFollowUp(enquiry.followUpAt)
                    : `${FOLLOW_UP_LABELS[due]} · ${formatFollowUp(enquiry.followUpAt)}`}
                </span>
              ) : null}
              {/* Whether the automatic thank-you has gone changes what you say
                  when you ring. Three states, not two: "imported with the
                  backlog" is a deliberate silence and must never read as a
                  message that was sent. */}
              <span className="text-[13px] leading-[1.4] text-neutral-700">
                {enquiry.welcomedAt
                  ? `Thank-you sent ${istShort(enquiry.welcomedAt)}`
                  : enquiry.welcomeSkippedAt
                    ? 'Imported with the backlog — no automatic message was sent'
                    : 'No automatic thank-you has gone to this lead yet'}
              </span>
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
            {enquiry.email ? (
              <a href={`mailto:${enquiry.email}`} className="text-accent-700">
                {enquiry.email}
              </a>
            ) : (
              <span className="text-neutral-700">Not given</span>
            )}
          </Field>
          <Field label="Phone">
            {enquiry.phone ? (
              <a href={`tel:${enquiry.phone}`} className="text-accent-700">
                {enquiry.phone}
              </a>
            ) : (
              <span className="text-neutral-700">Not given</span>
            )}
            {/* The same rule that decides whether a message can send, said out
                loud here rather than discovered at the moment of sending. */}
            {enquiry.phone && !reachable ? (
              <div className="mt-1 text-[13px] font-normal leading-[1.4] text-accent-700">
                Not readable as a WhatsApp number
              </div>
            ) : null}
          </Field>
          {enquiry.company ? <Field label="Company">{enquiry.company}</Field> : null}
        </div>

        {/* The lite CRM: outcome, next call, what was said — filled in
            together, saved together. Placed above everything else because it
            is what you touch after every conversation. */}
        <section className="mb-9 border-2 border-text p-6">
          <h2 className="m-0 mb-1.5 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.025em]">
            Working this lead
          </h2>
          <p className="m-0 mb-6 text-[14px] leading-[1.55] text-neutral-700">
            Set where they are, when to call next, and what was said. Saved in one go.
          </p>

          {/*
            React resets an uncontrolled form once its action resolves, and it
            resets to the defaults of the render it was mounted with — which is
            the render *before* the save. Left alone, the fields snap back to
            the old status and date, and a second Save writes those stale
            values back over the new ones. Keying the form on what was saved
            remounts it with the fresh defaults instead, which also clears the
            note box, as a filed note should.
          */}
          <form action={updateLeadAction} key={`${enquiry.status}:${enquiry.followUpAt ?? ''}`}>
            <input type="hidden" name="id" value={enquiry.id} />

            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-5">
              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
                  Status
                </span>
                <select
                  name="status"
                  defaultValue={enquiry.status}
                  className="block w-full border-2 border-neutral-400 bg-bg px-3.5 py-3 text-[15px] leading-[1.2] text-text focus:border-text focus:outline-none"
                >
                  {ENQUIRY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ENQUIRY_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
                  Next follow-up
                </span>
                <input
                  type="datetime-local"
                  name="followUpAt"
                  defaultValue={enquiry.followUpAt ?? ''}
                  className="block w-full border-2 border-neutral-400 bg-bg px-3.5 py-3 text-[15px] leading-[1.2] text-text focus:border-text focus:outline-none"
                />
                <span className="mt-1.5 block text-[13px] leading-[1.4] text-neutral-700">
                  {enquiry.followUpAt
                    ? `${FOLLOW_UP_LABELS[due]} · ${formatFollowUp(enquiry.followUpAt)}`
                    : 'Nothing booked. Clear the field to cancel one.'}
                </span>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
                Add a note
              </span>
              <textarea
                name="body"
                rows={3}
                maxLength={2000}
                placeholder="Rang at 4pm — asked us to call back Thursday morning."
                className="block w-full resize-y border-2 border-neutral-400 bg-bg px-4 py-3.5 text-[15px] leading-[1.55] text-text placeholder:text-neutral-600 focus:border-text focus:outline-none"
              />
            </label>

            <button
              type="submit"
              className="mt-4 border-2 border-accent-600 bg-accent-600 px-5 py-3.5 text-[14.5px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
            >
              Save
            </button>
          </form>
        </section>

        <ClientUpdates
          target={{ enquiryId: enquiry.id }}
          rows={journey.rows}
          action={sendMilestoneAction}
          emailConfigured={isEmailConfigured()}
        />

        <FollowUpPicker
          lead={{
            name: enquiry.name,
            wants,
            proposalUrl: enquiry.proposalSlug
              ? `${SITE_URL}/proposals/${enquiry.proposalSlug}`
              : undefined,
          }}
          phone={enquiry.phone}
          email={enquiry.email}
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

        <section className="mb-9">
          <h2 className="m-0 mb-1.5 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.025em]">
            Call notes
          </h2>
          <p className="m-0 mb-5 text-[14px] leading-[1.55] text-neutral-700">
            What was said, so the next call starts where the last one ended. Notes
            cannot be edited or removed once filed.
          </p>

          {notes.length === 0 ? (
            <p className="m-0 border-t border-neutral-300 pt-5 text-[14.5px] leading-[1.6] text-neutral-700">
              Nothing filed yet.
            </p>
          ) : (
            <div className="border-t-2 border-text">
              {notes.map((note) => (
                <div key={note.id} className="border-b border-neutral-300 py-4">
                  <div className="mb-1.5 text-[12px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-700">
                    {noteTime.format(new Date(note.createdAt))}
                  </div>
                  <div className="whitespace-pre-wrap text-[15px] leading-[1.6] text-text">
                    {note.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-6 border-t-2 border-text pt-6">
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
