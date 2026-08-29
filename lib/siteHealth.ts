import { connect } from 'node:tls';

/**
 * The overview's website-status card: one cached HTTP check plus the TLS
 * certificate's expiry. Deliberately not a monitoring system — no schedule,
 * no incidents, no history. The portal asks "is it up right now?" at most
 * once per ten minutes per site, and anything uncertain reads as 'unknown'
 * rather than alarming a client with a false 'down'.
 */

export type SiteHealth = {
  state: 'operational' | 'problem' | 'unknown';
  httpStatus: number | null;
  responseMs: number | null;
  /** Days until the TLS certificate expires; null when it could not be read. */
  sslDaysLeft: number | null;
  checkedAt: string;
};

/** The pure classification, pinned by tests. */
export function classifyHealth(httpStatus: number | null): SiteHealth['state'] {
  if (httpStatus === null) return 'unknown';
  return httpStatus >= 200 && httpStatus < 400 ? 'operational' : 'problem';
}

/** Whole days from `nowMs` until `validToMs`; floors at 0. */
export function sslDaysLeft(validToMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((validToMs - nowMs) / 86_400_000));
}

/** The certificate's valid_to for an https host, or null on any trouble. */
function certExpiryMs(host: string): Promise<number | null> {
  return new Promise((resolve) => {
    const socket = connect(
      { host, port: 443, servername: host, timeout: 5000 },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        const ms = cert && cert.valid_to ? Date.parse(cert.valid_to) : NaN;
        resolve(Number.isFinite(ms) ? ms : null);
      }
    );
    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });
    socket.on('error', () => resolve(null));
  });
}

type CacheEntry = { at: number; health: SiteHealth };

declare global {
   
  var _dhHealthCache: Map<string, CacheEntry> | undefined;
}

const CACHE_TTL_MS = 10 * 60 * 1000;

export async function checkSite(siteUrl: string): Promise<SiteHealth> {
  const cache = (global._dhHealthCache ??= new Map());
  const hit = cache.get(siteUrl);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.health;

  let httpStatus: number | null = null;
  let responseMs: number | null = null;
  const started = Date.now();
  try {
    const res = await fetch(siteUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'DigiHookPortal/1.0 (+https://digihook.in)' },
      signal: AbortSignal.timeout(8000),
      // The status card must reflect right now, not a route cache.
      cache: 'no-store',
    });
    httpStatus = res.status;
    responseMs = Date.now() - started;
  } catch {
    // Timeout, DNS, refused — all read as unknown-to-problem below.
  }

  let ssl: number | null = null;
  try {
    const url = new URL(siteUrl);
    if (url.protocol === 'https:') {
      const validTo = await certExpiryMs(url.hostname);
      if (validTo !== null) ssl = sslDaysLeft(validTo, Date.now());
    }
  } catch {
    // A bad URL never reaches here (cleanSiteUrl gates storage), but stay safe.
  }

  const health: SiteHealth = {
    // A fetch failure with a working cert check is still a real problem;
    // with no signal at all, say 'unknown' honestly.
    state: httpStatus === null && ssl === null ? 'unknown' : classifyHealth(httpStatus ?? 599),
    httpStatus,
    responseMs,
    sslDaysLeft: ssl,
    checkedAt: new Date().toISOString(),
  };
  cache.set(siteUrl, { at: Date.now(), health });
  return health;
}
