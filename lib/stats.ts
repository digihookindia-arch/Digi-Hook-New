/**
 * Traffic numbers for the portal's overview, read from the self-hosted
 * GoatCounter on this same box (see the GoatCounter memory/runbook: service
 * on 127.0.0.1:8081, one site per client at <code>.stats.digihook.in).
 *
 * Everything degrades to null: GoatCounter down, token wrong, code missing —
 * the panel hides rather than showing an error to a client. Responses are
 * cached in-process for an hour; portal pages are force-dynamic and must not
 * hammer the stats service on every render.
 */

/**
 * Base URL of the stats vhost whose /s/<code>/ paths nginx maps onto
 * per-site Host headers (e.g. https://stats.digihook.in). Unset turns the
 * feature off. The mapping is used even from the same box because Node's
 * fetch strips a hand-set Host header (forbidden by the fetch spec) — nginx
 * sets it instead.
 */
const ORIGIN = (process.env.GOATCOUNTER_ORIGIN ?? '').replace(/\/$/, '');

export function isStatsConfigured(): boolean {
  return Boolean(ORIGIN);
}

export type SiteStats = {
  /** Page views across the window. */
  pageviews: number;
  /** One entry per day, oldest first — feeds the sparkline. */
  daily: number[];
  /** ISO dates bounding the window, for the panel's caption. */
  from: string;
  to: string;
};

/**
 * The pure half: GoatCounter's /api/v0/stats/total payload → panel model,
 * or null when the payload is not what the API documents. Negative or
 * missing day counts read as 0 — a chart must never render below its axis.
 */
export function shapeStats(payload: unknown, from: string, to: string): SiteStats | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const stats = (payload as { stats?: unknown }).stats;
  if (!Array.isArray(stats)) return null;

  const daily = stats.map((day) => {
    const n = Number((day as { daily?: unknown })?.daily);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  });

  const total = Number((payload as { total?: unknown }).total);
  const pageviews = Number.isFinite(total) && total > 0
    ? Math.floor(total)
    : daily.reduce((sum, n) => sum + n, 0);

  return { pageviews, daily, from, to };
}

type CacheEntry = { at: number; stats: SiteStats | null };

declare global {
  // Survives module re-evaluation in dev, same trick as the db handle.
   
  var _dhStatsCache: Map<string, CacheEntry> | undefined;
}

const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Page views for one GoatCounter site over the last `days` days. Null on any
 * failure or when the feature is unconfigured.
 */
export async function fetchSiteStats(
  code: string,
  token: string,
  days = 30
): Promise<SiteStats | null> {
  if (!ORIGIN || !code || !token) return null;

  const cache = (global._dhStatsCache ??= new Map());
  const key = `${code}:${days}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.stats;

  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);

  let stats: SiteStats | null = null;
  try {
    const res = await fetch(
      `${ORIGIN}/s/${code}/api/v0/stats/total?start=${from}&end=${to}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.ok) stats = shapeStats(await res.json(), from, to);
    else console.error('[stats] GoatCounter answered', res.status, 'for site', code);
  } catch (err) {
    console.error('[stats] GoatCounter unreachable', err);
  }

  cache.set(key, { at: Date.now(), stats });
  return stats;
}
