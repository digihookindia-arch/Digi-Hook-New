import { formatInr } from './money';
import { proposalRef } from './proposalDoc';
import { SITE_URL } from './site';
import type { HeaderName } from './whatsappHeader';
import type { WhatsappMessage } from './whatsapp';

/**
 * The four WhatsApp messages, one builder each.
 *
 * **This file is the only place the template variable order is written down**,
 * and that order is the whole risk. AiSensy fills `{{1}} {{2}} {{3}}`
 * positionally — no names, no keys, nothing to catch a transposition. Swap two
 * and a client is messaged an amount where their name should be. Each builder
 * therefore prints the template it matches, and the two must be changed
 * together.
 *
 * Templates are written and approved in AiSensy, not here. If a template is
 * edited to add or reorder a variable, the matching builder has to change in
 * the same pass or every message after it is wrong.
 *
 * Copy is deliberately short. These arrive on a phone, alongside messages from
 * family — the email carries the detail, and this carries the fact plus a link.
 *
 * Each carries a branded header image, which is the only place WhatsApp lets
 * the studio's design show: the body is plain text by Meta's rule, on every
 * plan. The image is brand furniture and identical for every recipient — see
 * `lib/whatsappHeader.tsx` for why nothing client-specific may go in one.
 *
 * **Only send `media` to a template that was approved with a media header.**
 * A template without one rejects the image, and a template with one rejects
 * its absence. If a template is approved as text-only, drop the `header`
 * argument for that builder rather than leaving a URL that will be refused.
 */

/** Where AiSensy fetches the header image for a given message. */
function header(name: HeaderName) {
  return { url: `${SITE_URL}/whatsapp/${name}.png`, filename: `${name}.png` };
}

/**
 * 1 · Proposal ready
 *
 *   Hi {{1}}, your proposal from Digi Hook is ready to read.
 *   {{2}}
 *   Access code: {{3}}
 */
export function proposalReadyWhatsapp(input: {
  name: string;
  phone: string;
  slug: string;
  accessCode: string;
}): WhatsappMessage {
  return {
    campaign: 'proposalReady',
    phone: input.phone,
    name: input.name,
    params: [
      firstName(input.name),
      `${SITE_URL}/proposals/${input.slug}`,
      input.accessCode,
    ],
    media: header('proposal-ready'),
  };
}

/**
 * 2 · Proposal accepted
 *
 *   Hi {{1}}, thank you for accepting your proposal. Our team will contact
 *   you within 24 hours.
 */
export function proposalAcceptedWhatsapp(input: {
  name: string;
  phone: string;
}): WhatsappMessage {
  return {
    campaign: 'proposalAccepted',
    phone: input.phone,
    name: input.name,
    params: [firstName(input.name)],
    media: header('proposal-accepted'),
  };
}

/**
 * 3 · Payment due
 *
 *   Hi {{1}}, a payment on your Digi Hook project is now due.
 *   {{2}} — {{3}}
 *   Pay securely: {{4}}
 *
 * `amount` is the GST-inclusive payable figure, because that is what leaves
 * their account. Never the quoted share.
 */
export function paymentDueWhatsapp(input: {
  name: string;
  phone: string;
  slug: string;
  milestoneLabel: string;
  payableInr: number;
}): WhatsappMessage {
  return {
    campaign: 'paymentDue',
    phone: input.phone,
    name: input.name,
    params: [
      firstName(input.name),
      input.milestoneLabel,
      formatInr(input.payableInr),
      `${SITE_URL}/proposals/${input.slug}/payment`,
    ],
    media: header('payment-due'),
  };
}

/**
 * 4 · Payment received
 *
 *   Hi {{1}}, we have received your payment of {{2}}. Tax invoice {{3}} is on
 *   its way to your email.
 *
 * The invoice PDF is not attached. AiSensy media needs a publicly reachable
 * URL, and a tax invoice carrying a client's name, address and GSTIN must not
 * have one — it goes by email, where it is addressed to a person.
 */
export function paymentReceivedWhatsapp(input: {
  name: string;
  phone: string;
  amountInr: number;
  invoiceNumber: string | null;
  slug: string;
}): WhatsappMessage {
  return {
    campaign: 'paymentReceived',
    phone: input.phone,
    name: input.name,
    params: [
      firstName(input.name),
      formatInr(input.amountInr),
      // A payment that could not be invoiced yet still deserves a confirmation;
      // it names the proposal instead of a number that does not exist.
      input.invoiceNumber ?? `for proposal ${proposalRef(input.slug)}`,
    ],
    media: header('payment-received'),
  };
}

/**
 * 5 · New lead — the automatic reply to a Meta lead-ad submission
 *
 *   Hi {{1}}, thank you for your enquiry with Digi Hook. So we can help
 *   properly — what exactly are you looking to build? Reply here and a
 *   member of our team will call you within one working day.
 *
 * One variable, and the message ends in a question on purpose. A lead-ad
 * submission is a name and a number with no context; the studio still has to
 * ring and ask what the person actually wants. Asking here means some of them
 * answer first, in writing, and the call starts from something.
 *
 * It arrives unprompted, so the template must be honest about who is writing
 * and give them a way to stop — which is Meta's rule as much as good manners.
 */
export function newLeadWhatsapp(input: {
  name: string;
  phone: string;
}): WhatsappMessage {
  return {
    campaign: 'newLead',
    phone: input.phone,
    name: input.name,
    params: [firstName(input.name)],
  };
}

/** "Hi Rajesh" reads better than "Hi Rajesh Kumar Sharma". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}
