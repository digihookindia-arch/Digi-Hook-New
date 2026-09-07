import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * Reads the studio's Meta lead-ad spreadsheet.
 *
 * Read-only, always. The sheet is written by Meta's lead-ad integration, not
 * by a person, and nothing here writes back: status and notes live in this
 * system. Two writers on one sheet means conflicts, and a deleted row would be
 * ambiguous between "lost lead" and "tidying up".
 *
 * Two ways in, and the difference matters:
 *
 *  - **A service account** (`GSC_KEY_FILE`), the proper one. Share the sheet
 *    with the key's `client_email` as a Viewer and the sheet itself can stay
 *    private.
 *  - **The public CSV export**, used only when `LEAD_SHEET_PUBLIC_CSV` is set.
 *    It needs no credentials because it needs no permission — which is the
 *    problem: a sheet readable this way is readable by anyone holding the URL,
 *    and this one holds 67 people's names, emails and phone numbers. It is
 *    opt-in and warns on every run so the state cannot be forgotten.
 *
 * Column names are configured rather than hard-coded. A lead form's headers
 * are whatever it was built with, and they change when somebody edits the
 * form; the defaults below match the studio's current form.
 */

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const KEY_FILE = process.env.GSC_KEY_FILE ?? '';
const SHEET_ID = process.env.LEAD_SHEET_ID ?? '';
const TAB = process.env.LEAD_SHEET_TAB ?? 'Sheet2';
const PUBLIC_CSV = process.env.LEAD_SHEET_PUBLIC_CSV === 'true';

/** Which header each field lives under. Matched loosely — see `normalise`. */
const COLUMNS = {
  id: process.env.LEAD_SHEET_COL_ID ?? 'id',
  name: process.env.LEAD_SHEET_COL_NAME ?? 'full_name',
  email: process.env.LEAD_SHEET_COL_EMAIL ?? 'email',
  phone: process.env.LEAD_SHEET_COL_PHONE ?? 'phone_number',
  createdAt: process.env.LEAD_SHEET_COL_CREATED ?? 'created_time',
  platform: process.env.LEAD_SHEET_COL_PLATFORM ?? 'platform',
  campaign: process.env.LEAD_SHEET_COL_CAMPAIGN ?? 'campaign_name',
};

/**
 * The form's own questions, in the order they should read on the lead.
 *
 * These are what make an imported row worth working: a name and a number is a
 * cold call, but "an e-commerce site, live within two weeks" is a brief. They
 * become the enquiry summary, which is also what the Draft-proposal button
 * pastes in.
 */
const QUESTIONS: { column: string; label: string }[] = [
  { column: 'which_type_of_website_do_you_need?', label: 'Type of website' },
  { column: 'do_you_already_have_a_domain_name?', label: 'Has a domain' },
  { column: 'preferred_timeline_for_launching_the_website?', label: 'Timeline' },
  { column: 'any_special_features_you_are_looking_for?', label: 'Special features' },
];

declare global {
  var _dhSheetToken: { token: string; expiresAt: number } | undefined;
}

export function isLeadSheetConfigured(): boolean {
  return Boolean(SHEET_ID && (KEY_FILE || PUBLIC_CSV));
}

/** What is missing, for the dashboard to report rather than fail silently. */
export function leadSheetBlockers(): string[] {
  const blockers: string[] = [];
  if (!SHEET_ID) blockers.push('LEAD_SHEET_ID is not set.');
  if (!KEY_FILE && !PUBLIC_CSV) {
    blockers.push(
      'No way to read the sheet: set GSC_KEY_FILE to a service-account key (and share the sheet with it), or LEAD_SHEET_PUBLIC_CSV=true if the sheet is public.'
    );
  }
  return blockers;
}

/** True while the sheet is being read without any credentials at all. */
export function isReadingPublicly(): boolean {
  return Boolean(SHEET_ID && !KEY_FILE && PUBLIC_CSV);
}

/* ── service-account auth ───────────────────────────────────────────────── */

type ServiceKey = { client_email: string; private_key: string };

function readServiceKey(): ServiceKey | null {
  if (!KEY_FILE) return null;
  try {
    const key = JSON.parse(readFileSync(KEY_FILE, 'utf8')) as Partial<ServiceKey>;
    return key.client_email && key.private_key
      ? { client_email: key.client_email, private_key: key.private_key }
      : null;
  } catch (e) {
    console.error('[leads] could not read the service-account key', e);
    return null;
  }
}

/** The address the sheet has to be shared with. */
export function serviceAccountEmail(): string | null {
  return readServiceKey()?.client_email ?? null;
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

async function accessToken(): Promise<string | null> {
  const cached = global._dhSheetToken;
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const key = readServiceKey();
  if (!key) return null;

  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
    '.' +
    b64url(
      JSON.stringify({
        iss: key.client_email,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      })
    );

  try {
    const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key);
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${signature.toString('base64url')}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error('[leads] token exchange answered', res.status, await res.text());
      return null;
    }
    const body = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) return null;
    global._dhSheetToken = {
      token: body.access_token,
      expiresAt: Date.now() + ((body.expires_in ?? 3600) - 120) * 1000,
    };
    return body.access_token;
  } catch (e) {
    console.error('[leads] token exchange failed', e);
    return null;
  }
}

/* ── parsing ────────────────────────────────────────────────────────────── */

/**
 * A CSV parser, because the public export speaks CSV and the fields contain
 * commas. Handles quoted cells and doubled quotes; that is the whole of what
 * Google emits.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** Headers are matched loosely: case, spaces, underscores and ? do not matter. */
const normalise = (header: string) =>
  header.trim().toLowerCase().replace(/[\s_?-]+/g, '');

/**
 * Meta seeds every form with a test submission whose every answer reads
 * "<test lead: dummy data for …". Importing one would put a fake person in the
 * pipeline and, worse, send them a thank-you.
 */
function isTestLead(row: string[]): boolean {
  return row.some((cell) => cell.trim().toLowerCase().startsWith('<test lead'));
}

/** "e-commerce_website" is not something to show a client, or a colleague. */
export function humanise(value: string): string {
  const clean = value.trim().replace(/[_-]+/g, ' ');
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export type SheetLead = {
  externalId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string | null;
  /** Where the ad ran, and which campaign — useful attribution on the lead. */
  platform: string;
  campaign: string;
  /** The form's own questions and answers, ready to render as a brief. */
  answers: { label: string; value: string }[];
};

export type SheetRead = {
  leads: SheetLead[];
  /** Rows with content that could not be used — no id, or no name. */
  skipped: number;
  /** Meta's own seeded test submissions, deliberately ignored. */
  testLeads: number;
  headers: string[];
};

/**
 * Turns the raw grid into leads. Pure and exported so the mapping can be
 * tested against a real header row without a network call — the columns are
 * the part most likely to be wrong.
 */
export function mapSheetRows(rows: string[][]): SheetRead {
  const [header, ...body] = rows;
  if (!header) return { leads: [], skipped: 0, testLeads: 0, headers: [] };

  const index = new Map(header.map((h, i) => [normalise(h), i]));
  const at = (row: string[], column: string): string => {
    if (!column) return '';
    const i = index.get(normalise(column));
    return i === undefined ? '' : (row[i] ?? '').trim();
  };

  const leads: SheetLead[] = [];
  let skipped = 0;
  let testLeads = 0;

  for (const row of body) {
    // Sheets pads an export with blank rows. They are not a problem for
    // anybody to look into, so they are dropped without touching `skipped` —
    // that count exists to make somebody go and check the sheet.
    if (row.every((cell) => !cell.trim())) continue;

    if (isTestLead(row)) {
      testLeads++;
      continue;
    }

    const externalId = at(row, COLUMNS.id);
    const name = at(row, COLUMNS.name);
    // No id means no way to avoid importing it again tomorrow — and messaging
    // the person again with it. No name means nothing to address them by.
    if (!externalId || !name) {
      skipped++;
      continue;
    }

    leads.push({
      externalId,
      name,
      email: at(row, COLUMNS.email),
      phone: at(row, COLUMNS.phone),
      createdAt: at(row, COLUMNS.createdAt) || null,
      platform: at(row, COLUMNS.platform),
      campaign: at(row, COLUMNS.campaign),
      answers: QUESTIONS.map(({ column, label }) => ({
        label,
        value: humanise(at(row, column)),
      })).filter((a) => a.value),
    });
  }

  return { leads, skipped, testLeads, headers: header };
}

/**
 * Fetches the sheet. Returns null when it cannot be read at all — which the
 * caller must treat as "unknown", never as "no leads": importing nothing
 * because a token expired should not look like a quiet week.
 */
export async function fetchLeadSheet(): Promise<SheetRead | null> {
  if (!isLeadSheetConfigured()) return null;

  if (isReadingPublicly()) {
    console.warn(
      '[leads] reading the sheet with NO credentials (LEAD_SHEET_PUBLIC_CSV). ' +
        'Anyone with the URL can read every lead. Set GSC_KEY_FILE and make the sheet private.'
    );
    return fetchViaPublicCsv();
  }

  const token = await accessToken();
  if (!token) return null;

  const range = `${TAB}!A:Z`;
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}` +
    `/values/${encodeURIComponent(range)}?majorDimension=ROWS`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[leads] sheet read answered', res.status, detail.slice(0, 300));
      return null;
    }
    const body = (await res.json()) as { values?: string[][] };
    return mapSheetRows((body.values ?? []).filter((r) => r.some((c) => c.trim())));
  } catch (e) {
    console.error('[leads] sheet read failed', e);
    return null;
  }
}

async function fetchViaPublicCsv(): Promise<SheetRead | null> {
  const url =
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(SHEET_ID)}` +
    `/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TAB)}`;
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      console.error('[leads] public CSV read answered', res.status);
      return null;
    }
    const text = await res.text();
    // A sign-in page rather than data: the sheet is no longer public, which is
    // good news badly timed. Null, so it reads as "unknown" not "no leads".
    if (text.trimStart().startsWith('<')) {
      console.error('[leads] the sheet is no longer public — set GSC_KEY_FILE instead');
      return null;
    }
    return mapSheetRows(parseCsv(text));
  } catch (e) {
    console.error('[leads] public CSV read failed', e);
    return null;
  }
}
