import { randomUUID } from 'crypto';
import { getDb } from './db';
import {
  assembleReportData,
  cleanKeyword,
  KEYWORDS_CAP,
  monthBounds,
  movementBaseline,
  type ActivityInput,
  type DeliverableStatus,
  type ReportDeliverable,
  type SeoCategory,
  type SeoReportData,
} from './seoWork';
import { parseSeoCategory, parseDeliverableStatus } from './seoWork';
import { diffAudits } from './seoAudit';
import { latestDoneAuditBefore } from './seoAudits';
import { fetchMonthSearch, isSearchConsoleConfigured } from './searchConsole';
import { fetchPsiScores, type PsiScores } from './pageSpeed';
import {
  DEFAULT_RANK_LOCATION,
  fetchBacklinksSummary,
  fetchDomainStanding,
  fetchRankCheck,
  isRankDataConfigured,
} from './dataForSeo';
import type { PortalProject } from './portalProjects';

/**
 * Storage for the SEO work record — activity log, deliverables, monthly
 * reports (validation lives in lib/seoWork.ts). Every mutation is scoped by
 * id AND project_id, so a forged id from another project's form changes
 * nothing. Reports freeze their data at generation: `generateReport` reads
 * Search Console, the audit history and the month's work once, and the
 * stored snapshot is what the client sees forever after.
 */

/* ── activity log ──────────────────────────────────────────────────────── */

export type SeoActivity = {
  id: string;
  projectId: string;
  category: SeoCategory;
  work: string;
  reason: string;
  evidence: string;
  result: string;
  happenedOn: string;
  createdAt: string;
};

type ActivityRow = {
  id: string;
  project_id: string;
  category: string;
  work: string;
  reason: string;
  evidence: string;
  result: string;
  happened_on: string;
  created_at: string;
};

function toActivity(row: ActivityRow): SeoActivity {
  return {
    id: row.id,
    projectId: row.project_id,
    category: parseSeoCategory(row.category),
    work: row.work,
    reason: row.reason,
    evidence: row.evidence ?? '',
    result: row.result ?? '',
    happenedOn: row.happened_on,
    createdAt: row.created_at,
  };
}

export async function addActivity(
  projectId: string,
  input: ActivityInput
): Promise<SeoActivity> {
  const now = new Date().toISOString();
  const activity: SeoActivity = {
    id: randomUUID(),
    projectId,
    category: input.category,
    work: input.work,
    reason: input.reason,
    evidence: input.evidence,
    result: input.result,
    happenedOn: input.happenedOn ?? now.slice(0, 10),
    createdAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO seo_activities
         (id, project_id, category, work, reason, evidence, result, happened_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      activity.id,
      activity.projectId,
      activity.category,
      activity.work,
      activity.reason,
      activity.evidence,
      activity.result,
      activity.happenedOn,
      activity.createdAt
    );
  return activity;
}

export async function listActivities(projectId: string, limit = 50): Promise<SeoActivity[]> {
  const rows = getDb()
    .prepare(
      `SELECT * FROM seo_activities WHERE project_id = ?
        ORDER BY happened_on DESC, created_at DESC LIMIT ?`
    )
    .all(projectId, limit) as ActivityRow[];
  return rows.map(toActivity);
}

/** Work dated inside [from, to] — the month's entries for a report. */
export async function activitiesBetween(
  projectId: string,
  from: string,
  to: string
): Promise<SeoActivity[]> {
  const rows = getDb()
    .prepare(
      `SELECT * FROM seo_activities
        WHERE project_id = ? AND happened_on >= ? AND happened_on <= ?
        ORDER BY happened_on ASC, created_at ASC`
    )
    .all(projectId, from, to) as ActivityRow[];
  return rows.map(toActivity);
}

/** The result is often observable only weeks later — this fills it in. */
export async function setActivityResult(
  id: string,
  projectId: string,
  result: string
): Promise<void> {
  getDb()
    .prepare(`UPDATE seo_activities SET result = ? WHERE id = ? AND project_id = ?`)
    .run(result.replace(/\s+/g, ' ').trim().slice(0, 600), id, projectId);
}

export async function deleteActivity(id: string, projectId: string): Promise<void> {
  getDb()
    .prepare(`DELETE FROM seo_activities WHERE id = ? AND project_id = ?`)
    .run(id, projectId);
}

/* ── deliverables ──────────────────────────────────────────────────────── */

export type SeoDeliverable = {
  id: string;
  projectId: string;
  title: string;
  status: DeliverableStatus;
  waitingSince: string | null;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DeliverableRow = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  waiting_since: string | null;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

function toDeliverable(row: DeliverableRow): SeoDeliverable {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    status: parseDeliverableStatus(row.status) ?? 'planned',
    waitingSince: row.waiting_since,
    doneAt: row.done_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function addDeliverable(
  projectId: string,
  title: string
): Promise<SeoDeliverable | null> {
  const clean = title.replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!clean) return null;
  const now = new Date().toISOString();
  const deliverable: SeoDeliverable = {
    id: randomUUID(),
    projectId,
    title: clean,
    status: 'planned',
    waitingSince: null,
    doneAt: null,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO seo_deliverables (id, project_id, title, status, created_at, updated_at)
       VALUES (?, ?, ?, 'planned', ?, ?)`
    )
    .run(deliverable.id, projectId, clean, now, now);
  return deliverable;
}

export async function listDeliverables(projectId: string): Promise<SeoDeliverable[]> {
  const rows = getDb()
    .prepare(`SELECT * FROM seo_deliverables WHERE project_id = ? ORDER BY created_at ASC`)
    .all(projectId) as DeliverableRow[];
  return rows.map(toDeliverable);
}

/** What the overview's attention strip needs — items waiting on the client. */
export async function listWaitingDeliverables(projectId: string): Promise<SeoDeliverable[]> {
  const rows = getDb()
    .prepare(
      `SELECT * FROM seo_deliverables
        WHERE project_id = ? AND status = 'waiting_client'
        ORDER BY waiting_since ASC`
    )
    .all(projectId) as DeliverableRow[];
  return rows.map(toDeliverable);
}

/**
 * Moves a deliverable and keeps the two derived timestamps honest:
 * waiting_since survives while it stays waiting and clears when it leaves;
 * done_at is stamped on completion and cleared if work reopens.
 */
export async function setDeliverableStatus(
  id: string,
  projectId: string,
  status: DeliverableStatus
): Promise<void> {
  const row = getDb()
    .prepare(`SELECT * FROM seo_deliverables WHERE id = ? AND project_id = ?`)
    .get(id, projectId) as DeliverableRow | undefined;
  if (!row) return;

  const now = new Date().toISOString();
  const waitingSince =
    status === 'waiting_client' ? (row.status === 'waiting_client' ? row.waiting_since : now) : null;
  const doneAt = status === 'done' ? (row.status === 'done' ? row.done_at : now) : null;

  getDb()
    .prepare(
      `UPDATE seo_deliverables
          SET status = ?, waiting_since = ?, done_at = ?, updated_at = ?
        WHERE id = ? AND project_id = ?`
    )
    .run(status, waitingSince, doneAt, now, id, projectId);
}

export async function deleteDeliverable(id: string, projectId: string): Promise<void> {
  getDb()
    .prepare(`DELETE FROM seo_deliverables WHERE id = ? AND project_id = ?`)
    .run(id, projectId);
}

/* ── monthly reports ───────────────────────────────────────────────────── */

export type SeoReport = {
  id: string;
  projectId: string;
  month: string;
  status: 'draft' | 'published';
  summary: string;
  priorities: string;
  data: SeoReportData | null;
  generatedAt: string;
  publishedAt: string | null;
};

type ReportRow = {
  id: string;
  project_id: string;
  month: string;
  status: string;
  summary: string;
  priorities: string;
  data: string;
  generated_at: string;
  published_at: string | null;
};

function toReport(row: ReportRow): SeoReport {
  let data: SeoReportData | null = null;
  try {
    const parsed = JSON.parse(row.data);
    if (parsed && Array.isArray(parsed.activities)) data = parsed as SeoReportData;
  } catch {
    data = null;
  }
  return {
    id: row.id,
    projectId: row.project_id,
    month: row.month,
    status: row.status === 'published' ? 'published' : 'draft',
    summary: row.summary ?? '',
    priorities: row.priorities ?? '',
    data,
    generatedAt: row.generated_at,
    publishedAt: row.published_at,
  };
}

export async function getReport(id: string, projectId: string): Promise<SeoReport | null> {
  const row = getDb()
    .prepare(`SELECT * FROM seo_reports WHERE id = ? AND project_id = ?`)
    .get(id, projectId) as ReportRow | undefined;
  return row ? toReport(row) : null;
}

/** Newest month first. The portal shows only the published ones. */
export async function listReports(projectId: string): Promise<SeoReport[]> {
  const rows = getDb()
    .prepare(`SELECT * FROM seo_reports WHERE project_id = ? ORDER BY month DESC`)
    .all(projectId) as ReportRow[];
  return rows.map(toReport);
}

export async function listPublishedReports(projectId: string): Promise<SeoReport[]> {
  return (await listReports(projectId)).filter((report) => report.status === 'published');
}

/**
 * Builds the month's snapshot from real data and stores it as the draft.
 * Regenerating an existing draft refreshes its data (summary and priorities
 * are the studio's words and are left alone); a published month refuses —
 * published reports are immutable. Returns the report, or the refusal.
 */
export async function generateReport(
  project: PortalProject,
  month: string
): Promise<{ report: SeoReport } | { error: string }> {
  const existing = getDb()
    .prepare(`SELECT * FROM seo_reports WHERE project_id = ? AND month = ?`)
    .get(project.id, month) as ReportRow | undefined;
  if (existing && existing.status === 'published') {
    return { error: 'That month is already published. Published reports never change.' };
  }

  const bounds = monthBounds(month);

  // Search Console: null when unreadable, and the report says so — the
  // studio can regenerate once access lands, but zeros are never invented.
  const search =
    isSearchConsoleConfigured() && project.gscProperty
      ? await fetchMonthSearch(project.gscProperty, bounds)
      : null;

  // The site as of the month's end, and the movement across the month.
  const current = await latestDoneAuditBefore(project.id, bounds.endExclusive);
  const baseline = await latestDoneAuditBefore(project.id, bounds.from);
  const audit =
    current && current.summary
      ? {
          checkedAt: current.finishedAt ?? current.startedAt,
          pages: current.pages,
          counts: current.summary.counts,
          delta:
            baseline && baseline.summary && baseline.id !== current.id
              ? (() => {
                  const diff = diffAudits(current.summary!.issues, baseline.summary!.issues);
                  return {
                    newCount: diff.newFingerprints.size,
                    resolvedCount: diff.resolvedCount,
                  };
                })()
              : null,
        }
      : null;

  const activities = await activitiesBetween(project.id, bounds.from, bounds.to);
  const deliverables = await listDeliverables(project.id);
  const toReportShape = (d: SeoDeliverable): ReportDeliverable => ({
    title: d.title,
    status: d.status,
  });

  // Tracked-keyword positions at the month's end vs its start — read from
  // the stored check history, so regenerating later still tells the same
  // story the month actually had.
  const positionAsOf = getDb().prepare(
    `SELECT position FROM seo_rank_checks
      WHERE keyword_id = ? AND checked_on < ?
      ORDER BY checked_on DESC LIMIT 1`
  );
  const keywords = await listKeywords(project.id);
  const ranks = keywords
    .map((keyword) => {
      const atEnd = positionAsOf.get(keyword.id, bounds.endExclusive) as
        | { position: number | null }
        | undefined;
      const atStart = positionAsOf.get(keyword.id, bounds.from) as
        | { position: number | null }
        | undefined;
      if (!atEnd) return null;
      return {
        keyword: keyword.keyword,
        position: atEnd.position,
        prevPosition: atStart ? atStart.position : null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const offpageAsOf = getDb().prepare(
    `SELECT backlinks, referring_domains FROM seo_offpage
      WHERE project_id = ? AND checked_on < ?
      ORDER BY checked_on DESC LIMIT 1`
  );
  const offpageEnd = offpageAsOf.get(project.id, bounds.endExclusive) as
    | { backlinks: number; referring_domains: number }
    | undefined;
  const offpageStart = offpageAsOf.get(project.id, bounds.from) as
    | { backlinks: number; referring_domains: number }
    | undefined;

  const data = assembleReportData({
    search: search ? { property: project.gscProperty!, ...search } : null,
    audit,
    activities: activities.map((a) => ({
      category: a.category,
      work: a.work,
      reason: a.reason,
      evidence: a.evidence,
      result: a.result,
      happenedOn: a.happenedOn,
    })),
    deliverablesDone: deliverables
      .filter((d) => d.doneAt && d.doneAt >= bounds.from && d.doneAt < bounds.endExclusive)
      .map(toReportShape),
    deliverablesOpen: deliverables.filter((d) => d.status !== 'done').map(toReportShape),
    ranks: ranks.length > 0 ? ranks : null,
    offpage: offpageEnd
      ? {
          backlinks: offpageEnd.backlinks ?? 0,
          referringDomains: offpageEnd.referring_domains ?? 0,
          prevBacklinks: offpageStart ? (offpageStart.backlinks ?? 0) : null,
          prevReferringDomains: offpageStart ? (offpageStart.referring_domains ?? 0) : null,
        }
      : null,
  });

  const now = new Date().toISOString();
  const id = existing?.id ?? randomUUID();
  if (existing) {
    getDb()
      .prepare(
        `UPDATE seo_reports SET data = ?, generated_at = ?
          WHERE id = ? AND project_id = ? AND status = 'draft'`
      )
      .run(JSON.stringify(data), now, id, project.id);
  } else {
    getDb()
      .prepare(
        `INSERT INTO seo_reports (id, project_id, month, status, data, generated_at)
         VALUES (?, ?, ?, 'draft', ?, ?)`
      )
      .run(id, project.id, month, JSON.stringify(data), now);
  }

  const report = await getReport(id, project.id);
  return report ? { report } : { error: 'The report could not be stored.' };
}

/** The studio's words on a draft. Published reports are immutable. */
export async function saveReportText(
  id: string,
  projectId: string,
  summary: string,
  priorities: string
): Promise<void> {
  getDb()
    .prepare(
      `UPDATE seo_reports SET summary = ?, priorities = ?
        WHERE id = ? AND project_id = ? AND status = 'draft'`
    )
    .run(summary.trim().slice(0, 4000), priorities.trim().slice(0, 2000), id, projectId);
}

/** One-way, the accepted_at pattern. Returns false when it was not a draft. */
export async function publishReport(id: string, projectId: string): Promise<boolean> {
  const changes = getDb()
    .prepare(
      `UPDATE seo_reports SET status = 'published', published_at = ?
        WHERE id = ? AND project_id = ? AND status = 'draft'`
    )
    .run(new Date().toISOString(), id, projectId).changes;
  return changes > 0;
}

/** The only way a published report leaves — the mistake escape hatch. */
export async function deleteReport(id: string, projectId: string): Promise<void> {
  getDb()
    .prepare(`DELETE FROM seo_reports WHERE id = ? AND project_id = ?`)
    .run(id, projectId);
}

/* ── measurements: PageSpeed · keywords · ranks · off-page · standing ──── */

/**
 * Why every runner below returns a plain outcome string: they are called
 * from cron sweeps and fire-and-forget dashboard buttons, where a thrown
 * error would only vanish — a named outcome gets logged and counted.
 * Freshness guards live here so cron and button cannot double-spend; the
 * dashboard buttons pass force to override them deliberately.
 */
export type RunOutcome = 'done' | 'fresh' | 'failed' | 'not-configured' | 'no-url' | 'spend-cap';

const hoursAgo = (iso: string) => (Date.now() - Date.parse(iso)) / 3_600_000;
const today = () => new Date().toISOString().slice(0, 10);

/* PageSpeed */

export type PageSpeedSnapshot = {
  id: string;
  projectId: string;
  url: string;
  strategy: string;
  scores: PsiScores;
  fetchedAt: string;
};

type PsiRow = {
  id: string;
  project_id: string;
  url: string;
  strategy: string;
  performance: number | null;
  accessibility: number | null;
  best_practices: number | null;
  seo: number | null;
  fetched_at: string;
};

export async function latestPageSpeed(projectId: string): Promise<PageSpeedSnapshot | null> {
  const row = getDb()
    .prepare(
      `SELECT * FROM seo_pagespeed WHERE project_id = ?
        ORDER BY fetched_at DESC LIMIT 1`
    )
    .get(projectId) as PsiRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    url: row.url,
    strategy: row.strategy,
    scores: {
      performance: row.performance,
      accessibility: row.accessibility,
      bestPractices: row.best_practices,
      seo: row.seo,
    },
    fetchedAt: row.fetched_at,
  };
}

/** One PSI measurement, skipped while the last is under 20 hours old. */
export async function runPageSpeed(project: PortalProject): Promise<RunOutcome> {
  if (!project.siteUrl) return 'no-url';
  const latest = await latestPageSpeed(project.id);
  if (latest && hoursAgo(latest.fetchedAt) < 20) return 'fresh';

  const scores = await fetchPsiScores(project.siteUrl);
  if (!scores) return 'failed';
  getDb()
    .prepare(
      `INSERT INTO seo_pagespeed
         (id, project_id, url, strategy, performance, accessibility, best_practices, seo, fetched_at)
       VALUES (?, ?, ?, 'mobile', ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      project.id,
      project.siteUrl,
      scores.performance,
      scores.accessibility,
      scores.bestPractices,
      scores.seo,
      new Date().toISOString()
    );
  return 'done';
}

/* Tracked keywords */

export type SeoKeyword = {
  id: string;
  projectId: string;
  keyword: string;
  createdAt: string;
};

type KeywordRow = { id: string; project_id: string; keyword: string; created_at: string };

const toKeyword = (row: KeywordRow): SeoKeyword => ({
  id: row.id,
  projectId: row.project_id,
  keyword: row.keyword,
  createdAt: row.created_at,
});

export async function listKeywords(projectId: string): Promise<SeoKeyword[]> {
  const rows = getDb()
    .prepare(`SELECT * FROM seo_keywords WHERE project_id = ? ORDER BY created_at ASC`)
    .all(projectId) as KeywordRow[];
  return rows.map(toKeyword);
}

/** Adds one keyword within the plan's cap; duplicates are refused politely. */
export async function addKeyword(
  projectId: string,
  raw: unknown
): Promise<{ keyword: SeoKeyword } | { error: string }> {
  const keyword = cleanKeyword(raw);
  if (!keyword) return { error: 'Type the keyword first.' };
  const existing = await listKeywords(projectId);
  if (existing.length >= KEYWORDS_CAP) {
    return { error: `The plan tracks up to ${KEYWORDS_CAP} keywords — remove one first.` };
  }
  if (existing.some((k) => k.keyword.toLowerCase() === keyword.toLowerCase())) {
    return { error: 'That keyword is already tracked.' };
  }
  const record: SeoKeyword = {
    id: randomUUID(),
    projectId,
    keyword,
    createdAt: new Date().toISOString(),
  };
  getDb()
    .prepare(
      `INSERT INTO seo_keywords (id, project_id, keyword, created_at) VALUES (?, ?, ?, ?)`
    )
    .run(record.id, projectId, keyword, record.createdAt);
  return { keyword: record };
}

/** Removes the keyword and its history — a dropped keyword has no story to keep. */
export async function deleteKeyword(id: string, projectId: string): Promise<void> {
  getDb()
    .prepare(`DELETE FROM seo_rank_checks WHERE keyword_id = ? AND project_id = ?`)
    .run(id, projectId);
  getDb()
    .prepare(`DELETE FROM seo_keywords WHERE id = ? AND project_id = ?`)
    .run(id, projectId);
}

/* Rank checks */

export type RankCheck = {
  checkedOn: string;
  position: number | null;
  foundUrl: string | null;
};

export type KeywordRank = {
  keyword: SeoKeyword;
  latest: RankCheck | null;
  /** The check nearest ~30 days back, per lib/seoWork.movementBaseline. */
  baseline: RankCheck | null;
  trackedSince: string | null;
};

type RankRow = {
  checked_on: string;
  position: number | null;
  found_url: string | null;
};

/** Every tracked keyword with its latest position and the ~30-day comparison. */
export async function latestRanks(projectId: string): Promise<KeywordRank[]> {
  const keywords = await listKeywords(projectId);
  const history = getDb().prepare(
    `SELECT checked_on, position, found_url FROM seo_rank_checks
      WHERE keyword_id = ? ORDER BY checked_on DESC LIMIT 12`
  );
  return keywords.map((keyword) => {
    const rows = history.all(keyword.id) as RankRow[];
    const checks: RankCheck[] = rows.map((row) => ({
      checkedOn: row.checked_on,
      position: row.position,
      foundUrl: row.found_url,
    }));
    const base = movementBaseline(checks);
    return {
      keyword,
      latest: checks[0] ?? null,
      baseline: base ? (checks.find((c) => c.checkedOn === base.checkedOn) ?? null) : null,
      trackedSince: checks.length > 0 ? checks[checks.length - 1]!.checkedOn : null,
    };
  });
}

/**
 * Checks every tracked keyword once. Sequential on purpose — each live SERP
 * call takes a few seconds and this runs inside after()/cron, never a
 * render. A keyword whose check fails records nothing (a gap retries next
 * run); "not in the top 100" is a successful check and records null.
 */
export async function runRankChecks(project: PortalProject, force = false): Promise<RunOutcome> {
  if (!isRankDataConfigured()) return 'not-configured';
  if (!project.siteUrl) return 'no-url';
  const keywords = await listKeywords(project.id);
  if (keywords.length === 0) return 'fresh';
  if (!(await underSpendCap(project.id))) return 'spend-cap';

  if (!force) {
    const newest = getDb()
      .prepare(
        `SELECT checked_on FROM seo_rank_checks WHERE project_id = ?
          ORDER BY checked_on DESC LIMIT 1`
      )
      .get(project.id) as { checked_on: string } | undefined;
    if (newest && Date.now() - Date.parse(newest.checked_on) < 6 * 86_400_000) {
      return 'fresh';
    }
  }

  const host = new URL(project.siteUrl).hostname;
  const location = project.rankLocation || DEFAULT_RANK_LOCATION;
  let recorded = 0;
  for (const keyword of keywords) {
    const result = await fetchRankCheck(keyword.keyword, host, location);
    if (!result) continue;
    getDb()
      .prepare(
        `INSERT INTO seo_rank_checks
           (id, project_id, keyword_id, checked_on, position, found_url, cost_usd, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        project.id,
        keyword.id,
        today(),
        result.position,
        result.url,
        result.cost,
        new Date().toISOString()
      );
    recorded++;
  }
  return recorded > 0 ? 'done' : 'failed';
}

/* Off-page snapshots */

export type OffpageSnapshot = {
  checkedOn: string;
  backlinks: number;
  referringDomains: number;
};

type OffpageRow = { checked_on: string; backlinks: number; referring_domains: number };

const toOffpage = (row: OffpageRow): OffpageSnapshot => ({
  checkedOn: row.checked_on,
  backlinks: row.backlinks ?? 0,
  referringDomains: row.referring_domains ?? 0,
});

/** Newest first; index 1 is the previous snapshot for the delta line. */
export async function listOffpage(projectId: string, limit = 2): Promise<OffpageSnapshot[]> {
  const rows = getDb()
    .prepare(
      `SELECT checked_on, backlinks, referring_domains FROM seo_offpage
        WHERE project_id = ? ORDER BY checked_on DESC LIMIT ?`
    )
    .all(projectId, limit) as OffpageRow[];
  return rows.map(toOffpage);
}

export async function runBacklinks(project: PortalProject, force = false): Promise<RunOutcome> {
  if (!isRankDataConfigured()) return 'not-configured';
  if (!project.siteUrl) return 'no-url';
  if (!(await underSpendCap(project.id))) return 'spend-cap';
  const [latest] = await listOffpage(project.id, 1);
  if (!force && latest && Date.now() - Date.parse(latest.checkedOn) < 27 * 86_400_000) {
    return 'fresh';
  }

  const summary = await fetchBacklinksSummary(new URL(project.siteUrl).hostname);
  if (!summary) return 'failed';
  getDb()
    .prepare(
      `INSERT INTO seo_offpage
         (id, project_id, checked_on, backlinks, referring_domains, cost_usd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      project.id,
      today(),
      summary.backlinks,
      summary.referringDomains,
      summary.cost,
      new Date().toISOString()
    );
  return 'done';
}

/* Domain standing */

export type StandingSnapshot = {
  checkedOn: string;
  keywordsTop100: number;
  keywordsTop10: number;
  keywordsTop3: number;
};

type StandingRow = {
  checked_on: string;
  keywords_top100: number;
  keywords_top10: number;
  keywords_top3: number;
};

export async function latestStanding(projectId: string): Promise<StandingSnapshot | null> {
  const row = getDb()
    .prepare(
      `SELECT checked_on, keywords_top100, keywords_top10, keywords_top3
         FROM seo_standing WHERE project_id = ? ORDER BY checked_on DESC LIMIT 1`
    )
    .get(projectId) as StandingRow | undefined;
  if (!row) return null;
  return {
    checkedOn: row.checked_on,
    keywordsTop100: row.keywords_top100 ?? 0,
    keywordsTop10: row.keywords_top10 ?? 0,
    keywordsTop3: row.keywords_top3 ?? 0,
  };
}

/** The locked page's headline — refreshed monthly for every project with a site. */
export async function runStanding(project: PortalProject, force = false): Promise<RunOutcome> {
  if (!isRankDataConfigured()) return 'not-configured';
  if (!project.siteUrl) return 'no-url';
  if (!(await underSpendCap(project.id))) return 'spend-cap';
  const latest = await latestStanding(project.id);
  if (!force && latest && Date.now() - Date.parse(latest.checkedOn) < 27 * 86_400_000) {
    return 'fresh';
  }

  const standing = await fetchDomainStanding(
    new URL(project.siteUrl).hostname,
    project.rankLocation || DEFAULT_RANK_LOCATION
  );
  if (!standing) return 'failed';
  getDb()
    .prepare(
      `INSERT INTO seo_standing
         (id, project_id, checked_on, keywords_top100, keywords_top10, keywords_top3, cost_usd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      randomUUID(),
      project.id,
      today(),
      standing.keywordsTop100,
      standing.keywordsTop10,
      standing.keywordsTop3,
      standing.cost,
      new Date().toISOString()
    );
  return 'done';
}

/* Vendor spend */

/**
 * Hard backstop under the user's USD 40/site/month budget. The weekly and
 * monthly cadences make real spend one or two dollars — hitting this cap
 * means something is misconfigured, and stopping is the right answer.
 */
export const SPEND_CAP_USD = 38;

/** What DataForSEO reported billing this project since the month began. */
export async function monthVendorSpendUsd(projectId: string): Promise<number> {
  const monthStart = new Date().toISOString().slice(0, 7) + '-01';
  let total = 0;
  for (const table of ['seo_rank_checks', 'seo_offpage', 'seo_standing']) {
    const row = getDb()
      .prepare(
        `SELECT COALESCE(SUM(cost_usd), 0) AS spend FROM ${table}
          WHERE project_id = ? AND checked_on >= ?`
      )
      .get(projectId, monthStart) as { spend: number };
    total += row.spend ?? 0;
  }
  return total;
}

async function underSpendCap(projectId: string): Promise<boolean> {
  const spend = await monthVendorSpendUsd(projectId);
  if (spend >= SPEND_CAP_USD) {
    console.error(`[seo] vendor spend cap hit for project ${projectId}: $${spend.toFixed(2)}`);
    return false;
  }
  return true;
}
