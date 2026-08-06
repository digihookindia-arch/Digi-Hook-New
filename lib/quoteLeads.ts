import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import type { QuoteAnswers, QuoteSource } from './quote';

/**
 * Persistence for /get-quote funnel leads, mirroring lib/enquiries.ts:
 * snake_case columns to camelCase fields, JSON blobs for the branching
 * answers and the ad-attribution source, list/detail promoted into columns.
 */

export type QuoteLeadStatus = 'new' | 'contacted' | 'quoted' | 'won' | 'lost';

export const QUOTE_LEAD_STATUSES: QuoteLeadStatus[] = [
  'new',
  'contacted',
  'quoted',
  'won',
  'lost',
];

export type QuoteLead = {
  id: string;
  createdAt: string;
  websiteType: string;
  name: string;
  business: string;
  phone: string;
  budgetAgreed: string;
  budget: string;
  contactTime: string;
  answers: QuoteAnswers;
  source: QuoteSource | null;
  status: QuoteLeadStatus;
};

type Row = {
  id: string;
  created_at: string;
  website_type: string;
  name: string;
  business: string;
  phone: string;
  budget_agreed: string;
  budget: string;
  contact_time: string;
  answers: string;
  source: string | null;
  status: string;
};

function rowToLead(row: Row): QuoteLead {
  return {
    id: row.id,
    createdAt: row.created_at,
    websiteType: row.website_type,
    name: row.name,
    business: row.business,
    phone: row.phone,
    budgetAgreed: row.budget_agreed,
    budget: row.budget,
    contactTime: row.contact_time,
    answers: JSON.parse(row.answers) as QuoteAnswers,
    source: row.source ? (JSON.parse(row.source) as QuoteSource) : null,
    status: (QUOTE_LEAD_STATUSES as string[]).includes(row.status)
      ? (row.status as QuoteLeadStatus)
      : 'new',
  };
}

export async function saveQuoteLead(input: {
  answers: QuoteAnswers;
  source?: QuoteSource;
}): Promise<QuoteLead> {
  const lead: QuoteLead = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    websiteType: String(input.answers.websiteType ?? ''),
    name: String(input.answers.name ?? ''),
    business: String(input.answers.business ?? ''),
    phone: String(input.answers.phone ?? ''),
    budgetAgreed: String(input.answers.budgetAgreed ?? ''),
    budget: String(input.answers.budget ?? ''),
    contactTime: String(input.answers.contactTime ?? ''),
    answers: input.answers,
    source: input.source ?? null,
    status: 'new',
  };

  getDb()
    .prepare(
      `INSERT INTO quote_leads
        (id, created_at, website_type, name, business, phone,
         budget_agreed, budget, contact_time, answers, source, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      lead.id,
      lead.createdAt,
      lead.websiteType,
      lead.name,
      lead.business,
      lead.phone,
      lead.budgetAgreed,
      lead.budget,
      lead.contactTime,
      JSON.stringify(lead.answers),
      lead.source ? JSON.stringify(lead.source) : null,
      lead.status
    );

  return lead;
}

export async function listQuoteLeads(): Promise<QuoteLead[]> {
  const rows = getDb()
    .prepare('SELECT * FROM quote_leads ORDER BY created_at DESC')
    .all() as Row[];
  return rows.map(rowToLead);
}

export async function newQuoteLeadCount(): Promise<number> {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM quote_leads WHERE status = 'new'")
    .get() as { n: number } | undefined;
  return row?.n ?? 0;
}

export async function setQuoteLeadStatus(id: string, status: QuoteLeadStatus): Promise<void> {
  getDb().prepare('UPDATE quote_leads SET status = ? WHERE id = ?').run(status, id);
}
