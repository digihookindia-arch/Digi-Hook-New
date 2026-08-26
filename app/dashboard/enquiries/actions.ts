'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  setEnquiryStatus,
  deleteEnquiry,
  ENQUIRY_STATUSES,
  type EnquiryStatus,
} from '@/lib/enquiries';
import { getJourney, getProposalJourney, milestoneMailFor } from '@/lib/journey';
import { setProposalContact } from '@/lib/proposals';
import { sendMilestone } from '@/lib/sentEmails';
import { STUDIO_INBOX } from '@/lib/email';
import { requireSession } from '../actions';

/** Every action re-checks the session — middleware only proves a cookie exists. */

export async function updateEnquiryStatus(formData: FormData): Promise<void> {
  await requireSession();

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !ENQUIRY_STATUSES.includes(status as EnquiryStatus)) return;

  await setEnquiryStatus(id, status as EnquiryStatus);
  revalidatePath('/dashboard/enquiries');
  revalidatePath(`/dashboard/enquiries/${id}`);
}

/**
 * Sends one milestone email to the client and moves the enquiry's status to
 * match. The send is the act; the status follows it.
 *
 * That inversion is deliberate. Status used to be a filing label that would
 * have triggered client-facing mail as a side effect, which meant a dropdown
 * changed for housekeeping could thank someone for a call that never happened.
 * Now a person presses send, and `enquiries.status` records what the client
 * has actually been told.
 *
 * Returns nothing: every attempt is written to the send log, and the panel
 * renders that log — including the failure and the provider's reason. There is
 * no outcome here that the next render does not already show.
 */
export async function sendMilestoneAction(formData: FormData): Promise<void> {
  await requireSession();

  // Reached from either side: the enquiries page posts an enquiry id, the
  // proposal page posts a slug. Most proposals have no enquiry at all, so
  // insisting on an id would make the panel unusable where it is needed most.
  const id = String(formData.get('id') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const stage = Number(formData.get('stage'));
  if ((!id && !slug) || ![1, 2, 3, 4].includes(stage)) return;

  const journey = id ? await getJourney(id) : await getProposalJourney(slug);
  if (!journey) return;

  // The same resolution that disabled the button refuses the request, so a
  // hand-posted form cannot send a stage the dashboard would not offer.
  const row = journey.rows.find((r) => r.stage === stage);
  if (!row || row.blocked) return;

  const mail = milestoneMailFor(row.stage, journey.enquiry, journey.proposal);
  if (!mail) return;

  const result = await sendMilestone({
    stage: row.stage,
    to: row.to,
    mail,
    target: {
      enquiryId: journey.enquiry?.id ?? null,
      proposalSlug: journey.proposal?.slug ?? null,
    },
    replyTo: STUDIO_INBOX,
  });

  // Only a delivered email may move the pipeline. A failed send that advanced
  // the status would leave the dashboard claiming the client knows something
  // nobody told them. A proposal with no enquiry has no status to move.
  if (result.status === 'sent' && journey.enquiry) {
    const status = statusAfter(row.stage, journey.enquiry.status);
    if (status) await setEnquiryStatus(journey.enquiry.id, status);
  }

  revalidatePath('/dashboard/enquiries');
  if (journey.enquiry) revalidatePath(`/dashboard/enquiries/${journey.enquiry.id}`);
  if (journey.proposal) revalidatePath(`/dashboard/${journey.proposal.slug}`);
}

/**
 * Corrects the client's email and phone on a proposal. Needed because most
 * proposals are drafted without an enquiry behind them, so nothing has ever
 * captured an address — and without one the panel cannot send stages 3 or 4.
 */
export async function updateProposalContactAction(
  formData: FormData
): Promise<void> {
  await requireSession();

  const slug = String(formData.get('slug') ?? '');
  if (!slug) return;

  await setProposalContact(slug, {
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
  });

  revalidatePath(`/dashboard/${slug}`);
}

/**
 * Where a stage leaves the enquiry. Returns null when the status should not
 * move — sending stage 2 to a client whose proposal is already drafted must
 * not drag them backwards, and stages 1 and 3 describe a state the record is
 * already in.
 */
function statusAfter(
  stage: number,
  current: EnquiryStatus
): EnquiryStatus | null {
  if (stage === 2 && current === 'new') return 'reviewing';
  if (stage === 4 && current !== 'won') return 'won';
  return null;
}

export async function removeEnquiry(formData: FormData): Promise<void> {
  await requireSession();

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await deleteEnquiry(id);
  revalidatePath('/dashboard/enquiries');
  redirect('/dashboard/enquiries');
}
