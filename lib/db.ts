import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * SQLite storage, cached across hot reloads.
 *
 * Next.js re-evaluates modules on every edit in development, so a plain
 * module-level handle would open a new connection per reload and leak file
 * descriptors. Stashing it on `globalThis` keeps one handle per process.
 *
 * `node:sqlite` ships with Node (24+), so there is nothing to install and no
 * native module to compile — the whole database is one file on disk.
 */

const file = resolve(process.env.SQLITE_PATH ?? 'data/digihook.db');

declare global {
  // `var` is required here — `let`/`const` do not create a property on
  // globalThis, which is the whole point of this declaration.
  var _dhSqlite: DatabaseSync | undefined;
}

/**
 * Proposals are stored one row per proposal. `content` is the JSON blob Claude
 * returns — it is read and written whole, never queried into, so there is no
 * reason to spread it across columns.
 *
 * assets/milestones/stages are the studio's own working data, kept deliberately
 * separate from `content`: Claude writes the proposal, the studio tracks the
 * delivery, and a revision must never overwrite what has actually been paid.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS proposals (
    slug        TEXT PRIMARY KEY,
    client      TEXT NOT NULL,
    access_code TEXT NOT NULL,
    content     TEXT NOT NULL,
    brief       TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    assets      TEXT NOT NULL DEFAULT '[]',
    milestones  TEXT NOT NULL DEFAULT '[]',
    stages      TEXT NOT NULL DEFAULT '[]',
    accepted_at TEXT,
    assets_shared_at TEXT,
    budget      TEXT NOT NULL DEFAULT '',
    client_email TEXT NOT NULL DEFAULT '',
    client_phone TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS proposals_created_at ON proposals (created_at DESC);

  /*
   * Enquiries from the public contact form. The answers column is the pruned
   * branching answer set as JSON; name/email/phone/company are promoted out of
   * it into columns so the dashboard can list, search and mail on them without
   * parsing every row. proposal_slug is set once a proposal is drafted from it.
   */
  CREATE TABLE IF NOT EXISTS enquiries (
    id            TEXT PRIMARY KEY,
    created_at    TEXT NOT NULL,
    service       TEXT NOT NULL,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    phone         TEXT NOT NULL,
    company       TEXT,
    answers       TEXT NOT NULL,
    summary       TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'new',
    proposal_slug TEXT
  );
  CREATE INDEX IF NOT EXISTS enquiries_created_at ON enquiries (created_at DESC);
  CREATE INDEX IF NOT EXISTS enquiries_status ON enquiries (status);

  /*
   * Leads from the /get-quote ad funnel. Separate from enquiries because the
   * shape differs: budget is either an accepted range or a custom number, and
   * answers branch per website type. name/business/email/phone/budget are
   * promoted into columns so the dashboard lists without parsing JSON;
   * answers holds the full pruned set; source holds UTM/fbclid attribution.
   */
  CREATE TABLE IF NOT EXISTS quote_leads (
    id            TEXT PRIMARY KEY,
    created_at    TEXT NOT NULL,
    website_type  TEXT NOT NULL,
    name          TEXT NOT NULL,
    business      TEXT NOT NULL,
    email         TEXT NOT NULL DEFAULT '',
    phone         TEXT NOT NULL,
    budget_agreed TEXT NOT NULL,
    budget        TEXT NOT NULL,
    contact_time  TEXT NOT NULL,
    answers       TEXT NOT NULL,
    source        TEXT,
    status        TEXT NOT NULL DEFAULT 'new'
  );
  CREATE INDEX IF NOT EXISTS quote_leads_created_at ON quote_leads (created_at DESC);
  CREATE INDEX IF NOT EXISTS quote_leads_status ON quote_leads (status);

  /*
   * Client portal accounts (email + password login at /portal). Deliberately
   * unrelated to proposals and their access codes - the portal is its own
   * surface. password_hash is '' between the studio's invite and the client
   * first setting a password; that empty value is also what makes the
   * stateless set-password link single-use, because the link signs over the
   * current hash (see lib/auth.ts).
   */
  CREATE TABLE IF NOT EXISTS clients (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL
  );

  /*
   * One portal engagement per row - the page a client sees after logging in.
   * Every field is studio-entered from the dashboard; nothing derives from
   * proposals. Amounts are whole rupees; total_inr null means payments are
   * not set up yet and the portal hides that panel.
   */
  CREATE TABLE IF NOT EXISTS portal_projects (
    id            TEXT PRIMARY KEY,
    client_id     TEXT NOT NULL,
    business_name TEXT NOT NULL,
    live_at       TEXT,
    support_days  INTEGER NOT NULL DEFAULT 180,
    total_inr     INTEGER,
    paid_inr      INTEGER NOT NULL DEFAULT 0,
    site_url      TEXT,
    server_at     TEXT,
    server_days   INTEGER NOT NULL DEFAULT 365,
    stats_code    TEXT,
    stats_token   TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS portal_projects_client ON portal_projects (client_id);

  /*
   * Support tickets and feature requests raised from the portal. kind
   * separates the two tabs. out_of_support is stamped at creation from the
   * project's support window - editing the live date later must not rewrite
   * history. last_sender drives the dashboard badge: a ticket needs studio
   * attention whenever the client spoke last and it is not closed. The
   * opening message lives in ticket_messages like every reply, so the
   * thread renders uniformly.
   */
  CREATE TABLE IF NOT EXISTS tickets (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL,
    client_id      TEXT NOT NULL,
    kind           TEXT NOT NULL DEFAULT 'support',
    subject        TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'open',
    out_of_support INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    last_sender    TEXT NOT NULL DEFAULT 'client',
    priority       TEXT NOT NULL DEFAULT 'normal',
    page_url       TEXT,
    quote_inr      INTEGER,
    quote_note     TEXT NOT NULL DEFAULT '',
    quoted_at      TEXT,
    approved_at    TEXT,
    quote_paid_at  TEXT
  );
  CREATE INDEX IF NOT EXISTS tickets_created_at ON tickets (created_at DESC);
  CREATE INDEX IF NOT EXISTS tickets_status ON tickets (status);
  CREATE INDEX IF NOT EXISTS tickets_project ON tickets (project_id);

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id         TEXT PRIMARY KEY,
    ticket_id  TEXT NOT NULL,
    author     TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ticket_messages_ticket ON ticket_messages (ticket_id, created_at);

  /*
   * Screenshots and documents attached to ticket messages. The database
   * stores metadata only; the file itself lives on disk under data/uploads
   * (gitignored, same survival story as the SQLite file). No FK on purpose,
   * matching the rest of the ticket model.
   */
  CREATE TABLE IF NOT EXISTS ticket_attachments (
    id         TEXT PRIMARY KEY,
    ticket_id  TEXT NOT NULL,
    message_id TEXT NOT NULL,
    filename   TEXT NOT NULL,
    mime       TEXT NOT NULL,
    size       INTEGER NOT NULL,
    path       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ticket_attachments_ticket ON ticket_attachments (ticket_id);

  /*
   * Project documents the studio shares with the client - invoices, scope,
   * agreements, handover papers. Same storage split as attachments: file on
   * disk under data/uploads, metadata here.
   */
  CREATE TABLE IF NOT EXISTS documents (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title      TEXT NOT NULL,
    filename   TEXT NOT NULL,
    mime       TEXT NOT NULL,
    size       INTEGER NOT NULL,
    path       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS documents_project ON documents (project_id, created_at DESC);

  /*
   * One row per renewal reminder actually sent, keyed by what it reminded
   * about: the window's end date is part of the key, so extending a support
   * or server window naturally re-arms the whole reminder ladder for the
   * new date. The daily cron checks this before sending - reminders fire
   * once per band, never per day.
   */
  CREATE TABLE IF NOT EXISTS reminder_log (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    kind       TEXT NOT NULL,
    threshold  INTEGER NOT NULL,
    ends_on    TEXT NOT NULL,
    sent_at    TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS reminder_log_key
    ON reminder_log (project_id, kind, threshold, ends_on);

  /*
   * Every client-facing milestone email we have tried to send. One row per
   * attempt, failures included — a send that threw is exactly what the studio
   * needs to see, and a log that only records successes cannot answer "did
   * they ever get the proposal link?".
   *
   * Rows are keyed by whichever records the email belongs to: stages 1-2 to an
   * enquiry, stages 3-4 to a proposal, and a proposal drafted from an enquiry
   * carries both so one query returns the whole history for a client. lead_id
   * covers the /get-quote funnel, whose leads are their own table.
   */
  CREATE TABLE IF NOT EXISTS sent_emails (
    id            TEXT PRIMARY KEY,
    sent_at       TEXT NOT NULL,
    stage         INTEGER NOT NULL,
    enquiry_id    TEXT,
    proposal_slug TEXT,
    lead_id       TEXT,
    to_address    TEXT NOT NULL,
    ok            INTEGER NOT NULL,
    error         TEXT
  );
  CREATE INDEX IF NOT EXISTS sent_emails_enquiry ON sent_emails (enquiry_id, stage);
  CREATE INDEX IF NOT EXISTS sent_emails_proposal ON sent_emails (proposal_slug, stage);
  CREATE INDEX IF NOT EXISTS sent_emails_lead ON sent_emails (lead_id, stage);
`;

/**
 * CREATE TABLE IF NOT EXISTS is a no-op on a table that already exists, so a
 * column added to SCHEMA after the fact never reaches a database created
 * before it. This adds one if it is missing, which is the whole migration
 * story this app needs — columns are only ever added, never dropped or
 * retyped. ALTER TABLE ADD COLUMN requires a constant default, hence '[]'.
 */
function addColumnIfMissing(
  db: DatabaseSync,
  table: string,
  column: string,
  definition: string
): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  if (columns.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function getDb(): DatabaseSync {
  if (!global._dhSqlite) {
    mkdirSync(dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    // WAL keeps reads from blocking behind a write, which matters because every
    // dashboard page render reads while a draft may still be saving.
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec(SCHEMA);
    // Proposals stored before the delivery tabs existed predate these three.
    addColumnIfMissing(db, 'proposals', 'assets', "TEXT NOT NULL DEFAULT '[]'");
    addColumnIfMissing(db, 'proposals', 'milestones', "TEXT NOT NULL DEFAULT '[]'");
    addColumnIfMissing(db, 'proposals', 'stages', "TEXT NOT NULL DEFAULT '[]'");
    // Set when the client (or the studio, after a call) accepts the proposal.
    // Gates the What-we-need and Status tabs on the client-facing page.
    addColumnIfMissing(db, 'proposals', 'accepted_at', 'TEXT');
    // Set when the studio publishes the asset list. Until then an accepted
    // client sees "we will send this within 24 hours" rather than the
    // auto-seeded draft the studio has not looked at yet.
    addColumnIfMissing(db, 'proposals', 'assets_shared_at', 'TEXT');
    // The budget the team agreed with the client before drafting, so Claude
    // prices against a real figure instead of picking from the house list.
    // Proposals stored before this existed read back as ''.
    addColumnIfMissing(db, 'proposals', 'budget', "TEXT NOT NULL DEFAULT ''");
    // Added after the /get-quote funnel first shipped without an email field.
    addColumnIfMissing(db, 'quote_leads', 'email', "TEXT NOT NULL DEFAULT ''");
    // Where the proposal-ready and proposal-accepted emails go. Seeded from the
    // enquiry a proposal was drafted from, and typed in by hand otherwise —
    // proposals that predate this, or that were never linked to an enquiry,
    // read back as '' and the dashboard asks for an address before sending.
    addColumnIfMissing(db, 'proposals', 'client_email', "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing(db, 'proposals', 'client_phone', "TEXT NOT NULL DEFAULT ''");
    // Portal overview upgrade (Phase 1). The client's live site, so the portal
    // can show an uptime/SSL card and link the traffic panel to something real.
    addColumnIfMissing(db, 'portal_projects', 'site_url', 'TEXT');
    // Complimentary server window, same shape as the support plan: starts on
    // its own date (usually go-live) and runs server_days from there.
    addColumnIfMissing(db, 'portal_projects', 'server_at', 'TEXT');
    addColumnIfMissing(db, 'portal_projects', 'server_days', 'INTEGER NOT NULL DEFAULT 365');
    // GoatCounter site code + per-site API token for the traffic panel.
    // Null code hides the panel, the total_inr convention.
    addColumnIfMissing(db, 'portal_projects', 'stats_code', 'TEXT');
    addColumnIfMissing(db, 'portal_projects', 'stats_token', 'TEXT');
    // Ticket workflow upgrade (Phase 2): client-set priority and affected
    // page, and the quote-and-approve loop on feature requests. quoted_at /
    // approved_at / quote_paid_at are one-way timestamps, the accepted_at
    // pattern - history, not state to toggle.
    addColumnIfMissing(db, 'tickets', 'priority', "TEXT NOT NULL DEFAULT 'normal'");
    addColumnIfMissing(db, 'tickets', 'page_url', 'TEXT');
    addColumnIfMissing(db, 'tickets', 'quote_inr', 'INTEGER');
    addColumnIfMissing(db, 'tickets', 'quote_note', "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing(db, 'tickets', 'quoted_at', 'TEXT');
    addColumnIfMissing(db, 'tickets', 'approved_at', 'TEXT');
    addColumnIfMissing(db, 'tickets', 'quote_paid_at', 'TEXT');
    global._dhSqlite = db;
  }
  return global._dhSqlite;
}

/**
 * True when the dashboard can actually store proposals. SQLite needs no
 * configuration, so this only fails when the data directory is not writable.
 */
export function isDbConfigured(): boolean {
  try {
    getDb();
    return true;
  } catch {
    return false;
  }
}

/** Where the database lives, for the dashboard to show when something breaks. */
export const dbFile = file;
