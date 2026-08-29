import { randomUUID } from 'crypto';
import { getDb } from './db';
import {
  cleanBody,
  cleanSubject,
  isTicketStatus,
  parseKind,
  type TicketAuthor,
  type TicketKind,
  type TicketStatus,
} from './ticketRules';

/**
 * Support tickets and feature requests raised from the client portal, plus
 * their threaded messages. Unlike the delivery lists (whole-list rewrites,
 * position as identity), tickets are append-only records with real ids and
 * per-record writes — a reply must never depend on rewriting the thread.
 *
 * The statuses, labels, caps and validators live in lib/ticketRules.ts,
 * which is crypto- and sqlite-free so the portal's client components can
 * import them; everything there is re-exported here for server callers.
 */

export * from './ticketRules';

export type Ticket = {
  id: string;
  projectId: string;
  clientId: string;
  kind: TicketKind;
  subject: string;
  status: TicketStatus;
  /** Stamped at creation from the support window; never rewritten. */
  outOfSupport: boolean;
  createdAt: string;
  updatedAt: string;
  lastSender: TicketAuthor;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  author: TicketAuthor;
  body: string;
  createdAt: string;
};

/* ── storage ───────────────────────────────────────────────────────────── */

type TicketRow = {
  id: string;
  project_id: string;
  client_id: string;
  kind: string;
  subject: string;
  status: string;
  out_of_support: number;
  created_at: string;
  updated_at: string;
  last_sender: string;
};

type MessageRow = {
  id: string;
  ticket_id: string;
  author: string;
  body: string;
  created_at: string;
};

function toTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    projectId: row.project_id,
    clientId: row.client_id,
    kind: parseKind(row.kind),
    subject: row.subject,
    status: isTicketStatus(row.status) ? row.status : 'open',
    outOfSupport: row.out_of_support === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSender: row.last_sender === 'studio' ? 'studio' : 'client',
  };
}

function toMessage(row: MessageRow): TicketMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    author: row.author === 'studio' ? 'studio' : 'client',
    body: row.body,
    createdAt: row.created_at,
  };
}

/**
 * The ticket row and its opening message are one write — BEGIN/COMMIT so a
 * crash between the two cannot leave a ticket with an empty thread.
 */
export async function createTicket(input: {
  projectId: string;
  clientId: string;
  kind: TicketKind;
  subject: string;
  body: string;
  outOfSupport: boolean;
}): Promise<Ticket> {
  const subject = cleanSubject(input.subject);
  const body = cleanBody(input.body);
  if (!subject || !body) throw new Error('A ticket needs a subject and a message.');

  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: randomUUID(),
    projectId: input.projectId,
    clientId: input.clientId,
    kind: parseKind(input.kind),
    subject,
    status: 'open',
    outOfSupport: input.outOfSupport,
    createdAt: now,
    updatedAt: now,
    lastSender: 'client',
  };

  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO tickets
         (id, project_id, client_id, kind, subject, status, out_of_support, created_at, updated_at, last_sender)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      ticket.id,
      ticket.projectId,
      ticket.clientId,
      ticket.kind,
      ticket.subject,
      ticket.status,
      ticket.outOfSupport ? 1 : 0,
      ticket.createdAt,
      ticket.updatedAt,
      ticket.lastSender
    );
    db.prepare(
      `INSERT INTO ticket_messages (id, ticket_id, author, body, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(randomUUID(), ticket.id, 'client', body, now);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return ticket;
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const row = getDb()
    .prepare('SELECT * FROM tickets WHERE id = ?')
    .get(id) as TicketRow | undefined;
  return row ? toTicket(row) : null;
}

/** Dashboard list: everything awaiting a studio reply first, then newest. */
export async function listTickets(): Promise<Ticket[]> {
  const rows = getDb()
    .prepare(
      `SELECT * FROM tickets
        ORDER BY (last_sender = 'client' AND status != 'closed') DESC, created_at DESC`
    )
    .all() as TicketRow[];
  return rows.map(toTicket);
}

export async function listTicketsForProject(
  projectId: string,
  kind: TicketKind
): Promise<Ticket[]> {
  const rows = getDb()
    .prepare(
      'SELECT * FROM tickets WHERE project_id = ? AND kind = ? ORDER BY created_at DESC'
    )
    .all(projectId, kind) as TicketRow[];
  return rows.map(toTicket);
}

/** Every ticket for a project, for the dashboard's per-project view. */
export async function listAllTicketsForProject(projectId: string): Promise<Ticket[]> {
  const rows = getDb()
    .prepare('SELECT * FROM tickets WHERE project_id = ? ORDER BY created_at DESC')
    .all(projectId) as TicketRow[];
  return rows.map(toTicket);
}

export async function listMessages(ticketId: string): Promise<TicketMessage[]> {
  const rows = getDb()
    .prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(ticketId) as MessageRow[];
  return rows.map(toMessage);
}

/**
 * Appending a message and moving the attention marker are one function on
 * purpose — no caller can add a reply without last_sender following it.
 */
export async function addMessage(
  ticketId: string,
  author: TicketAuthor,
  body: string
): Promise<TicketMessage | null> {
  const text = cleanBody(body);
  if (!text) return null;

  const now = new Date().toISOString();
  const message: TicketMessage = {
    id: randomUUID(),
    ticketId,
    author,
    body: text,
    createdAt: now,
  };

  const db = getDb();
  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO ticket_messages (id, ticket_id, author, body, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(message.id, message.ticketId, message.author, message.body, message.createdAt);
    db.prepare('UPDATE tickets SET last_sender = ?, updated_at = ? WHERE id = ?').run(
      author,
      now,
      ticketId
    );
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return message;
}

export async function setTicketStatus(id: string, status: TicketStatus): Promise<void> {
  if (!isTicketStatus(status)) return;
  getDb()
    .prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, new Date().toISOString(), id);
}

export type ActivityItem = {
  at: string;
  ticketId: string;
  subject: string;
  kind: TicketKind;
  /** raised = the ticket's opening message; replies keep their author. */
  type: 'raised' | 'studio_reply' | 'client_reply';
};

/**
 * The overview's recent-activity feed, distilled from the ticket threads.
 * The opening message shares its timestamp with the ticket row (one
 * transaction writes both), which is what separates "raised" from a reply.
 */
export async function recentActivityForProject(
  projectId: string,
  limit = 6
): Promise<ActivityItem[]> {
  const rows = getDb()
    .prepare(
      `SELECT m.created_at AS at, m.author AS author,
              (m.created_at = t.created_at) AS opening,
              t.id AS ticket_id, t.subject AS subject, t.kind AS kind
         FROM ticket_messages m
         JOIN tickets t ON t.id = m.ticket_id
        WHERE t.project_id = ?
        ORDER BY m.created_at DESC
        LIMIT ?`
    )
    .all(projectId, limit) as {
    at: string;
    author: string;
    opening: number;
    ticket_id: string;
    subject: string;
    kind: string;
  }[];

  return rows.map((row) => ({
    at: row.at,
    ticketId: row.ticket_id,
    subject: row.subject,
    kind: parseKind(row.kind),
    type:
      row.opening === 1
        ? 'raised'
        : row.author === 'studio'
          ? 'studio_reply'
          : 'client_reply',
  }));
}

/**
 * The dashboard badge: tickets where the client spoke last and the ticket is
 * not closed. Counting 'open' alone would go dark the moment a status changed
 * without an answer; this re-lights whenever a client replies.
 */
export async function ticketsAwaitingStudioCount(): Promise<number> {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM tickets WHERE last_sender = 'client' AND status != 'closed'"
    )
    .get() as { n: number };
  return row.n;
}
