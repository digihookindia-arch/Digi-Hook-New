import { randomUUID } from 'crypto';
import { getDb } from './db';
import type { Answers } from './enquiry';
import { cleanFollowUp, istNow, parseInstant } from './leadCrm';

/**
 * Enquiries captured by the public contact form.
 *
 * The form previously logged briefs to the server console and stored nothing,
 * so every lead was lost on restart. These rows are the studio's inbox and the
 * brief a proposal is drafted from.
 */

/**
 * Where a lead has got to. Drives the dashboard's filter and ordering.
 *
 * Extended 2026-09-07 with the states a salesperson actually needs: a lead
 * that will not answer the phone is neither "new" nor "lost", and calling it
 * either loses the distinction between someone to chase and someone to write
 * off.
 *
 * **Only ever add to this list.** Every value here is stored in the database
 * as a string; renaming one silently orphans every row already carrying it,
 * and `toEnquiry` would quietly reset those to 'new'.
 */
export type EnquiryStatus =
  | 'new'
  | 'reviewing'
  | 'no-response'
  | 'busy'
  | 'drafted'
  | 'proposal-sent'
  | 'won'
  | 'lost';

export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  'new',
  'reviewing',
  'no-response',
  'busy',
  'drafted',
  'proposal-sent',
  'won',
  'lost',
];

/** How each state reads in the dashboard. */
export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: 'New',
  reviewing: 'Talking',
  'no-response': 'No response',
  busy: 'Busy — call later',
  drafted: 'Proposal drafted',
  'proposal-sent': 'Proposal sent',
  won: 'Won',
  lost: 'Lost',
};

/** Where a lead came from. */
export type EnquirySource = 'website' | 'quote' | 'sheet' | 'manual';

export const ENQUIRY_SOURCE_LABELS: Record<EnquirySource, string> = {
  website: 'Website form',
  quote: 'Quote funnel',
  sheet: 'Meta lead ad',
  manual: 'Added by hand',
};

export type Enquiry = {
  id: string;
  createdAt: string;
  service: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  /** The pruned answer set, exactly as validated. */
  answers: Answers;
  /** Flattened label/value pairs, ready to render or paste into a brief. */
  summary: { label: string; value: string }[];
  status: EnquiryStatus;
  proposalSlug: string | null;
  /** Where it came from. Everything stored before this reads back 'website'. */
  source: EnquirySource;
  /**
   * The lead-ad row id, so re-importing a sheet updates rather than
   * duplicates. Null for anything that did not come from one.
   */
  externalId: string | null;
  /** When the automatic thank-you went out. Null means it has not. */
  welcomedAt: string | null;
  /**
   * When to ring them next - a naive local datetime, no zone. See
   * lib/leadCrm.ts. Null means nothing is booked.
   */
  followUpAt: string | null;
  /**
   * When the person enquired, as a UTC instant - which is not when we
   * stored the row. A sheet lead reaches us long after it was submitted.
   * Null for rows written before this existed; fall back to createdAt.
   */
  submittedAt: string | null;
};

type Row = {
  id: string;
  created_at: string;
  service: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  answers: string;
  summary: string;
  status: string;
  proposal_slug: string | null;
  source: string | null;
  external_id: string | null;
  welcomed_at: string | null;
  follow_up_at: string | null;
  submitted_at: string | null;
};

function toEnquiry(row: Row): Enquiry {
  return {
    id: row.id,
    createdAt: row.created_at,
    service: row.service,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    answers: JSON.parse(row.answers) as Answers,
    summary: JSON.parse(row.summary) as { label: string; value: string }[],
    // Checked against the list rather than cast: a status that no longer
    // exists must read as 'new' and be visible, not crash the dashboard.
    status: ENQUIRY_STATUSES.includes(row.status as EnquiryStatus)
      ? (row.status as EnquiryStatus)
      : 'new',
    proposalSlug: row.proposal_slug,
    source: ((): EnquirySource => {
      const s = row.source ?? 'website';
      return (['website', 'quote', 'sheet', 'manual'] as const).includes(
        s as EnquirySource
      )
        ? (s as EnquirySource)
        : 'website';
    })(),
    externalId: row.external_id,
    welcomedAt: row.welcomed_at,
    followUpAt: row.follow_up_at,
    submittedAt: row.submitted_at,
  };
}

export async function saveEnquiry(input: {
  service: string;
  name: string;
  email: string;
  phone: string;
  company?: string | null;
  answers: Answers;
  summary: { label: string; value: string }[];
  /** Defaults to the website form, which is where all of these began. */
  source?: EnquirySource;
  /** The lead-ad row id, when this came from the sheet. */
  externalId?: string | null;
  /**
   * When the person actually enquired, in whatever shape the source wrote it —
   * Meta's carries its ad account's zone. Absent for a form submitted here,
   * where the row is created the moment they press send.
   */
  submittedAt?: string | null;
}): Promise<Enquiry> {
  const createdAt = new Date().toISOString();
  const enquiry: Enquiry = {
    id: randomUUID(),
    createdAt,
    service: input.service,
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company?.trim() || null,
    answers: input.answers,
    summary: input.summary,
    status: 'new',
    proposalSlug: null,
    source: input.source ?? 'website',
    externalId: input.externalId ?? null,
    welcomedAt: null,
    followUpAt: null,
    submittedAt: parseInstant(input.submittedAt) ?? createdAt,
  };

  getDb()
    .prepare(
      `INSERT INTO enquiries
         (id, created_at, service, name, email, phone, company, answers, summary,
          status, proposal_slug, source, external_id, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      enquiry.id,
      enquiry.createdAt,
      enquiry.service,
      enquiry.name,
      enquiry.email,
      enquiry.phone,
      enquiry.company,
      JSON.stringify(enquiry.answers),
      JSON.stringify(enquiry.summary),
      enquiry.status,
      enquiry.proposalSlug,
      enquiry.source,
      enquiry.externalId,
      enquiry.submittedAt
    );

  return enquiry;
}

/**
 * Newest enquiry first — by when the person wrote to us, not by when we filed
 * the row. Those are the same thing for the website form and days apart for an
 * imported lead, and ordering by the wrong one buries a fresh lead underneath
 * a batch of old ones that happened to import a minute ago.
 *
 * COALESCE covers rows written before `submitted_at` existed.
 */
export async function listEnquiries(): Promise<Enquiry[]> {
  const rows = getDb()
    .prepare('SELECT * FROM enquiries ORDER BY COALESCE(submitted_at, created_at) DESC')
    .all() as Row[];
  return rows.map(toEnquiry);
}

export async function getEnquiry(id: string): Promise<Enquiry | null> {
  const row = getDb()
    .prepare('SELECT * FROM enquiries WHERE id = ?')
    .get(id) as Row | undefined;
  return row ? toEnquiry(row) : null;
}

/**
 * The enquiry a proposal was drafted from, if there was one. Most proposals
 * are typed straight into the dashboard and have no enquiry behind them, so
 * null is the normal case rather than an error.
 */
export async function getEnquiryByProposalSlug(
  slug: string
): Promise<Enquiry | null> {
  const row = getDb()
    .prepare('SELECT * FROM enquiries WHERE proposal_slug = ? LIMIT 1')
    .get(slug) as Row | undefined;
  return row ? toEnquiry(row) : null;
}

export async function setEnquiryStatus(
  id: string,
  status: EnquiryStatus
): Promise<void> {
  getDb().prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, id);
}

/**
 * Books the next call, or clears it when passed nothing.
 *
 * Validated at the write boundary rather than trusted from the form, because
 * an unparseable value stored here would read back as "no follow-up" and the
 * lead would drop off the call sheet silently — the one failure this field
 * exists to prevent.
 */
export async function setFollowUp(
  id: string,
  value: string | null | undefined
): Promise<void> {
  getDb()
    .prepare('UPDATE enquiries SET follow_up_at = ? WHERE id = ?')
    .run(cleanFollowUp(value), id);
}

/** Leads whose follow-up has come due, for the dashboard's own badge. */
export async function dueFollowUpCount(now: string = istNow()): Promise<number> {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM enquiries
       WHERE follow_up_at IS NOT NULL AND follow_up_at <= ?
         AND status NOT IN ('won', 'lost')`
    )
    .get(now) as { n: number };
  return row.n;
}

/** Called when a proposal is drafted from an enquiry, linking the two. */
export async function linkEnquiryToProposal(
  id: string,
  slug: string
): Promise<void> {
  getDb()
    .prepare("UPDATE enquiries SET proposal_slug = ?, status = 'drafted' WHERE id = ?")
    .run(slug, id);
}

export async function deleteEnquiry(id: string): Promise<void> {
  getDb().prepare('DELETE FROM enquiries WHERE id = ?').run(id);
}

/** Unread count for the dashboard nav. */
export async function newEnquiryCount(): Promise<number> {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM enquiries WHERE status = 'new'")
    .get() as { n: number };
  return row.n;
}

/* ── follow-up notes ────────────────────────────────────────────────────── */

export type EnquiryNote = {
  id: string;
  enquiryId: string;
  body: string;
  createdAt: string;
};

/**
 * Notes are append-only. A follow-up history that can be edited is one nobody
 * trusts, and the question this exists to answer — "what did we already tell
 * them?" — is only answerable if the earlier answers survive.
 */
export async function addEnquiryNote(
  enquiryId: string,
  body: string
): Promise<EnquiryNote | null> {
  const text = body.trim().slice(0, 2000);
  if (text.length < 2) return null;

  const note: EnquiryNote = {
    id: randomUUID(),
    enquiryId,
    body: text,
    createdAt: new Date().toISOString(),
  };
  getDb()
    .prepare(
      'INSERT INTO enquiry_notes (id, enquiry_id, body, created_at) VALUES (?, ?, ?, ?)'
    )
    .run(note.id, note.enquiryId, note.body, note.createdAt);
  return note;
}

export async function listEnquiryNotes(enquiryId: string): Promise<EnquiryNote[]> {
  const rows = getDb()
    .prepare(
      'SELECT * FROM enquiry_notes WHERE enquiry_id = ? ORDER BY created_at DESC'
    )
    .all(enquiryId) as {
    id: string;
    enquiry_id: string;
    body: string;
    created_at: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    enquiryId: r.enquiry_id,
    body: r.body,
    createdAt: r.created_at,
  }));
}

/** How many notes each lead carries, for the list view. */
export async function noteCounts(): Promise<Map<string, number>> {
  const rows = getDb()
    .prepare('SELECT enquiry_id, COUNT(*) AS n FROM enquiry_notes GROUP BY enquiry_id')
    .all() as { enquiry_id: string; n: number }[];
  return new Map(rows.map((r) => [r.enquiry_id, r.n]));
}

/**
 * Records that the automatic thank-you has gone out. Its own narrow write, and
 * guarded on the stamp still being null, so two imports racing the same new
 * row cannot both message the client. Returns true only for the write that won.
 */
export async function markWelcomed(id: string): Promise<boolean> {
  const result = getDb()
    .prepare('UPDATE enquiries SET welcomed_at = ? WHERE id = ? AND welcomed_at IS NULL')
    .run(new Date().toISOString(), id);
  return Number(result.changes) > 0;
}

/** Look a lead up by its Meta lead-ad row id, to avoid importing it twice. */
export async function getEnquiryByExternalId(
  externalId: string
): Promise<Enquiry | null> {
  const row = getDb()
    .prepare('SELECT * FROM enquiries WHERE external_id = ?')
    .get(externalId) as Row | undefined;
  return row ? toEnquiry(row) : null;
}
