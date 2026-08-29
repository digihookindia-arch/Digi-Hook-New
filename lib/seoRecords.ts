import { randomUUID } from 'crypto';
import { getDb } from './db';
import {
  assembleReportData,
  monthBounds,
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
