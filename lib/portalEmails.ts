import { milestoneEmailHtml, shortReference } from './emailTemplate';
import { site, SITE_URL } from './site';
import { formatInr } from './delivery';
import type { TicketKind } from './tickets';

/**
 * Client-facing emails for the portal: the set-password invite (also the
 * forgot-password mail), the ticket/feature-request acknowledgement, and the
 * studio-reply notification. Same shell as the milestone emails but with no
 * milestone track — the portal is not the proposal journey, and a four-step
 * sales track on a support ticket would be nonsense.
 *
 * Studio-bound alerts are NOT built here — they stay plain text, composed
 * inline in the actions (the app/contact/actions.ts pattern).
 *
 * Escaping contract, inherited from the shell: client-typed text (the ticket
 * subject, a reply) may only enter escaped slots — `leadBody`, the detail
 * values, `preheader` — never `headline` or `secondaryLine`, which carry
 * caller-authored HTML.
 */

export type PortalMail = {
  subject: string;
  /** Plain-text fallback, sent alongside the HTML. */
  body: string;
  html: string;
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}

function signOff(): string[] {
  return [
    '',
    `Call us on ${site.phoneDisplay}, or message us on WhatsApp at ${site.whatsappDisplay}.`,
    '',
    '— The team at Digi Hook',
    site.addressLine,
  ];
}

function contactLine(): string {
  return (
    `Prefer to talk? Call <a href="tel:${site.phoneHref}" style="color:#b02510;text-decoration:underline;">${site.phoneDisplay}</a> ` +
    `— ${site.hoursLine.toLowerCase()}.`
  );
}

const PORTAL_FOOTER =
  "This message is about your Digi Hook client portal account. No action is needed if this wasn't you";

/** A one-line excerpt safe for the escaped leadBody slot — the full text always travels in the plain-text body. */
function excerpt(text: string, max = 400): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max - 1).trimEnd() + '…' : flat;
}

/* ------------------------------------------------------------------ */
/* Invite / set password                                               */
/* ------------------------------------------------------------------ */

/**
 * One builder for both the invite and the forgot-password mail — the link is
 * the same mechanism, only the validity window and framing differ.
 */
export function portalInviteEmail(input: {
  name: string;
  setPasswordUrl: string;
  /** Human wording for the link's validity, e.g. "7 days" or "1 hour". */
  expiresIn: string;
  /** True for a password reset on an existing account; changes the framing. */
  reset?: boolean;
}): PortalMail {
  const heading = input.reset ? 'Reset your password.' : 'Your client portal is ready.';

  return {
    subject: input.reset
      ? 'Reset your client portal password — Digi Hook'
      : 'Set up your client portal — Digi Hook',
    body: [
      `Hi ${firstName(input.name)},`,
      '',
      input.reset
        ? 'Use the link below to choose a new password for your Digi Hook client portal.'
        : 'We have set up a client portal for your project. From it you can see where things stand — your support plan, payments — and raise a ticket or request a feature whenever you need to.',
      '',
      `Set your password here: ${input.setPasswordUrl}`,
      '',
      `The link is valid for ${input.expiresIn} and works once. If it has expired, request a new one at ${SITE_URL}/portal/forgot.`,
      ...signOff(),
    ].join('\n'),
    html: milestoneEmailHtml({
      preheader: input.reset
        ? `Choose a new password for your client portal. The link is valid for ${input.expiresIn}.`
        : `Set a password and sign in. The link is valid for ${input.expiresIn}.`,
      kicker: 'Client portal',
      headline: input.reset
        ? 'Choose a new<br>password.'
        : 'Your project,<br>in one place.',
      leadHeading: heading,
      leadBody: input.reset
        ? `Use the button below to choose a new password. The link is valid for ${input.expiresIn} and works once — if it has expired, request a fresh one from the portal's sign-in page.`
        : 'From your portal you can see where your project stands — your support plan and payments — and raise a ticket or request a feature whenever you need to. Set a password with the button below and you are in.',
      detailLeftLabel: 'Get started',
      detailLeftValue: input.reset ? 'Choose a password' : 'Set your password',
      detailLeftHref: input.setPasswordUrl,
      detailRightLabel: 'Link valid for',
      detailRightValue: input.expiresIn,
      ctaText: input.reset ? 'Choose a new password' : 'Set your password',
      ctaHref: input.setPasswordUrl,
      secondaryLine: contactLine(),
      footerNote: PORTAL_FOOTER,
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Ticket / feature request received                                   */
/* ------------------------------------------------------------------ */

export function ticketReceivedEmail(input: {
  name: string;
  kind: TicketKind;
  /** Client-typed — enters escaped slots only. */
  subject: string;
  ticketId: string;
  /** Full portal URL of the ticket, built by the caller. */
  portalUrl: string;
  outOfSupport: boolean;
}): PortalMail {
  const reference = shortReference(input.ticketId);
  const isFeature = input.kind === 'feature';

  const promise = isFeature
    ? 'We will come back to you with what it involves — scope, timing and a quote where one is needed.'
    : input.outOfSupport
      ? 'Your free support window has ended, so we will come back to you with options and a quote before any work starts — nothing is charged without your go-ahead.'
      : 'It is covered by your support plan, and we will come back to you on it shortly.';

  return {
    subject: isFeature
      ? `We have your feature request (${reference}) — Digi Hook`
      : `We have your ticket (${reference}) — Digi Hook`,
    body: [
      `Hi ${firstName(input.name)},`,
      '',
      `${isFeature ? 'Your feature request' : 'Your support ticket'} has reached us:`,
      '',
      `  ${input.subject}`,
      '',
      promise,
      '',
      `Follow it, and reply to us, here: ${input.portalUrl}`,
      '',
      `Your reference is ${reference}.`,
      ...signOff(),
    ].join('\n'),
    html: milestoneEmailHtml({
      preheader: isFeature
        ? 'Your feature request has reached the team. We will reply with scope and timing.'
        : 'Your ticket has reached the team. We will reply on your portal shortly.',
      kicker: isFeature ? 'Request received' : 'Ticket received',
      headline: isFeature
        ? "It's with the team.<br>We'll scope it<br>and come back."
        : "It's with the team.<br>We'll come back<br>to you on it.",
      leadHeading: isFeature ? 'We have your request.' : 'We have your ticket.',
      leadBody: `"${input.subject}" — ${promise} Any reply from us lands on your portal, and you will get an email when it does.`,
      detailLeftLabel: 'Reference',
      detailLeftValue: reference,
      detailRightLabel: 'Status',
      detailRightValue: input.outOfSupport && !isFeature ? 'Needs a quote' : 'Open',
      ctaText: isFeature ? 'View your request' : 'View your ticket',
      ctaHref: input.portalUrl,
      secondaryLine: contactLine(),
      footerNote: PORTAL_FOOTER,
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Quote sent on a feature request                                     */
/* ------------------------------------------------------------------ */

export function quoteSentEmail(input: {
  name: string;
  /** Client-typed originally — escaped slots only. */
  subject: string;
  quoteInr: number;
  /** Studio-authored scope note; escaped anyway. */
  quoteNote: string;
  ticketId: string;
  portalUrl: string;
}): PortalMail {
  const reference = shortReference(input.ticketId);
  const amount = formatInr(input.quoteInr);

  return {
    subject: `Your quote is ready (${reference}) — Digi Hook`,
    body: [
      `Hi ${firstName(input.name)},`,
      '',
      `We have quoted your request "${input.subject}":`,
      '',
      `  ${amount} plus applicable GST`,
      ...(input.quoteNote ? ['', input.quoteNote] : []),
      '',
      'Nothing starts until you approve it — open your portal to approve, or reply there with questions.',
      '',
      `Approve or discuss here: ${input.portalUrl}`,
      '',
      `Your reference is ${reference}.`,
      ...signOff(),
    ].join('\n'),
    html: milestoneEmailHtml({
      preheader: 'Your quote is ready to review. Nothing starts until you approve it.',
      kicker: 'Quote ready',
      headline: 'Your quote<br>is ready to<br>review.',
      leadHeading: 'We have scoped your request.',
      leadBody: `"${excerpt(input.subject, 80)}" — ${amount} plus applicable GST.${input.quoteNote ? ` ${excerpt(input.quoteNote, 220)}` : ''} Nothing starts until you approve it on your portal, and questions are welcome first.`,
      detailLeftLabel: 'Quoted amount',
      detailLeftValue: `${amount} + GST`,
      detailRightLabel: 'Reference',
      detailRightValue: reference,
      ctaText: 'Review and approve',
      ctaHref: input.portalUrl,
      secondaryLine: contactLine(),
      footerNote: PORTAL_FOOTER,
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Studio replied                                                      */
/* ------------------------------------------------------------------ */

export function ticketReplyEmail(input: {
  name: string;
  /** The ticket's subject — client-typed originally, escaped slots only. */
  subject: string;
  /** The studio's reply. Full text in the plain body; an excerpt in the HTML. */
  replyBody: string;
  ticketId: string;
  portalUrl: string;
}): PortalMail {
  const reference = shortReference(input.ticketId);

  return {
    subject: `New reply on your ticket (${reference}) — Digi Hook`,
    body: [
      `Hi ${firstName(input.name)},`,
      '',
      `We have replied on "${input.subject}":`,
      '',
      input.replyBody,
      '',
      `Reply to us here: ${input.portalUrl}`,
      ...signOff(),
    ].join('\n'),
    html: milestoneEmailHtml({
      preheader: 'The team has replied on your ticket. Read and answer on your portal.',
      kicker: 'New reply',
      headline: 'The team has<br>replied on<br>your ticket.',
      leadHeading: `On "${excerpt(input.subject, 80)}"`,
      leadBody: excerpt(input.replyBody),
      detailLeftLabel: 'Reference',
      detailLeftValue: reference,
      detailRightLabel: 'From',
      detailRightValue: 'Digi Hook',
      ctaText: 'View and reply',
      ctaHref: input.portalUrl,
      secondaryLine: contactLine(),
      footerNote: PORTAL_FOOTER,
    }),
  };
}
