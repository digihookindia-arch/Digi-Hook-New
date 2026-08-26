import { randomUUID } from 'crypto';
import { getDb } from './db';
import { sendEmail } from './email';
import type { MilestoneStep } from './emailTemplate';
import type { MilestoneMail } from './milestoneEmails';

/**
 * The record of every client-facing milestone email we have tried to send.
 *
 * This exists so the dashboard can answer three questions it currently cannot:
 * has this client been told, when, and did it actually work. Without it,
 * re-sending is guesswork, a failed acknowledgement is a console line nobody
 * reads, and toggling a proposal's accepted flag twice mails the client twice.
 *
 * Failures are rows too. A log of successes only would say nothing at the one
 * moment you need it — when a client insists they never received the proposal.
 */

export type SentEmail = {
  id: string;
  sentAt: string;
  stage: MilestoneStep;
  enquiryId: string | null;
  proposalSlug: string | null;
  leadId: string | null;
  toAddress: string;
  ok: boolean;
  error: string | null;
};

type Row = {
  id: string;
  sent_at: string;
  stage: number;
  enquiry_id: string | null;
  proposal_slug: string | null;
  lead_id: string | null;
  to_address: string;
  ok: number;
  error: string | null;
};

function toSentEmail(row: Row): SentEmail {
  return {
    id: row.id,
    sentAt: row.sent_at,
    stage: row.stage as MilestoneStep,
    enquiryId: row.enquiry_id,
    proposalSlug: row.proposal_slug,
    leadId: row.lead_id,
    toAddress: row.to_address,
    ok: row.ok === 1,
    error: row.error,
  };
}

/** Which client a milestone email belongs to. At least one must be set. */
export type MilestoneTarget = {
  enquiryId?: string | null;
  proposalSlug?: string | null;
  /** A /get-quote lead, which lives in its own table rather than as an enquiry. */
  leadId?: string | null;
};

/**
 * The whole send history for one client, newest first — both the enquiry's own
 * stages and those of any proposal drafted from it, so the dashboard renders
 * one timeline rather than two half-timelines.
 */
export async function listSends(target: MilestoneTarget): Promise<SentEmail[]> {
  const { enquiryId = null, proposalSlug = null, leadId = null } = target;
  if (!enquiryId && !proposalSlug && !leadId) return [];

  const rows = getDb()
    .prepare(
      `SELECT * FROM sent_emails
        WHERE (? IS NOT NULL AND enquiry_id = ?)
           OR (? IS NOT NULL AND proposal_slug = ?)
           OR (? IS NOT NULL AND lead_id = ?)
        ORDER BY sent_at DESC`
    )
    .all(enquiryId, enquiryId, proposalSlug, proposalSlug, leadId, leadId) as Row[];

  return rows.map(toSentEmail);
}

/**
 * Double-submit guard. A form posted twice in quick succession — a double
 * click, or a retried request — must not mail the client twice; a deliberate
 * re-send minutes later must still be allowed. Ten seconds separates the two
 * cases without ever standing between the studio and a resend it meant.
 */
const DEDUPE_WINDOW_MS = 10_000;

function sentVeryRecently(
  history: SentEmail[],
  stage: MilestoneStep,
  now: number
): boolean {
  return history.some(
    (s) =>
      s.stage === stage &&
      s.ok &&
      now - new Date(s.sentAt).getTime() < DEDUPE_WINDOW_MS
  );
}

export type SendResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

/**
 * Sends one milestone email and records the attempt.
 *
 * Never throws: a client-facing send that fails must leave a visible row and
 * an error the dashboard can show, not an exception that unwinds whatever the
 * studio was doing. Callers decide what to do with the result.
 */
export async function sendMilestone(input: {
  stage: MilestoneStep;
  to: string;
  mail: MilestoneMail;
  target: MilestoneTarget;
  /** Where a client's reply should land. Defaults to the studio inbox. */
  replyTo?: string;
}): Promise<SendResult> {
  const to = input.to.trim();
  if (!to) return { status: 'skipped', reason: 'No email address on file.' };

  const history = await listSends(input.target);
  if (sentVeryRecently(history, input.stage, Date.now())) {
    return { status: 'skipped', reason: 'Already sent moments ago.' };
  }

  let error: string | null = null;
  try {
    await sendEmail({
      to,
      subject: input.mail.subject,
      body: input.mail.body,
      html: input.mail.html,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Logging is best-effort in the other direction: a database write that fails
  // must not turn a delivered email into a reported failure.
  try {
    getDb()
      .prepare(
        `INSERT INTO sent_emails
           (id, sent_at, stage, enquiry_id, proposal_slug, lead_id, to_address, ok, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        new Date().toISOString(),
        input.stage,
        input.target.enquiryId ?? null,
        input.target.proposalSlug ?? null,
        input.target.leadId ?? null,
        to,
        error ? 0 : 1,
        error
      );
  } catch (e) {
    console.error('[milestone] email handled but the send log write failed', e);
  }

  return error ? { status: 'failed', error } : { status: 'sent' };
}

/** The most recent attempt at a stage, successful or not. */
export function lastSendOf(
  history: SentEmail[],
  stage: MilestoneStep
): SentEmail | null {
  return history.find((s) => s.stage === stage) ?? null;
}
