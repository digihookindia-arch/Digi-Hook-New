import { site } from './site';

/**
 * Outbound email.
 *
 * Deliberately provider-agnostic and dependency-free: Resend's API is a single
 * JSON POST, so there is nothing to install and swapping provider means
 * replacing one function rather than unpicking an SDK.
 *
 * With no credentials configured it logs the message instead of sending, and
 * `isEmailConfigured()` reports false so the dashboard can say so plainly. It
 * never pretends to have sent something it did not — a silent no-op here would
 * mean a client waiting on a proposal that was never emailed.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** Verified sender. Must be on a domain the provider has verified. */
const FROM = process.env.MAIL_FROM ?? `${site.name} <sales@digihook.in>`;

/** Where new-enquiry notifications land. */
export const STUDIO_INBOX = process.env.STUDIO_INBOX ?? 'sales@digihook.in';

export type Mail = {
  to: string;
  subject: string;
  /** Plain text. Kept text-only on purpose — it renders everywhere, never
   *  trips spam heuristics, and there is no template to keep in sync. */
  body: string;
  /** So a reply from the client reaches a human rather than the sender box. */
  replyTo?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.info(
      `[email] NOT SENT (no RESEND_API_KEY)\n  to: ${mail.to}\n  subject: ${mail.subject}\n\n${mail.body}\n`
    );
    return;
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [mail.to],
      subject: mail.subject,
      text: mail.body,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    // Surface the provider's reason — "email failed" alone is undebuggable.
    throw new Error(`Email send failed (${res.status}): ${await res.text()}`);
  }
}
