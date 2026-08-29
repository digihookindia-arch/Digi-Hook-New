import { randomUUID } from 'crypto';
import { getDb } from './db';
import {
  AUDIT_PAGE_CAP,
  analyzePage,
  buildSummary,
  normalizeAuditPath,
  parseRobots,
  parseSitemapXml,
  robotsAllows,
  type AuditSummary,
  type PageFacts,
  type RobotsRules,
} from './seoAudit';

/**
 * The site auditor's fetch loop and storage. One row per run in seo_audits;
 * the findings live as JSON in the row's summary, and the new/resolved diff
 * is computed at read time from the two latest runs (lib/seoAudit.ts), so
 * there is no fix-state table to drift out of truth.
 *
 * The crawl is a guest on someone's production site, so it is deliberately
 * polite: it honours robots.txt, waits between requests, caps at
 * AUDIT_PAGE_CAP pages, and identifies itself.
 */

const USER_AGENT = 'DigiHookAudit/1.0 (+https://digihook.in)';
const FETCH_TIMEOUT_MS = 10_000;
const DELAY_BETWEEN_FETCHES_MS = 350;
/** A run still 'running' after this long crashed with its process. */
const STALE_RUN_MS = 2 * 60 * 60 * 1000;

export type AuditRun = {
  id: string;
  projectId: string;
  siteUrl: string;
  status: 'running' | 'done' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  pages: number;
  errors: number;
  warnings: number;
  notices: number;
  summary: AuditSummary | null;
};

type Row = {
  id: string;
  project_id: string;
  site_url: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  pages: number;
  errors: number;
  warnings: number;
  notices: number;
  summary: string;
};

function toRun(row: Row): AuditRun {
  let summary: AuditSummary | null = null;
  try {
    const parsed = JSON.parse(row.summary);
    if (parsed && Array.isArray(parsed.issues)) summary = parsed as AuditSummary;
  } catch {
    summary = null;
  }
  return {
    id: row.id,
    projectId: row.project_id,
    siteUrl: row.site_url,
    status: row.status === 'done' || row.status === 'failed' ? row.status : 'running',
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    pages: row.pages ?? 0,
    errors: row.errors ?? 0,
    warnings: row.warnings ?? 0,
    notices: row.notices ?? 0,
    summary,
  };
}

/**
 * A run whose process died leaves 'running' behind forever; reading is where
 * that is noticed, so reading is where it is settled — flipped to failed in
 * the database, not just in the returned object, or the one-run-at-a-time
 * guard would block every future audit.
 */
function settleStale(row: Row): Row {
  if (row.status !== 'running') return row;
  if (Date.now() - Date.parse(row.started_at) < STALE_RUN_MS) return row;
  getDb()
    .prepare(`UPDATE seo_audits SET status = 'failed', finished_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), row.id);
  return { ...row, status: 'failed', finished_at: new Date().toISOString() };
}

/** Newest first. The portal reads the top two: current report plus diff base. */
export async function listAudits(projectId: string, limit = 5): Promise<AuditRun[]> {
  const rows = getDb()
    .prepare(
      `SELECT * FROM seo_audits WHERE project_id = ?
        ORDER BY started_at DESC LIMIT ?`
    )
    .all(projectId, limit) as Row[];
  return rows.map(settleStale).map(toRun);
}

export async function latestAudit(projectId: string): Promise<AuditRun | null> {
  const [latest] = await listAudits(projectId, 1);
  return latest ?? null;
}

/* ── the crawl ─────────────────────────────────────────────────────────── */

/** Content types not worth downloading — the status alone is the finding. */
const BINARY_TYPE = /^(?:image|video|audio|font)\/|octet-stream|pdf|zip/i;

async function fetchText(
  url: string
): Promise<{ status: number; finalUrl: string; contentType: string; body: string | null }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const contentType = res.headers.get('content-type') ?? '';
    const body = res.ok && !BINARY_TYPE.test(contentType) ? await res.text() : null;
    if (body === null) await res.body?.cancel();
    return { status: res.status, finalUrl: res.url || url, contentType, body };
  } catch {
    return { status: 0, finalUrl: url, contentType: '', body: null };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sitemap page paths for the site — direct sitemaps plus one index level. */
async function collectSitemapPaths(origin: string, robots: RobotsRules): Promise<string[]> {
  const candidates = [...new Set([...robots.sitemaps, `${origin}/sitemap.xml`])].slice(0, 5);
  const paths = new Set<string>();
  const nested: string[] = [];

  for (const url of candidates) {
    const res = await fetchText(url);
    if (!res.body) continue;
    const { locs, isIndex } = parseSitemapXml(res.body);
    for (const loc of locs) {
      if (isIndex) nested.push(loc);
      else {
        const path = normalizeAuditPath(loc, origin + '/');
        if (path) paths.add(path);
      }
    }
    await sleep(DELAY_BETWEEN_FETCHES_MS);
  }

  for (const url of nested.slice(0, 5)) {
    const res = await fetchText(url);
    if (!res.body) continue;
    for (const loc of parseSitemapXml(res.body).locs) {
      const path = normalizeAuditPath(loc, origin + '/');
      if (path) paths.add(path);
    }
    await sleep(DELAY_BETWEEN_FETCHES_MS);
  }

  return [...paths];
}

/**
 * Crawls one site and returns its summary. BFS from the homepage plus every
 * sitemap URL, same host only, robots-respecting, capped and rate-limited.
 * Exported for the runner and for a future dry-run tool; everything it
 * returns is already shaped for storage.
 */
export async function crawlSite(siteUrl: string): Promise<AuditSummary> {
  const start = new URL(siteUrl);
  const origin = start.origin;

  const robotsRes = await fetchText(`${origin}/robots.txt`);
  // On any robots trouble (absent, blocked, down) crawl as allowed — the
  // absent-file default for a missing robots.txt.
  const robots = parseRobots(
    robotsRes.status === 200 ? (robotsRes.body ?? '') : '',
    'DigiHookAudit'
  );

  const sitemapPaths = await collectSitemapPaths(origin, robots);
  const fromSitemap = new Set(sitemapPaths);

  const startPath = normalizeAuditPath(start.href, origin + '/') ?? '/';
  const queue: string[] = [...new Set([startPath, ...sitemapPaths])];
  const queued = new Set(queue);
  const pages: PageFacts[] = [];

  // The homepage blocked by robots is worth saying out loud — an audit that
  // silently checks nothing would read as a passing audit.
  if (!robotsAllows(robots, startPath)) {
    return {
      siteUrl,
      pages: 0,
      completed: true,
      truncated: false,
      counts: { error: 1, warning: 0, notice: 0 },
      issues: [
        {
          fingerprint: `robots-blocked|${startPath}`,
          severity: 'error',
          check: 'robots-blocked',
          path: startPath,
          detail: 'robots.txt disallows crawling this site for our auditor.',
        },
      ],
    };
  }

  while (queue.length > 0 && pages.length < AUDIT_PAGE_CAP) {
    const path = queue.shift()!;
    if (!robotsAllows(robots, path)) continue;

    const res = await fetchText(origin + path);
    const finalPath = (() => {
      try {
        const final = new URL(res.finalUrl);
        return final.origin === origin && final.pathname !== path ? final.pathname : null;
      } catch {
        return null;
      }
    })();

    const facts: PageFacts = {
      path,
      status: res.status,
      analyzed: false,
      fromSitemap: fromSitemap.has(path),
      redirectedTo: finalPath,
      title: null,
      description: null,
      canonical: null,
      noindex: false,
      h1Count: 0,
      headingSkip: null,
      imagesWithoutAlt: 0,
      words: 0,
      lang: null,
      hasOgImage: false,
      jsonLdInvalid: false,
      mixedContent: 0,
      internalPaths: [],
    };

    if (res.status === 200 && res.body !== null && res.contentType.includes('text/html')) {
      Object.assign(facts, analyzePage(res.body, res.finalUrl), { analyzed: true });
      for (const target of facts.internalPaths) {
        if (!queued.has(target)) {
          queued.add(target);
          queue.push(target);
        }
      }
    }

    pages.push(facts);
    if (queue.length > 0 && pages.length < AUDIT_PAGE_CAP) {
      await sleep(DELAY_BETWEEN_FETCHES_MS);
    }
  }

  return buildSummary(siteUrl, pages, queue.length === 0);
}

/* ── the runner ────────────────────────────────────────────────────────── */

/** True when an audit is genuinely in flight for this project. */
export async function hasRunningAudit(projectId: string): Promise<boolean> {
  const rows = getDb()
    .prepare(`SELECT * FROM seo_audits WHERE project_id = ? AND status = 'running'`)
    .all(projectId) as Row[];
  return rows.map(settleStale).some((row) => row.status === 'running');
}

/**
 * Runs one audit start to finish and records it. Returns null without
 * touching anything when one is already running — the caller shows the run
 * in progress instead of stacking a second crawl on the same site.
 */
export async function runAudit(projectId: string, siteUrl: string): Promise<AuditRun | null> {
  if (await hasRunningAudit(projectId)) return null;

  const id = randomUUID();
  const startedAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO seo_audits (id, project_id, site_url, status, started_at)
       VALUES (?, ?, ?, 'running', ?)`
    )
    .run(id, projectId, siteUrl, startedAt);

  try {
    const summary = await crawlSite(siteUrl);
    getDb()
      .prepare(
        `UPDATE seo_audits
            SET status = 'done', finished_at = ?, pages = ?,
                errors = ?, warnings = ?, notices = ?, summary = ?
          WHERE id = ?`
      )
      .run(
        new Date().toISOString(),
        summary.pages,
        summary.counts.error,
        summary.counts.warning,
        summary.counts.notice,
        JSON.stringify(summary),
        id
      );
  } catch (err) {
    console.error('[seo] audit failed for', siteUrl, err);
    getDb()
      .prepare(`UPDATE seo_audits SET status = 'failed', finished_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id);
  }

  const row = getDb().prepare('SELECT * FROM seo_audits WHERE id = ?').get(id) as Row;
  return toRun(row);
}
