import { randomUUID } from 'crypto';
import { getDb } from './db';
import type { Answers } from './enquiry';

/**
 * Enquiries captured by the public contact form.
 *
 * The form previously logged briefs to the server console and stored nothing,
 * so every lead was lost on restart. These rows are the studio's inbox and the
 * brief a proposal is drafted from.
 */

/** Where an enquiry has got to. Drives the dashboard's filter and ordering. */
export type EnquiryStatus = 'new' | 'reviewing' | 'drafted' | 'won' | 'lost';

export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  'new',
  'reviewing',
  'drafted',
  'won',
  'lost',
];

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
    status: row.status as EnquiryStatus,
    proposalSlug: row.proposal_slug,
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
}): Promise<Enquiry> {
  const enquiry: Enquiry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    service: input.service,
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company?.trim() || null,
    answers: input.answers,
    summary: input.summary,
    status: 'new',
    proposalSlug: null,
  };

  getDb()
    .prepare(
      `INSERT INTO enquiries
         (id, created_at, service, name, email, phone, company, answers, summary, status, proposal_slug)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      enquiry.proposalSlug
    );

  return enquiry;
}

export async function listEnquiries(): Promise<Enquiry[]> {
  const rows = getDb()
    .prepare('SELECT * FROM enquiries ORDER BY created_at DESC')
    .all() as Row[];
  return rows.map(toEnquiry);
}

export async function getEnquiry(id: string): Promise<Enquiry | null> {
  const row = getDb()
    .prepare('SELECT * FROM enquiries WHERE id = ?')
    .get(id) as Row | undefined;
  return row ? toEnquiry(row) : null;
}

export async function setEnquiryStatus(
  id: string,
  status: EnquiryStatus
): Promise<void> {
  getDb().prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, id);
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
