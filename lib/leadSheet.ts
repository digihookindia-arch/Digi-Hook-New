import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * Reads the studio's Meta lead-ad spreadsheet.
 *
 * Read-only, always. The sheet is written by Meta's lead-ad integration, not
 * by a person, and nothing here writes back: status, notes and follow-ups live
 * in this system. Two writers on one sheet means conflicts, and a deleted row
 * would be ambiguous between "lost lead" and "tidying up".
 *
 * Auth reuses the Search Console service account — the same JSON key file, a
 * second scope. Share the sheet with that key's `client_email` as a Viewer and
 * nothing else needs setting up. Dormant without `LEAD_SHEET_ID`, the rule
 * every other integration here follows.
 *
 * **Column names are configured, not guessed.** A Meta lead form's columns are
 * whatever the form was built with, in whatever language, and hard-coding
 * "Full Name" would break the first time somebody edits the form. The mapping
 * lives in the environment and is matched case-insensitively against the
 * header row.
 */

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const KEY_FILE = process.env.GSC_KEY_FILE ?? '';
const SHEET_ID = process.env.LEAD_SHEET_ID ?? '';
/** Tab name plus range, e.g. "Sheet1!A:Z". Defaults to the first tab. */
const RANGE = process.env.LEAD_SHEET_RANGE ?? 'A:Z';

/** Which header each field lives under. Set to match the actual sheet. */
const COLUMNS = {
  name: process.env.LEAD_SHEET_COL_NAME ?? 'full_name',
  email: process.env.LEAD_SHEET_COL_EMAIL ?? 'email',
  phone: process.env.LEAD_SHEET_COL_PHONE ?? 'phone_number',
  /** Meta's own row id. The dedupe key — without it nothing imports. */
  id: process.env.LEAD_SHEET_COL_ID ?? 'id',
  /** Optional extras, blank to ignore. */
  company: process.env.LEAD_SHEET_COL_COMPANY ?? '',
  service: process.env.LEAD_SHEET_COL_SERVICE ?? '',
  createdAt: process.env.LEAD_SHEET_COL_CREATED ?? 'created_time',
};

declare global {
  var _dhSheetToken: { token: string; expiresAt: number } | undefined;
}

export function isLeadSheetConfigured(): boolean {
  return Boolean(KEY_FILE && SHEET_ID);
}

/** What is missing, for the dashboard to report rather than fail silently. */
export function leadSheetBlockers(): string[] {
  const blockers: string[] = [];
  if (!KEY_FILE) blockers.push('GSC_KEY_FILE is not set (the service-account key).');
  if (!SHEET_ID) blockers.push('LEAD_SHEET_ID is not set.');
  return blockers;
}

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

/** The service account's address — what the sheet has to be shared with. */
export function serviceAccountEmail(): string | null {
  return readServiceKey()?.client_email ?? null;
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

/** A bearer token for the read-only Sheets scope, cached until near expiry. */
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

export type SheetLead = {
  externalId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  createdAt: string | null;
};

/** Headers are matched loosely: case, spaces and underscores do not matter. */
const normalise = (header: string) =>
  header.trim().toLowerCase().replace(/[\s_-]+/g, '');

/**
 * Turns the raw grid into leads, skipping anything unusable.
 *
 * Exported and pure so the mapping can be tested against a real header row
 * without a network call — which matters, because the columns are the part
 * most likely to be wrong.
 */
export function mapSheetRows(rows: string[][]): {
  leads: SheetLead[];
  skipped: number;
  headers: string[];
} {
  const [header, ...body] = rows;
  if (!header) return { leads: [], skipped: 0, headers: [] };

  const index = new Map(header.map((h, i) => [normalise(h), i]));
  const at = (row: string[], column: string): string => {
    if (!column) return '';
    const i = index.get(normalise(column));
    return i === undefined ? '' : (row[i] ?? '').trim();
  };

  const leads: SheetLead[] = [];
  let skipped = 0;

  for (const row of body) {
    const externalId = at(row, COLUMNS.id);
    const name = at(row, COLUMNS.name);
    // No id means no way to avoid importing it again tomorrow, and no name
    // means nothing to address. Either way it is not a lead we can work.
    if (!externalId || !name) {
      if (row.some((cell) => cell.trim())) skipped++;
      continue;
    }
    leads.push({
      externalId,
      name,
      email: at(row, COLUMNS.email),
      phone: at(row, COLUMNS.phone),
      company: at(row, COLUMNS.company),
      service: at(row, COLUMNS.service),
      createdAt: at(row, COLUMNS.createdAt) || null,
    });
  }

  return { leads, skipped, headers: header };
}

/**
 * Fetches the sheet. Returns null when it cannot be read at all — which the
 * caller must treat as "unknown", never as "no leads": importing nothing
 * because the token expired should not look like a quiet week.
 */
export async function fetchLeadSheet(): Promise<{
  leads: SheetLead[];
  skipped: number;
  headers: string[];
} | null> {
  if (!isLeadSheetConfigured()) return null;

  const token = await accessToken();
  if (!token) return null;

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}` +
    `/values/${encodeURIComponent(RANGE)}?majorDimension=ROWS`;

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
    return mapSheetRows(body.values ?? []);
  } catch (e) {
    console.error('[leads] sheet read failed', e);
    return null;
  }
}
