import type { SearchRow, SearchTotals } from './searchConsole';
import type { IssueSeverity } from './seoAudit';

/**
 * The pure half of the SEO work record — the activity log, deliverables and
 * monthly reports that justify the subscription to the client. Categories,
 * statuses, labels, validators and the month arithmetic live here, free of
 * node:crypto and node:sqlite so client components can import them; storage
 * is lib/seoRecords.ts — the ticketRules/tickets split.
 *
 * The spec rule this module enforces at the door: **no vague entries**. An
 * activity line like "On-page SEO completed" tells the client nothing; the
 * validator refuses work/reason text too short to mean anything.
 */

/* ── activity log ──────────────────────────────────────────────────────── */

export const SEO_CATEGORIES = [
  'technical',
  'on_page',
  'content',
  'authority',
  'local',
  'tracking',
  'other',
] as const;
export type SeoCategory = (typeof SEO_CATEGORIES)[number];

/** Client-facing wording, shared by the portal and the dashboard. */
export const SEO_CATEGORY_LABELS: Record<SeoCategory, string> = {
  technical: 'Technical',
  on_page: 'On-page',
  content: 'Content',
  authority: 'Links & authority',
  local: 'Local SEO',
  tracking: 'Analytics & tracking',
  other: 'Other',
};

export function parseSeoCategory(value: unknown): SeoCategory {
  return SEO_CATEGORIES.includes(value as SeoCategory) ? (value as SeoCategory) : 'other';
}

/** Short enough to be vague — the refusal thresholds for work and reason. */
export const ACTIVITY_WORK_MIN = 20;
export const ACTIVITY_REASON_MIN = 12;
export const ACTIVITY_FIELD_MAX = 600;

export type ActivityInput = {
  category: SeoCategory;
  work: string;
  reason: string;
  evidence: string;
  result: string;
  /** ISO date the work happened; null when the form gave nothing usable. */
  happenedOn: string | null;
};

/**
 * A client-visible activity entry, cleaned — or a refusal the studio reads.
 * Work and reason are mandatory and must carry real content; evidence and
 * result are welcome but optional (a result is often only observable weeks
 * after the work).
 */
export function cleanActivity(input: {
  category: unknown;
  work: unknown;
  reason: unknown;
  evidence: unknown;
  result: unknown;
  happenedOn: unknown;
}): { activity: ActivityInput } | { error: string } {
  const text = (value: unknown) =>
    String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, ACTIVITY_FIELD_MAX);

  const work = text(input.work);
  const reason = text(input.reason);
  if (work.length < ACTIVITY_WORK_MIN) {
    return {
      error: `Say what was actually done — at least ${ACTIVITY_WORK_MIN} characters. "On-page SEO completed" tells the client nothing.`,
    };
  }
  if (reason.length < ACTIVITY_REASON_MIN) {
    return { error: 'Give the reason — why was this worth doing?' };
  }

  const happenedRaw = String(input.happenedOn ?? '').trim();
  return {
    activity: {
      category: parseSeoCategory(input.category),
      work,
      reason,
      evidence: text(input.evidence).slice(0, 400),
      result: text(input.result),
      happenedOn: /^\d{4}-\d{2}-\d{2}$/.test(happenedRaw) ? happenedRaw : null,
    },
  };
}

/* ── deliverables ──────────────────────────────────────────────────────── */

export const DELIVERABLE_STATUSES = [
  'planned',
  'in_progress',
  'waiting_client',
  'done',
] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  waiting_client: 'Waiting on you',
  done: 'Done',
};

export function parseDeliverableStatus(value: unknown): DeliverableStatus | null {
  return DELIVERABLE_STATUSES.includes(value as DeliverableStatus)
    ? (value as DeliverableStatus)
    : null;
}

/**
 * Whole days something has been waiting on the client — the spec wants the
 * pending duration visible, not hidden. Null when nothing is waiting.
 */
export function waitingDays(waitingSince: string | null, now = new Date()): number | null {
  if (!waitingSince) return null;
  const since = Date.parse(waitingSince);
  if (!Number.isFinite(since)) return null;
  return Math.max(0, Math.floor((now.getTime() - since) / 86_400_000));
}

/* ── tracked keywords and rank movement ────────────────────────────────── */

/** The plan's scope: one site, up to this many tracked keywords. */
export const KEYWORDS_CAP = 15;

/** A tracked keyword as typed, cleaned — or null when nothing usable remains. */
export function cleanKeyword(value: unknown): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return text === '' ? null : text;
}

/**
 * The comparison point for "vs ~30 days back": among checks at least 21
 * days older than the latest one, the one closest to 30 days before it.
 * Null while the history is too young — the panel then says "tracking
 * since …" instead of inventing a movement figure.
 */
export function movementBaseline(
  history: { checkedOn: string; position: number | null }[]
): { checkedOn: string; position: number | null } | null {
  const latest = history[0];
  if (!latest || history.length < 2) return null;
  const day = 86_400_000;
  const latestMs = Date.parse(latest.checkedOn);
  const target = latestMs - 30 * day;

  let best: (typeof history)[number] | null = null;
  let bestDistance = Infinity;
  for (const check of history.slice(1)) {
    const ms = Date.parse(check.checkedOn);
    if (!Number.isFinite(ms) || latestMs - ms < 21 * day) continue;
    const distance = Math.abs(ms - target);
    if (distance < bestDistance) {
      best = check;
      bestDistance = distance;
    }
  }
  return best;
}

/* ── months ────────────────────────────────────────────────────────────── */

export function isMonthKey(value: unknown): value is string {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value ?? ''));
}

/** "2026-03" → "March 2026", for headings and email subjects. */
export function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Calendar bounds of one month and the month before it, as ISO dates, plus
 * the exclusive end for timestamp comparisons. All UTC — the same footing
 * as the support-window arithmetic.
 */
export function monthBounds(month: string): {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  endExclusive: string;
} {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const start = new Date(`${month}-01T00:00:00Z`);
  const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const prev = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));
  const dayBefore = (d: Date) => new Date(d.getTime() - 86_400_000);
  return {
    from: iso(start),
    to: iso(dayBefore(next)),
    prevFrom: iso(prev),
    prevTo: iso(dayBefore(start)),
    endExclusive: iso(next),
  };
}

export function monthKeyOf(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** The month most reports are about: the one that just finished. */
export function previousMonthKey(now = new Date()): string {
  return monthKeyOf(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
}

export function currentMonthKey(now = new Date()): string {
  return monthKeyOf(now);
}

/* ── monthly report ────────────────────────────────────────────────────── */

export const REPORT_TOP_ROWS = 10;
export const REPORT_ACTIVITY_CAP = 100;

export type ReportActivity = {
  category: SeoCategory;
  work: string;
  reason: string;
  evidence: string;
  result: string;
  happenedOn: string;
};

export type ReportDeliverable = { title: string; status: DeliverableStatus };

/**
 * Everything a published report shows, frozen at generation time — the
 * report is a record of what was known and done, so live data must never
 * repaint it. `search: null` means Search Console was not readable at
 * generation (not configured, no access, Google down) and the report says
 * so; it is never dressed up as zeros.
 */
export type SeoReportData = {
  search: null | {
    property: string;
    totals: SearchTotals | null;
    previousTotals: SearchTotals | null;
    topQueries: SearchRow[];
    topPages: SearchRow[];
    pagesInSearch: number;
  };
  audit: null | {
    checkedAt: string;
    pages: number;
    counts: Record<IssueSeverity, number>;
    /** Against the last run before the month began; null without a baseline. */
    delta: null | { newCount: number; resolvedCount: number };
  };
  activities: ReportActivity[];
  deliverablesDone: ReportDeliverable[];
  deliverablesOpen: ReportDeliverable[];
  /**
   * Tracked-keyword positions at month end vs month start. Optional — added
   * after the first reports shipped, so older stored reports lack it and
   * must keep rendering (the annexure pattern).
   */
  ranks?: null | { keyword: string; position: number | null; prevPosition: number | null }[];
  /** Off-page snapshot for the month vs the one before. Optional, as above. */
  offpage?: null | {
    backlinks: number;
    referringDomains: number;
    prevBacklinks: number | null;
    prevReferringDomains: number | null;
  };
};

/** Applies the caps and freezes the shape. Nulls pass through untouched. */
export function assembleReportData(input: SeoReportData): SeoReportData {
  return {
    search: input.search
      ? {
          ...input.search,
          topQueries: input.search.topQueries.slice(0, REPORT_TOP_ROWS),
          topPages: input.search.topPages.slice(0, REPORT_TOP_ROWS),
        }
      : null,
    audit: input.audit,
    activities: input.activities.slice(0, REPORT_ACTIVITY_CAP),
    deliverablesDone: input.deliverablesDone,
    deliverablesOpen: input.deliverablesOpen,
    ranks: input.ranks ?? null,
    offpage: input.offpage ?? null,
  };
}

export const REPORT_SUMMARY_MIN = 40;

/**
 * Why a report may not be published yet, or null when it may. A report with
 * no real executive summary is a data dump, not a report — the summary is
 * where the studio explains what the numbers mean.
 */
export function publishProblem(report: { summary: string }): string | null {
  if (report.summary.trim().length < REPORT_SUMMARY_MIN) {
    return `Write the executive summary first (at least ${REPORT_SUMMARY_MIN} characters) — it is the part the client actually reads.`;
  }
  return null;
}
