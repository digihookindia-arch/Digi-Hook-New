/**
 * The pure half of the ticket model: statuses, kinds, labels, caps and
 * validators. Deliberately free of node:crypto and node:sqlite so client
 * components (the portal's forms) can import it — the same discipline as
 * lib/delivery.ts. Storage lives in lib/tickets.ts, which re-exports all of
 * this for server-side callers.
 */

export const TICKET_STATUSES = ['open', 'in_progress', 'waiting_client', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_KINDS = ['support', 'feature'] as const;
export type TicketKind = (typeof TICKET_KINDS)[number];

export type TicketAuthor = 'client' | 'studio';

/** Client-facing wording, shared by the portal and the dashboard so both agree. */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_client: 'Waiting on you',
  closed: 'Closed',
};

export const TICKET_KIND_LABELS: Record<TicketKind, string> = {
  support: 'Support ticket',
  feature: 'Feature request',
};

export const TICKET_SUBJECT_MAX = 150;
export const TICKET_BODY_MAX = 5000;

export function parseKind(value: unknown): TicketKind {
  return TICKET_KINDS.includes(value as TicketKind) ? (value as TicketKind) : 'support';
}

export function isTicketStatus(value: unknown): value is TicketStatus {
  return TICKET_STATUSES.includes(value as TicketStatus);
}

/** Trimmed and capped, or null when nothing usable remains. */
export function cleanSubject(value: unknown): string | null {
  const text = String(value ?? '').trim().slice(0, TICKET_SUBJECT_MAX);
  return text === '' ? null : text;
}

export function cleanBody(value: unknown): string | null {
  const text = String(value ?? '').trim().slice(0, TICKET_BODY_MAX);
  return text === '' ? null : text;
}
