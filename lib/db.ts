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
