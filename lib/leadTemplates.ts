import { toWhatsappNumber } from './phone';

/**
 * The follow-up messages the studio sends a lead by hand.
 *
 * **These do not go through AiSensy, and must not.** AiSensy can only send a
 * template Meta has approved, and free text outside the 24-hour service window
 * is refused outright — so an automated chase would either be rejected or
 * would need a new approved template for every sentence. Instead each template
 * here builds a `wa.me` link that opens the studio's own WhatsApp with the
 * message already typed. A person reads the thread, edits the wording if the
 * conversation has moved on, and presses send.
 *
 * That is the point rather than a limitation. A lead marked "no response" has
 * already ignored one automated message; a second one, identical in tone,
 * teaches them the number is a robot. The template removes the typing, not the
 * judgement.
 *
 * Everything here is pure and free of `node:` imports, so the dashboard's
 * client components can render a preview using the same builders the links are
 * made from — the studio never sees one message and sends another. Same split
 * as `ticketRules` / `tickets`.
 */

export type TemplateKey =
  | 'first-touch'
  | 'no-response'
  | 'busy'
  | 'need-detail'
  | 'proposal-sent';

export type LeadContext = {
  name: string;
  /** What they said they wanted, e.g. "E commerce website". May be absent. */
  wants?: string;
  /** Set once a proposal exists, so the nudge can link to it. */
  proposalUrl?: string;
};

export type FollowUp = {
  key: TemplateKey;
  /** How the template reads in the picker. */
  label: string;
  /** When to reach for it, in the studio's own terms. */
  when: string;
  whatsapp: string;
  emailSubject: string;
  emailBody: string;
};

export const TEMPLATE_KEYS: TemplateKey[] = [
  'first-touch',
  'no-response',
  'busy',
  'need-detail',
  'proposal-sent',
];

/** The first name alone, which is how a WhatsApp message should open. */
function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first || 'there';
}

/**
 * Names what they asked for, or says nothing. "your website" is a safe
 * fallback; "your project" reads like a mail merge that lost its variable.
 */
function subject(wants?: string): string {
  const clean = (wants ?? '').trim();
  if (!clean) return 'your website';
  return clean.toLowerCase().includes('website') ? `your ${clean.toLowerCase()}` : `your ${clean.toLowerCase()} website`;
}

/** The studio's sign-off, the same on both channels. */
const SIGN_OFF = 'Digi Hook';

export function followUp(key: TemplateKey, lead: LeadContext): FollowUp {
  const you = firstName(lead.name);
  const what = subject(lead.wants);

  switch (key) {
    case 'first-touch':
      return {
        key,
        label: 'After the first call',
        when: 'You have spoken to them once and want to leave something in writing.',
        whatsapp: `Hi ${you}, this is ${SIGN_OFF} — thank you for your time on the call about ${what}. I will put together what we discussed and send it across. If anything changes in the meantime, just reply here.`,
        emailSubject: `${SIGN_OFF} — following up on our call`,
        emailBody: [
          `Hi ${you},`,
          '',
          `Thank you for your time on the call about ${what}.`,
          '',
          'I am putting together what we discussed and will send it across shortly. If there is anything you would like to add or change before then, just reply to this email.',
          '',
          'Best regards,',
          SIGN_OFF,
        ].join('\n'),
      };

    case 'no-response':
      return {
        key,
        label: 'No response yet',
        when: 'You have tried to reach them and heard nothing back.',
        // No guilt, no "just checking in for the third time". One clear
        // question they can answer in a word, and an easy way out — a lead
        // who says "not now" is worth more than one who stops reading.
        whatsapp: `Hi ${you}, ${SIGN_OFF} here about ${what}. I have not managed to reach you — would a call later this week suit you better? If the timing is not right, do say and I will leave it there.`,
        emailSubject: `${SIGN_OFF} — is this still something you are looking at?`,
        emailBody: [
          `Hi ${you},`,
          '',
          `I have tried to reach you about ${what} and have not managed to catch you.`,
          '',
          'Would a call later this week suit you better? And if the timing is not right at the moment, do say so — I will leave it there rather than keep chasing.',
          '',
          'Best regards,',
          SIGN_OFF,
        ].join('\n'),
      };

    case 'busy':
      return {
        key,
        label: 'They asked us to call later',
        when: 'They picked up but could not talk.',
        whatsapp: `Hi ${you}, ${SIGN_OFF} here — thank you for picking up earlier. When would be a good time to call you back about ${what}? Any time you name, I will work around it.`,
        emailSubject: `${SIGN_OFF} — when would be a good time to call?`,
        emailBody: [
          `Hi ${you},`,
          '',
          'Thank you for picking up earlier — I know I caught you at a busy moment.',
          '',
          `When would be a good time to call you back about ${what}? Name any time that suits and I will work around it.`,
          '',
          'Best regards,',
          SIGN_OFF,
        ].join('\n'),
      };

    case 'need-detail':
      return {
        key,
        label: 'Asking for what we need to quote',
        when: 'You are ready to price it and are missing the specifics.',
        whatsapp: `Hi ${you}, ${SIGN_OFF} here. To put a proper figure to ${what} I need two things: roughly how many pages you have in mind, and whether you need online payments. A one-line answer is plenty and I will send the proposal across.`,
        emailSubject: `${SIGN_OFF} — two quick things before I send a proposal`,
        emailBody: [
          `Hi ${you},`,
          '',
          `To put a proper figure to ${what}, there are two things I need from you:`,
          '',
          '  1. Roughly how many pages you have in mind.',
          '  2. Whether you need to take payments online.',
          '',
          'A one-line answer to each is plenty. I will send the proposal across once I have them.',
          '',
          'Best regards,',
          SIGN_OFF,
        ].join('\n'),
      };

    case 'proposal-sent':
      // The link is the whole message. Without one this still reads correctly
      // — a proposal can be sent before the dashboard knows its address.
      return {
        key,
        label: 'Nudge after the proposal',
        when: 'The proposal has gone and you have not heard back.',
        whatsapp: lead.proposalUrl
          ? `Hi ${you}, ${SIGN_OFF} here — did the proposal for ${what} reach you? You can read it here: ${lead.proposalUrl}. Happy to walk through any part of it on a call.`
          : `Hi ${you}, ${SIGN_OFF} here — did the proposal for ${what} reach you? Happy to walk through any part of it on a call.`,
        emailSubject: `${SIGN_OFF} — did the proposal reach you?`,
        emailBody: [
          `Hi ${you},`,
          '',
          `I wanted to check that the proposal for ${what} reached you.`,
          ...(lead.proposalUrl ? ['', `You can read it here: ${lead.proposalUrl}`] : []),
          '',
          'If any part of it needs explaining, or the scope is not quite right, I am happy to go through it on a call.',
          '',
          'Best regards,',
          SIGN_OFF,
        ].join('\n'),
      };
  }
}

/** Every template, built for one lead. */
export function followUps(lead: LeadContext): FollowUp[] {
  return TEMPLATE_KEYS.map((key) => followUp(key, lead));
}

/**
 * A link that opens WhatsApp with the message ready to send.
 *
 * Null when the number cannot be resolved — the same rule `sendWhatsapp` uses,
 * so an unreachable number is shown as unreachable rather than opening a chat
 * with a stranger.
 */
export function whatsappLink(
  phone: string | null | undefined,
  message: string
): string | null {
  const number = toWhatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * A mailto with the subject and body filled in. `encodeURIComponent` is
 * correct here rather than a query-string builder: a mailto body is full of
 * newlines and `&`, and both must survive as text.
 */
export function mailtoLink(
  email: string | null | undefined,
  subject: string,
  body: string
): string | null {
  const address = (email ?? '').trim();
  if (!address.includes('@')) return null;
  return `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}
