import {
  getEnquiry,
  getEnquiryByProposalSlug,
  type Enquiry,
} from './enquiries';
import { getProposal, type Proposal } from './proposals';
import { listSends, lastSendOf, type SentEmail } from './sentEmails';
import type { MilestoneStep } from './emailTemplate';
import {
  enquiryReceivedEmail,
  instructionsReceivedEmail,
  proposalCreatedEmail,
  proposalAcceptedEmail,
  type MilestoneMail,
} from './milestoneEmails';

/**
 * One client's progress through the four milestones, assembled from whichever
 * records hold it — an enquiry, a proposal, or both.
 *
 * Either may be absent, and in practice usually one is. Of the studio's first
 * fourteen proposals, thirteen were typed straight into the dashboard with no
 * enquiry behind them, so a resolver that demanded an enquiry could reach one
 * client in fourteen. Stages 1-2 belong to the enquiry and are simply
 * unavailable without one; stages 3-4 belong to the proposal and work whether
 * or not a brief ever came through the form.
 *
 * The dashboard, the send action and the preview route all read this. They
 * must agree on what is sendable and what each email would say; three
 * independent answers to that is how a client ends up being told something
 * the studio never saw.
 *
 * Nothing here sends. Deciding and doing are separate on purpose: the same
 * resolution renders a disabled button and refuses the request that would
 * bypass it.
 */

export type MilestoneRow = {
  stage: MilestoneStep;
  title: string;
  /** One line telling the studio what the client is about to be told. */
  gist: string;
  /** Resolved recipient, or '' when there is nobody to send to. */
  to: string;
  /** Why this cannot be sent, or null when it can. */
  blocked: string | null;
  /** The most recent attempt, successful or failed. */
  last: SentEmail | null;
  /** A caution that does not block the send — an earlier stage never went out. */
  warning: string | null;
  /** wa.me link to the client with this stage's text pre-written, if we have a number. */
  whatsapp: string | null;
};

export type Journey = {
  enquiry: Enquiry | null;
  proposal: Proposal | null;
  /** Who the client is, however we know them. */
  clientName: string;
  history: SentEmail[];
  rows: MilestoneRow[];
};

const TITLES: Record<MilestoneStep, string> = {
  1: 'Enquiry received',
  2: 'Instructions received',
  3: 'Proposal created',
  4: 'Proposal accepted',
};

const GISTS: Record<MilestoneStep, string> = {
  1: 'We have your brief; you will hear from us within 24 hours.',
  2: 'Thank you for talking it through — your proposal is getting ready.',
  3: 'Your proposal is ready to read, with the link and access code.',
  4: 'Accepted — work starts now, follow it on your project page.',
};

/**
 * The address each stage would actually mail. Stages 1-2 belong to the
 * enquiry; 3-4 belong to the proposal and prefer its own contact details, so a
 * client who corrected their address gets the later emails at the new one.
 */
function recipientFor(
  stage: MilestoneStep,
  enquiry: Enquiry | null,
  proposal: Proposal | null
): string {
  if (stage <= 2) return (enquiry?.email ?? '').trim();
  return (proposal?.clientEmail || enquiry?.email || '').trim();
}

/** The same precedence as `recipientFor`, so a stage's email and WhatsApp
 *  message never go to two different people. */
function phoneFor(
  stage: MilestoneStep,
  enquiry: Enquiry | null,
  proposal: Proposal | null
): string {
  if (stage <= 2) return (enquiry?.phone ?? '').trim();
  return (proposal?.clientPhone || enquiry?.phone || '').trim();
}

function blockedReason(
  stage: MilestoneStep,
  to: string,
  enquiry: Enquiry | null,
  proposal: Proposal | null
): string | null {
  // Stages 1-2 describe things that happen to an enquiry. A proposal typed
  // straight into the dashboard never had one, and saying so is more honest
  // than offering to send a client an acknowledgement of a brief they never
  // submitted.
  if (stage <= 2 && !enquiry) {
    return 'No enquiry behind this proposal — it was created directly.';
  }
  if (stage >= 3 && !proposal) return 'No proposal drafted from this enquiry yet.';
  if (stage === 4 && !proposal?.acceptedAt) return 'The proposal has not been accepted yet.';
  if (!to) return 'No email address on file. Add one above.';
  return null;
}

/**
 * Builds the exact email a stage would send. Returns null when the records it
 * needs are missing, which is the same condition `blockedReason` reports —
 * they are checked separately so a caller cannot send by skipping the check.
 */
export function milestoneMailFor(
  stage: MilestoneStep,
  enquiry: Enquiry | null,
  proposal: Proposal | null
): MilestoneMail | null {
  // The enquiry's name is the one the client gave us; the proposal's is what
  // the studio typed when drafting. Prefer the client's own.
  const name = enquiry?.name ?? proposal?.client ?? '';

  switch (stage) {
    case 1:
      if (!enquiry) return null;
      return enquiryReceivedEmail({ name, enquiryId: enquiry.id });
    case 2:
      if (!enquiry) return null;
      return instructionsReceivedEmail({ name, enquiryId: enquiry.id });
    case 3:
      if (!proposal) return null;
      return proposalCreatedEmail({
        name,
        slug: proposal.slug,
        accessCode: proposal.accessCode,
      });
    case 4:
      if (!proposal) return null;
      return proposalAcceptedEmail({
        name,
        slug: proposal.slug,
        firstPhase: proposal.content.timeline[0]?.phase,
      });
  }
}

/**
 * A wa.me link to the *client* (not the studio), with the stage's plain-text
 * message ready to send. Manual by necessity — a wa.me link only opens the
 * chat with the text filled in; a person still presses send.
 *
 * Indian numbers arrive from the form in several shapes ("98736 74517",
 * "+91-9873674517", "09873674517"), and wa.me accepts only digits with a
 * country code, so a bare ten-digit number gets 91. Anything that does not
 * look like a phone number returns null rather than a link to nowhere.
 */
function whatsappToClient(phone: string, message: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Assembles the journey once both records have been resolved. */
async function build(
  enquiry: Enquiry | null,
  proposal: Proposal | null
): Promise<Journey> {
  const history = await listSends({
    enquiryId: enquiry?.id ?? null,
    proposalSlug: proposal?.slug ?? null,
  });

  const sentOk = (stage: MilestoneStep) =>
    history.some((s) => s.stage === stage && s.ok);

  const rows: MilestoneRow[] = ([1, 2, 3, 4] as MilestoneStep[]).map((stage) => {
    const to = recipientFor(stage, enquiry, proposal);
    const previous = (stage - 1) as MilestoneStep;
    const mail = milestoneMailFor(stage, enquiry, proposal);
    const blocked = blockedReason(stage, to, enquiry, proposal);

    return {
      stage,
      title: TITLES[stage],
      gist: GISTS[stage],
      to,
      blocked,
      last: lastSendOf(history, stage),
      // Out of order is allowed — the studio may well have called without
      // sending the middle email — but it should not pass unnoticed, because
      // every email's progress track claims the earlier steps are done.
      // Stages that were never available say nothing: a proposal with no
      // enquiry cannot have sent step 1, and nagging about it is noise.
      warning:
        stage > 1 && !sentOk(previous) && !blocked && (previous > 2 || enquiry)
          ? `Step ${previous} (${TITLES[previous]}) has not been sent.`
          : null,
      whatsapp: mail
        ? whatsappToClient(phoneFor(stage, enquiry, proposal), mail.body)
        : null,
    };
  });

  return {
    enquiry,
    proposal,
    clientName: enquiry?.name ?? proposal?.client ?? 'This client',
    history,
    rows,
  };
}

/** The journey as reached from the enquiries list. */
export async function getJourney(enquiryId: string): Promise<Journey | null> {
  const enquiry = await getEnquiry(enquiryId);
  if (!enquiry) return null;

  const proposal = enquiry.proposalSlug
    ? await getProposal(enquiry.proposalSlug)
    : null;

  return build(enquiry, proposal);
}

/**
 * The journey as reached from a proposal — the common case. Most proposals are
 * typed straight into the dashboard, so the enquiry lookup usually finds
 * nothing, and stages 3-4 carry the whole relationship.
 */
export async function getProposalJourney(slug: string): Promise<Journey | null> {
  const proposal = await getProposal(slug);
  if (!proposal) return null;

  const enquiry = await getEnquiryByProposalSlug(slug);
  return build(enquiry, proposal);
}
