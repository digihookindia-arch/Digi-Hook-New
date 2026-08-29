import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * Google Search Console for the portal's SEO workspace — clicks, impressions,
 * CTR, average position, top queries and top pages, straight from Google's
 * free Search Analytics API.
 *
 * Auth is a Google Cloud *service account*: GSC_KEY_FILE points at its JSON
 * key on disk, and the account's client_email must be added as a user on
 * each property it should read (that part is a human step in Search
 * Console's settings). The token exchange is the standard signed-JWT flow,
 * done with node:crypto — no SDK for one endpoint.
 *
 * The spec rules this module exists to keep: every figure names its source,
 * period and last sync — and missing data is never shown as zero. Anything
 * that fails (no key, no access, Google down, malformed payload) returns
 * null and the panel says "unavailable" instead of inventing a number.
 */

const KEY_FILE = process.env.GSC_KEY_FILE ?? '';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_ORIGIN = 'https://searchconsole.googleapis.com';

/** Days Google's search data runs behind — the window ends this far back. */
const DATA_LAG_DAYS = 3;
/** Reporting window length; the previous window of the same length is the comparison. */
export const SEARCH_WINDOW_DAYS = 28;

export function isSearchConsoleConfigured(): boolean {
  return Boolean(KEY_FILE);
}

/* ── pure helpers (tested in lib/seoAudit.test.ts) ─────────────────────── */

/**
 * A Search Console property as the API expects it: either a domain property
 * (`sc-domain:example.in`) or a URL-prefix property, which Google stores
 * *with* its trailing slash. Anything else is null — this string goes into
 * a request path, so nothing loose may pass.
 */
export function cleanGscProperty(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.toLowerCase().startsWith('sc-domain:')) {
    const domain = text.slice('sc-domain:'.length).trim().toLowerCase();
    return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain) ? `sc-domain:${domain}` : null;
  }
  try {
    const url = new URL(text.includes('://') ? text : `https://${text}`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.href.endsWith('/') ? url.href : `${url.href}/`;
  } catch {
    return null;
  }
}

/** The reporting windows, pinned to UTC dates so a run near midnight is stable. */
export function searchWindow(now = new Date()): {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
} {
  const day = 86_400_000;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const end = now.getTime() - DATA_LAG_DAYS * day;
  const start = end - (SEARCH_WINDOW_DAYS - 1) * day;
  return {
    from: iso(start),
    to: iso(end),
    prevFrom: iso(start - SEARCH_WINDOW_DAYS * day),
    prevTo: iso(start - day),
  };
}

export type SearchRow = {
  /** First dimension key — the query or the page URL; '' for totals rows. */
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * The API payload's rows, coerced and clamped — or null when the payload is
 * not shaped like the API documents, which must read as "unavailable", never
 * as an empty (zero) result. An empty rows array is genuine: a site can
 * truly have no impressions in a window.
 */
export function shapeSearchRows(payload: unknown): SearchRow[] | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const rows = (payload as { rows?: unknown }).rows;
  if (rows === undefined) return []; // Google omits `rows` entirely when there is no data.
  if (!Array.isArray(rows)) return null;

  const clamp = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  return rows.map((row) => {
    const keys = (row as { keys?: unknown }).keys;
    return {
      key: Array.isArray(keys) && typeof keys[0] === 'string' ? keys[0] : '',
      clicks: clamp((row as { clicks?: unknown }).clicks),
      impressions: clamp((row as { impressions?: unknown }).impressions),
      ctr: clamp((row as { ctr?: unknown }).ctr),
      position: clamp((row as { position?: unknown }).position),
    };
  });
}

export type SearchTotals = Omit<SearchRow, 'key'>;

export type SearchPerformance = SearchWindowData & {
  /** The current window; the previous window is the same length before it. */
  period: { from: string; to: string };
  /** When this data was pulled from Google — the "last sync" line. */
  fetchedAt: string;
};

/* ── service-account token ─────────────────────────────────────────────── */

type ServiceKey = { client_email: string; private_key: string };

declare global {
  // Survives module re-evaluation in dev, same trick as the db handle.
  var _dhGscToken: { token: string; expiresAt: number } | undefined;
  var _dhGscCache: Map<string, { at: number; data: SearchPerformance | null }> | undefined;
  var _dhGscMonthCache:
    | Map<string, { at: number; data: SearchWindowData | null }>
    | undefined;
}

function readServiceKey(): ServiceKey | null {
  if (!KEY_FILE) return null;
  try {
    const parsed = JSON.parse(readFileSync(KEY_FILE, 'utf8'));
    if (typeof parsed.client_email === 'string' && typeof parsed.private_key === 'string') {
      return parsed as ServiceKey;
    }
  } catch (err) {
    console.error('[gsc] could not read the service-account key file', err);
  }
  return null;
}

const b64url = (input: string | Buffer) =>
  Buffer.from(input).toString('base64url');

/** A bearer token for the readonly scope, cached until shortly before expiry. */
async function accessToken(): Promise<string | null> {
  const cached = global._dhGscToken;
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
  let assertion: string;
  try {
    const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key);
    assertion = `${unsigned}.${signature.toString('base64url')}`;
  } catch (err) {
    console.error('[gsc] signing the auth JWT failed — check the key file', err);
    return null;
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error('[gsc] token exchange answered', res.status, await res.text());
      return null;
    }
    const body = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) return null;
    global._dhGscToken = {
      token: body.access_token,
      // Renew five minutes early rather than ride the expiry boundary.
      expiresAt: Date.now() + Math.max(60, (body.expires_in ?? 3600) - 300) * 1000,
    };
    return body.access_token;
  } catch (err) {
    console.error('[gsc] token exchange unreachable', err);
    return null;
  }
}

/* ── queries ───────────────────────────────────────────────────────────── */

async function queryRows(
  token: string,
  property: string,
  body: Record<string, unknown>
): Promise<SearchRow[] | null> {
  try {
    const res = await fetch(
      `${API_ORIGIN}/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) {
      // 403 here usually means the service account was never added to the
      // property — a setup gap, not an outage. Same honest null either way.
      console.error('[gsc] query answered', res.status, 'for', property);
      return null;
    }
    return shapeSearchRows(await res.json());
  } catch (err) {
    console.error('[gsc] query unreachable for', property, err);
    return null;
  }
}

const CACHE_TTL_MS = 60 * 60 * 1000;

export type DailyPoint = { date: string; clicks: number; impressions: number };

/** Date-dimension rows → chronological daily points for the trend charts. */
export function shapeDailyPoints(rows: SearchRow[]): DailyPoint[] {
  return rows
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.key))
    .map((row) => ({ date: row.key, clicks: row.clicks, impressions: row.impressions }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type SearchWindowData = {
  totals: SearchTotals | null;
  previousTotals: SearchTotals | null;
  topQueries: SearchRow[];
  topPages: SearchRow[];
  pagesInSearch: number;
  /** One point per day of the window, oldest first — feeds the columns charts. */
  daily: DailyPoint[];
};

/**
 * The four queries every reading needs — window totals, the comparison
 * window, top queries and top pages. All four must succeed or the whole
 * reading is null: a half-real report is worse than an honest "unavailable".
 */
async function fetchWindowData(
  token: string,
  property: string,
  window: { from: string; to: string; prevFrom: string; prevTo: string }
): Promise<SearchWindowData | null> {
  const [totals, previous, queries, pages, byDate] = await Promise.all([
    queryRows(token, property, { startDate: window.from, endDate: window.to }),
    queryRows(token, property, { startDate: window.prevFrom, endDate: window.prevTo }),
    queryRows(token, property, {
      startDate: window.from,
      endDate: window.to,
      dimensions: ['query'],
      rowLimit: 10,
    }),
    queryRows(token, property, {
      startDate: window.from,
      endDate: window.to,
      dimensions: ['page'],
      rowLimit: 1000,
    }),
    queryRows(token, property, {
      startDate: window.from,
      endDate: window.to,
      dimensions: ['date'],
      rowLimit: 40,
    }),
  ]);

  if (
    totals === null ||
    previous === null ||
    queries === null ||
    pages === null ||
    byDate === null
  ) {
    return null;
  }
  return {
    totals: totals[0] ?? null,
    previousTotals: previous[0] ?? null,
    topQueries: queries,
    topPages: pages.slice(0, 10),
    pagesInSearch: pages.length,
    daily: shapeDailyPoints(byDate),
  };
}

/**
 * The live panel's data for one property, or null when anything failed.
 * Cached in-process for an hour; portal pages are force-dynamic and must
 * not spend four API calls per render.
 */
export async function fetchSearchPerformance(
  property: string
): Promise<SearchPerformance | null> {
  if (!isSearchConsoleConfigured() || !property) return null;

  const cache = (global._dhGscCache ??= new Map());
  const hit = cache.get(property);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const window = searchWindow();
  let data: SearchPerformance | null = null;

  const token = await accessToken();
  if (token) {
    const windowData = await fetchWindowData(token, property, window);
    if (windowData) {
      data = {
        period: { from: window.from, to: window.to },
        fetchedAt: new Date().toISOString(),
        ...windowData,
      };
    }
  }

  cache.set(property, { at: Date.now(), data });
  return data;
}

/**
 * One calendar month for the monthly report, with the month before as the
 * comparison. The caller supplies the bounds (lib/seoWork.ts owns the month
 * arithmetic); null on any failure, and the report then says "not readable
 * at generation" rather than storing zeros. Cached like the live window —
 * regenerating a draft twice in an hour should not double the API spend.
 */
export async function fetchMonthSearch(
  property: string,
  bounds: { from: string; to: string; prevFrom: string; prevTo: string }
): Promise<SearchWindowData | null> {
  if (!isSearchConsoleConfigured() || !property) return null;

  const cache = (global._dhGscMonthCache ??= new Map());
  const key = `${property}:${bounds.from}:${bounds.to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const token = await accessToken();
  const data = token ? await fetchWindowData(token, property, bounds) : null;
  cache.set(key, { at: Date.now(), data });
  return data;
}
