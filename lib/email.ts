import nodemailer from 'nodemailer';
import { site } from './site';

/**
 * Outbound email via the studio's own Hostinger mailbox (SMTP), not a
 * third-party API. digihook.in's DNS already carries Hostinger's DKIM, SPF
 * and DMARC records for this mailbox — riding on that existing, already-
 * verified authentication is more reliable than standing up a second
 * provider with its own separate domain verification.
 *
 * With no credentials configured it logs the message instead of sending, and
 * `isEmailConfigured()` reports false so the dashboard can say so plainly. It
 * never pretends to have sent something it did not — a silent no-op here would
 * mean a client waiting on a proposal that was never emailed.
 */

const SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.hostinger.com';
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

/** Verified sender. Must be the same mailbox as SMTP_USER — Hostinger rejects a mismatched From. */
const FROM = process.env.MAIL_FROM ?? `${site.name} <${site.email}>`;

/** Where new-enquiry notifications land. */
export const STUDIO_INBOX = process.env.STUDIO_INBOX ?? site.email;

export type Mail = {
  to: string;
  subject: string;
  /** Plain text. Always sent alongside `html` when present — the fallback
   *  for clients that don't render HTML, and it's what shows in the log
   *  when nothing is configured to actually send. */
  body: string;
  /** Rendered HTML, e.g. from lib/emailTemplate.ts. Optional — internal
   *  notifications to the studio stay plain text on purpose. */
  html?: string;
  /** So a reply from the client reaches a human rather than the sender box. */
  replyTo?: string;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // 465 is implicit TLS; 587 negotiates STARTTLS instead.
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(SMTP_USER && SMTP_PASS);
}

export async function sendEmail(mail: Mail): Promise<void> {
  if (!isEmailConfigured()) {
    console.info(
      `[email] NOT SENT (SMTP_USER/SMTP_PASS not set)\n  to: ${mail.to}\n  subject: ${mail.subject}\n\n${mail.body}\n`
    );
    return;
  }

  try {
    await getTransporter().sendMail({
      from: FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.body,
      ...(mail.html ? { html: mail.html } : {}),
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    });
  } catch (e) {
    // Surface the provider's reason — "email failed" alone is undebuggable.
    throw new Error(`Email send failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
