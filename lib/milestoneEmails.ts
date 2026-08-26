import { milestoneEmailHtml, shortReference } from './emailTemplate';
import { site, SITE_URL, whatsappUrl } from './site';

/**
 * The four client-facing milestone emails, one builder each:
 *
 *   1. enquiryReceivedEmail      — the brief has landed
 *   2. instructionsReceivedEmail — we have spoken; the proposal is being written
 *   3. proposalCreatedEmail      — the written proposal is ready to read
 *   4. proposalAcceptedEmail     — accepted, work is starting
 *
 * Each returns everything `sendEmail` needs except `to`, so a caller writes
 * `sendEmail({ to: client.email, ...proposalCreatedEmail(...) })` and cannot
 * accidentally pair stage-3 copy with a stage-2 subject line.
 *
 * Every stage carries the same two contact routes, and only these two:
 * the office line for a call, and WhatsApp as the primary button. The
 * button is deliberately WhatsApp rather than a link back to the website —
 * at each of these moments the useful next action is talking to a person,
 * not browsing. Numbers live in `lib/site.ts`; never hardcode them here.
 *
 * `leadBody` is escaped by the shell. `headline` and `secondaryLine` are not
 * (they carry <br> and inline links) — so never interpolate raw client input
 * into those two.
 */

export type MilestoneMail = {
  subject: string;
  /** Plain-text fallback, sent alongside the HTML. */
  body: string;
  html: string;
};

/** First name only — "Hi Rajesh" reads better than "Hi Rajesh Kumar Sharma". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}

/** The shared sign-off block at the foot of every plain-text version. */
function signOff(): string[] {
  return [
    '',
    `Call us on ${site.phoneDisplay}, or message us on WhatsApp at ${site.whatsappDisplay}.`,
    '',
    '— The team at Digi Hook',
    site.addressLine,
  ];
}

/**
 * The line under the CTA button. Gives the phone number in every email, so a
 * client who does not use WhatsApp is never left without a way to reach us.
 */
function contactLine(): string {
  // hoursLine is written for the site ("Monday–Saturday, 10:00–19:00 IST") and
  // is used verbatim — lowercasing it to fit mid-sentence turns IST into "ist".
  return (
    `Prefer to talk? Call <a href="tel:${site.phoneHref}" style="color:#b02510;text-decoration:underline;">${site.phoneDisplay}</a>. ` +
    `We are here ${site.hoursLine}.`
  );
}

/* ------------------------------------------------------------------ */
/* 1 · Enquiry received                                                */
/* ------------------------------------------------------------------ */

export function enquiryReceivedEmail(input: {
  name: string;
  enquiryId: string;
}): MilestoneMail {
  const reference = shortReference(input.enquiryId);

  return {
    subject: 'We have your project brief — Digi Hook',
    body: [
      `Hi ${firstName(input.name)},`,
      '',
      'Thank you for sending your requirements. They have reached our team and nothing more is needed from you right now.',
      '',
      'What happens next: we read the brief properly, and send you a written proposal covering scope, the technology we would use and why, a stage-by-stage timeline and the costs. If anything in your brief needs a conversation first, we will call you on the number you gave us.',
      '',
      'You will hear from us within 24 hours.',
      '',
      `Your reference is ${reference}.`,
      ...signOff(),
    ].join('\n'),
    html: milestoneEmailHtml({
      preheader:
        'Your enquiry has reached us. A member of the team will reply within 24 hours — no action needed.',
      kicker: 'Enquiry received',
      headline: "We'll get back<br>to you within<br>24 hours.",
      leadHeading: 'Thank you for getting in touch.',
      leadBody:
        'Your enquiry has reached us and is with the team. Nothing is needed from you in the meantime — this email is your confirmation.',
      detailLeftLabel: 'Response time',
      detailLeftValue: '24 hours',
      detailRightLabel: 'Reference',
      detailRightValue: reference,
      step: 1,
      // Sent before we have spoken, so step 2 is still ahead of the client —
      // it reads as the call to come, not as instructions already taken.
      stepTwoLabel: 'Call scheduled',
      ctaText: 'Message us on WhatsApp',
      ctaHref: whatsappUrl(
        `Hello Digi Hook, I have just sent an enquiry (ref ${reference}).`
      ),
      secondaryLine: contactLine(),
    }),
  };
}

/* ------------------------------------------------------------------ */
/* 2 · Instructions received                                           */
/* ------------------------------------------------------------------ */

/**
 * Sent *after* the call, not to arrange one — it confirms we have spoken,
 * that the requirements are noted, and that the proposal is now being
 * written. So it goes out when the enquiry moves to "Reviewing", by which
 * point the conversation has already happened.
 */
export function instructionsReceivedEmail(input: {
  name: string;
  enquiryId: string;
  /**
   * Optional promised turnaround, e.g. "2 working days". Left out by default
   * on purpose — a date given here is a date the client will hold us to, so
   * it is only stated when someone has actually decided it.
   */
  turnaround?: string;
}): MilestoneMail {
  const reference = shortReference(input.enquiryId);
  const timing = input.turnaround
    ? `You will have it within ${input.turnaround}.`
    : 'It will be with you soon.';

  return {
    subject: 'Your instructions are noted — proposal on the way — Digi Hook',
    body: [
      `Hi ${firstName(input.name)},`,
      '',
      'Thank you for talking it through with us. Everything you asked for is noted, and we are writing your proposal now.',
      '',
      'It will cover the scope of work, the technology we would use and why, a stage-by-stage timeline, and the costs in full.',
      '',
      `${timing} Nothing is needed from you in the meantime.`,
      '',
      'If anything has changed since we spoke, or you remembered something afterwards, tell us now rather than later — it is much easier to include than to revise.',
      '',
      `Your reference is ${reference}.`,
      ...signOff(),
    ].join('\n'),
    html: milestoneEmailHtml({
      preheader:
        'We have discussed your requirements and noted them all. Your proposal is getting ready and will be with you soon.',
      kicker: 'Instructions received',
      headline: "We've noted it all.<br>Your proposal<br>is getting ready.",
      leadHeading: 'Thank you for talking it through.',
      leadBody:
        'Everything you asked for is noted, and your proposal is getting ready now — scope of work, the technology we would use and why, a stage-by-stage timeline, and the costs in full. It will be with you soon, and nothing is needed from you in the meantime. If anything has changed since we spoke, or you remembered something afterwards, tell us now rather than later — it is much easier to include than to revise.',
      detailLeftLabel: 'Proposal',
      detailLeftValue: input.turnaround ?? 'Coming soon',
      detailRightLabel: 'Reference',
      detailRightValue: reference,
      step: 2,
      ctaText: 'Something to add? WhatsApp us',
      ctaHref: whatsappUrl(
        `Hello Digi Hook, one more thing about my project (ref ${reference}) — `
      ),
      secondaryLine: contactLine(),
    }),
  };
}

/* ------------------------------------------------------------------ */
/* 3 · Proposal created                                                */
/* ------------------------------------------------------------------ */

export function proposalCreatedEmail(input: {
  name: string;
  /** Proposal slug — the URL is derived, never passed in pre-built. */
  slug: string;
  /** The code that unlocks the proposal page. Sent here on purpose: the
   *  link is unguessable and the code is what keeps a forwarded URL from
   *  exposing pricing. */
  accessCode: string;
}): MilestoneMail {
  const url = `${SITE_URL}/proposals/${input.slug}`;

  return {
    subject: 'Your proposal is ready — Digi Hook',
    body: [
      `Hi ${firstName(input.name)},`,
      '',
      'Your proposal is ready. It covers the scope of work, the technology we would use and why, a stage-by-stage timeline, and the costs in full.',
      '',
      `Read it here: ${url}`,
      `Access code: ${input.accessCode}`,
      '',
      'Take your time with it. If anything needs changing — scope, timeline or budget — tell us and we will revise it; that is a normal part of this, not an imposition.',
      ...signOff(),
    ].join('\n'),
    html: milestoneEmailHtml({
      preheader:
        'Scope, technology, timeline and costs — your proposal is ready to read. Access code included.',
      kicker: 'Proposal created',
      headline: 'Your proposal<br>is ready<br>to read.',
      leadHeading: 'Everything is written down.',
      leadBody:
        'Scope of work, the technology we would use and why, a stage-by-stage timeline, and the costs in full. Take your time with it — and if anything needs changing, tell us and we will revise it.',
      // The proposal link lives here as a button, next to the code that
      // unlocks it — the two are useless apart, so they sit together. The
      // price is deliberately not in this grid: the total belongs inside the
      // proposal, on the same page as the scope that justifies it.
      detailLeftLabel: 'Your proposal',
      detailLeftValue: 'Open proposal',
      detailLeftHref: url,
      detailRightLabel: 'Access code',
      detailRightValue: input.accessCode,
      step: 3,
      // Two buttons, two destinations — the proposal link is the one above,
      // so this one is not a second copy of it. Reading the proposal is the
      // client's first move; asking about it is the next.
      ctaText: 'Questions? WhatsApp us',
      ctaHref: whatsappUrl(
        `Hello Digi Hook, I have a question about my proposal (${input.slug}).`
      ),
      secondaryLine: contactLine(),
    }),
  };
}

/* ------------------------------------------------------------------ */
/* 4 · Proposal accepted                                               */
/* ------------------------------------------------------------------ */

export function proposalAcceptedEmail(input: {
  name: string;
  slug: string;
  /**
   * First phase name from the proposal timeline, e.g. "Discovery". Optional —
   * nothing guarantees a drafted proposal has a timeline, and naming a stage
   * that does not exist is worse than not naming one. When absent the email
   * simply says work has started.
   */
  firstPhase?: string;
}): MilestoneMail {
  const statusUrl = `${SITE_URL}/proposals/${input.slug}/status`;
  const phase = input.firstPhase?.trim();

  return {
    subject: 'Proposal accepted — we are starting work — Digi Hook',
    body: [
      `Hi ${firstName(input.name)},`,
      '',
      'Thank you for accepting the proposal. Work begins now.',
      '',
      `${phase ? `First up is ${phase}. ` : ''}We will be in touch shortly about anything we need from you — content, logins, brand files — and we will ask for it in one go rather than in a trickle.`,
      '',
      `You can follow progress against each stage here: ${statusUrl}`,
      '',
      'Same access code as before.',
      ...signOff(),
    ].join('\n'),
    html: milestoneEmailHtml({
      preheader:
        'Proposal accepted — work starts now. Follow every stage from your project status page.',
      kicker: 'Proposal accepted',
      headline: "That's agreed.<br>Work starts<br>now.",
      leadHeading: 'Thank you — we are underway.',
      leadBody:
        'We will be in touch shortly about anything we need from you — content, logins, brand files — asked for in one go rather than in a trickle. In the meantime you can follow progress against each stage on your project page, using the same access code as before.',
      detailLeftLabel: phase ? 'First stage' : 'Project',
      detailLeftValue: phase ?? 'Underway',
      detailRightLabel: 'Status',
      detailRightValue: 'In progress',
      step: 4,
      ctaText: 'Follow your project',
      ctaHref: statusUrl,
      secondaryLine:
        `Day-to-day questions are quickest on WhatsApp — <a href="${whatsappUrl(
          `Hello Digi Hook, about my project (${input.slug}) —`
        )}" style="color:#b02510;text-decoration:underline;">${site.whatsappDisplay}</a>. ` +
        `Or call <a href="tel:${site.phoneHref}" style="color:#b02510;text-decoration:underline;">${site.phoneDisplay}</a>.`,
    }),
  };
}
