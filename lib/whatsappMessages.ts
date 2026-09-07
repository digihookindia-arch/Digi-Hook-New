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
 *
 *   The access code is in the email we just sent you. Any questions, just
 *   reply here.
 *
 * **The access code is deliberately not sent here.** Meta rejected this
 * template while it read "Access code: {{3}}": anything resembling a one-time
 * code belongs to the AUTHENTICATION category, and a Utility template carrying
 * one is refused. The rule is worth agreeing with rather than working around —
 * an access code is a credential, and pushing a credential down a channel the
 * client did not ask for is the thing it exists to discourage. The email
 * carries it, addressed to a person.
 *
 * The closing line also keeps the body from ending on a variable, which Meta
 * rejects separately.
 */
export function proposalReadyWhatsapp(input: {
  name: string;
  phone: string;
  slug: string;
}): WhatsappMessage {
  return {
    campaign: 'proposalReady',
    phone: input.phone,
    name: input.name,
    params: [firstName(input.name), `${SITE_URL}/proposals/${input.slug}`],
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
 *   Already paid? Ignore this message.
 *
 * The closing line keeps the body from ending on a variable, which Meta
 * rejects, and spares a client who paid an hour ago the worry.
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
 *   Hi {{1}}, we have received your payment of {{2}}. Reference {{3}}.
 *   Your invoice follows by email.
 *
 * "Reference", not "Tax invoice", because a tax invoice is not always what
 * follows. When the studio GSTIN or the client's state is missing, the client
 * gets a plain receipt instead — and a message promising an invoice that never
 * arrives is the one kind of automated message worth not sending at all. One
 * neutral word covers both, so there is no second template to keep in step.
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
      // The invoice number where one exists, otherwise the proposal's own
      // reference in the studio's house format — both read correctly after the
      // word "Reference", which is why the template says that and not "Tax
      // invoice". The prefix is presentation only: this is deliberately NOT an
      // invoice number, because no invoice was raised. Real ones are issued by
      // `lib/invoices.ts`, numbered consecutively within the financial year as
      // Rule 46 requires (DH/26-27/0007), and a proposal reference dressed up
      // as one would be a number a client's accountant could not reconcile.
      input.invoiceNumber ?? `DH/${proposalRef(input.slug)}`,
    ],
    media: header('payment-received'),
  };
}

/**
 * 5 · New lead — the automatic reply to a Meta lead-ad submission
 *
 *   Hi {{1}}, thanks for your enquiry with Digi Hook about a {{2}}. One of
 *   our team will call you within one working day. If there is anything else
 *   you would like us to know before then, just reply here.
 *
 * It names what they asked for. The form already collects the website type, so
 * asking "what are you looking for?" would tell them plainly that nobody read
 * their answers — the single fastest way to lose a lead that arrived warm.
 *
 * It arrives unprompted, so the template must be honest about who is writing
 * and give them a way to stop — Meta's rule as much as good manners.
 */
export function newLeadWhatsapp(input: {
  name: string;
  phone: string;
  /** What they said they wanted, already humanised. */
  wants: string;
}): WhatsappMessage {
  return {
    campaign: 'newLead',
    phone: input.phone,
    name: input.name,
    // Falls back to "website" so the sentence still reads if the form ever
    // stops asking, rather than leaving a hole mid-message.
    params: [firstName(input.name), (input.wants || 'website').toLowerCase()],
  };
}

/** "Hi Rajesh" reads better than "Hi Rajesh Kumar Sharma". */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}
