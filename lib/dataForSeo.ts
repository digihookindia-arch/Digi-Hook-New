/**
 * DataForSEO — the paid data behind real Google rankings, the domain
 * standing ("appears in the top 100 for N searches") and the off-page
 * backlink numbers. Pay-as-you-go; every response names its own cost in
 * USD and lib/seoRecords.ts stores that figure per row, so the spend
 * ledger shows what was actually billed, not an estimate.
 *
 * Off — every panel says "being connected" — until DATAFORSEO_LOGIN /
 * DATAFORSEO_PASSWORD are set (the GSC_KEY_FILE pattern). Budget context:
 * the user approved up to USD 40/site/month; actual usage at 15 keywords
 * weekly + monthly snapshots is one to two dollars.
 */

const API = 'https://api.dataforseo.com/v3';
const LOGIN = process.env.DATAFORSEO_LOGIN ?? '';
const PASSWORD = process.env.DATAFORSEO_PASSWORD ?? '';

export function isRankDataConfigured(): boolean {
  return Boolean(LOGIN && PASSWORD);
}

/** Tracking profile: one country, one device (the plan's scope). */
export const DEFAULT_RANK_LOCATION = 'India';
const LANGUAGE_CODE = 'en';

/* ── pure helpers (tested in lib/seoAudit.test.ts) ─────────────────────── */

/** A hostname with its www. stripped — the unit rank matching works in. */
export function bareHost(host: string): string {
  return String(host ?? '').toLowerCase().replace(/^www\./, '');
}

/** Does a SERP result host belong to the client's site (subdomains count)? */
export function hostMatches(resultHost: string, siteHost: string): boolean {
  const result = bareHost(resultHost);
  const site = bareHost(siteHost);
  if (!result || !site) return false;
  return result === site || result.endsWith(`.${site}`);
}

/** The task cost the API reports, from either the envelope or the task. */
function costOf(payload: unknown): number {
  const top = Number((payload as { cost?: unknown })?.cost);
  if (Number.isFinite(top) && top > 0) return top;
  const task = Number(
    (payload as { tasks?: { cost?: unknown }[] })?.tasks?.[0]?.cost
  );
  return Number.isFinite(task) && task > 0 ? task : 0;
}

function firstResult(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const tasks = (payload as { tasks?: unknown }).tasks;
  if (!Array.isArray(tasks)) return undefined;
  const result = (tasks[0] as { result?: unknown } | undefined)?.result;
  return Array.isArray(result) ? result[0] : undefined;
}

export type RankResult = {
  /** Organic position (rank among organic results), null when not in the top 100. */
  position: number | null;
  url: string | null;
  cost: number;
};

/**
 * A SERP payload → where the site ranks, or null when the payload is not a
 * SERP response at all (which must read as "check failed", never as "not
 * ranked"). Position is DataForSEO's rank_group — the position among
 * organic results, the number every rank tracker reports — not
 * rank_absolute, which counts ads and SERP features and would make the
 * same ranking look worse from one week to the next.
 */
export function shapeRankResult(payload: unknown, siteHost: string): RankResult | null {
  const result = firstResult(payload);
  if (typeof result !== 'object' || result === null) return null;
  const items = (result as { items?: unknown }).items;
  if (items !== null && !Array.isArray(items)) return null;

  for (const item of items ?? []) {
    const entry = item as {
      type?: unknown;
      rank_group?: unknown;
      url?: unknown;
      domain?: unknown;
    };
    if (entry.type !== 'organic') continue;
    const domain =
      typeof entry.domain === 'string' && entry.domain
        ? entry.domain
        : (() => {
            try {
              return new URL(String(entry.url ?? '')).hostname;
            } catch {
              return '';
            }
          })();
    if (!hostMatches(domain, siteHost)) continue;
    const position = Number(entry.rank_group);
    return {
      position: Number.isFinite(position) && position > 0 ? Math.floor(position) : null,
      url: typeof entry.url === 'string' ? entry.url : null,
      cost: costOf(payload),
    };
  }
  return { position: null, url: null, cost: costOf(payload) };
}

export type BacklinksSummary = {
  backlinks: number;
  referringDomains: number;
  cost: number;
};

export function shapeBacklinksSummary(payload: unknown): BacklinksSummary | null {
  const result = firstResult(payload);
  if (typeof result !== 'object' || result === null) return null;
  const backlinks = Number((result as { backlinks?: unknown }).backlinks);
  const referring = Number((result as { referring_domains?: unknown }).referring_domains);
  if (!Number.isFinite(backlinks) || !Number.isFinite(referring)) return null;
  return {
    backlinks: Math.max(0, Math.floor(backlinks)),
    referringDomains: Math.max(0, Math.floor(referring)),
    cost: costOf(payload),
  };
}

export type DomainStanding = {
  /** Searches the domain appears for in Google's top 100 / top 10 / top 3. */
  keywordsTop100: number;
  keywordsTop10: number;
  keywordsTop3: number;
  cost: number;
};

/**
 * A Labs domain-rank-overview payload → the standing counts. The metrics
 * arrive as position buckets (pos_1, pos_2_3, pos_4_10, …); the top-N
 * figures are their sums.
 */
export function shapeDomainStanding(payload: unknown): DomainStanding | null {
  const result = firstResult(payload);
  const items = (result as { items?: unknown } | undefined)?.items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const organic = (items[0] as { metrics?: { organic?: unknown } }).metrics?.organic;
  if (typeof organic !== 'object' || organic === null) return null;

  const bucket = (key: string) => {
    const n = Number((organic as Record<string, unknown>)[key]);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  const top3 = bucket('pos_1') + bucket('pos_2_3');
  const top10 = top3 + bucket('pos_4_10');
  const count = Number((organic as Record<string, unknown>).count);

  return {
    keywordsTop100: Number.isFinite(count) && count > 0 ? Math.floor(count) : top10,
    keywordsTop10: top10,
    keywordsTop3: top3,
    cost: costOf(payload),
  };
}

/* ── the calls ─────────────────────────────────────────────────────────── */

async function dfsPost(path: string, task: Record<string, unknown>): Promise<unknown | null> {
  if (!isRankDataConfigured()) return null;
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([task]),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.error('[dataforseo]', path, 'answered', res.status);
      return null;
    }
    const payload = (await res.json()) as { status_code?: number; status_message?: string };
    // 20000 is DataForSEO's "Ok."; anything else is an account/request fault.
    if (payload.status_code !== 20000) {
      console.error('[dataforseo]', path, 'status', payload.status_code, payload.status_message);
      return null;
    }
    return payload;
  } catch (err) {
    console.error('[dataforseo]', path, 'unreachable', err);
    return null;
  }
}

/** Where one keyword ranks for the site, checked live at depth 100. */
export async function fetchRankCheck(
  keyword: string,
  siteHost: string,
  location: string
): Promise<RankResult | null> {
  const payload = await dfsPost('/serp/google/organic/live/advanced', {
    keyword,
    location_name: location || DEFAULT_RANK_LOCATION,
    language_code: LANGUAGE_CODE,
    device: 'mobile',
    depth: 100,
  });
  return payload ? shapeRankResult(payload, siteHost) : null;
}

export async function fetchBacklinksSummary(
  siteHost: string
): Promise<BacklinksSummary | null> {
  const payload = await dfsPost('/backlinks/summary/live', {
    target: bareHost(siteHost),
    include_subdomains: true,
  });
  return payload ? shapeBacklinksSummary(payload) : null;
}

export async function fetchDomainStanding(
  siteHost: string,
  location: string
): Promise<DomainStanding | null> {
  const payload = await dfsPost('/dataforseo_labs/google/domain_rank_overview/live', {
    target: bareHost(siteHost),
    location_name: location || DEFAULT_RANK_LOCATION,
    language_code: LANGUAGE_CODE,
  });
  return payload ? shapeDomainStanding(payload) : null;
}
