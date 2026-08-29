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

/* ── priority ──────────────────────────────────────────────────────────── */

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Client-facing labels with plain-language guidance — no P0 jargon. */
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  urgent: 'Urgent — the site or a key function is down',
  high: 'High — something important is broken',
  normal: 'Normal — a bug or correction, not blocking',
  low: 'Low — a question or nice-to-have',
};

/** Short form for pills and lists. */
export const PRIORITY_SHORT: Record<TicketPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

export function parsePriority(value: unknown): TicketPriority {
  return TICKET_PRIORITIES.includes(value as TicketPriority)
    ? (value as TicketPriority)
    : 'normal';
}

/* ── URLs and quotes ───────────────────────────────────────────────────── */

/**
 * A plain http(s) URL or null — shared by the ticket's affected-page field
 * and the project's site URL. Normalised without a trailing slash.
 */
export function cleanHttpUrl(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  try {
    const url = new URL(text.includes('://') ? text : `https://${text}`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

/** A whole rupee quote in a sane range, or null. */
export function cleanQuoteInr(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || n <= 0 || n > 100_000_000) return null;
  return Math.floor(n);
}

/* ── attachments ───────────────────────────────────────────────────────── */

export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const ATTACHMENTS_PER_MESSAGE = 3;

/** Allow-list, mime → the extension the file is stored under. */
export const ATTACHMENT_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** Null when acceptable, else a client-readable refusal. */
export function attachmentProblem(mime: string, size: number): string | null {
  if (!ATTACHMENT_TYPES[mime]) {
    return 'Only PNG, JPG, WebP images and PDF files can be attached.';
  }
  if (!Number.isFinite(size) || size <= 0) return 'That file looks empty.';
  if (size > ATTACHMENT_MAX_BYTES) return 'Attachments can be up to 5 MB each.';
  return null;
}
