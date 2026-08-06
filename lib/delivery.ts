import type { ProposalContent, ProposalPhase } from './proposals';

/**
 * Delivery data: what the client still owes us, where the work has got to, and
 * how the money is split. All three are the studio's own records, edited by
 * hand in the dashboard and never written by Claude — a proposal revision
 * rewrites `content` and must not be able to disturb what has been paid.
 *
 * Rows carry no ids. The editor always rewrites a whole list, so position is
 * identity, which keeps this module free of `node:crypto` and therefore safe
 * to import from the client-side editor.
 */

export const ASSET_STATUSES = ['pending', 'received'] as const;
export const MILESTONE_STATUSES = ['pending', 'invoiced', 'paid'] as const;
export const STAGE_STATUSES = ['pending', 'active', 'done'] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];
export type StageStatus = (typeof STAGE_STATUSES)[number];

export type AssetItem = { label: string; detail: string; status: AssetStatus };
export type Milestone = {
  label: string;
  percent: number;
  status: MilestoneStatus;
  note: string;
};
export type WorkStage = { label: string; detail: string; status: StageStatus };

export type Delivery = {
  assets: AssetItem[];
  milestones: Milestone[];
  stages: WorkStage[];
};

/** What each status is called on the client-facing page. */
export const ASSET_LABELS: Record<AssetStatus, string> = {
  pending: 'Still needed',
  received: 'Received',
};
export const MILESTONE_LABELS: Record<MilestoneStatus, string> = {
  pending: 'Not yet due',
  invoiced: 'Invoiced',
  paid: 'Paid',
};
export const STAGE_LABELS: Record<StageStatus, string> = {
  pending: 'Not started',
  active: 'In progress',
  done: 'Complete',
};

/* ── defaults ───────────────────────────────────────────────────────────── */

/**
 * The studio's standard split, confirmed by the client on 2026-07-26. Editable
 * per project from the dashboard — this is only where a new proposal starts.
 */
export const DEFAULT_MILESTONES: Milestone[] = [
  { label: 'Advance', percent: 20, status: 'pending', note: 'Due on sign-off, before work starts.' },
  { label: 'Frontend complete', percent: 30, status: 'pending', note: 'Due when the build is ready for your review.' },
  { label: 'On completion', percent: 50, status: 'pending', note: 'Due on handover, before the site goes live.' },
];

/**
 * A starting checklist for a typical build. The studio edits this down to the
 * project before sending — it is a prompt for that edit, not a finished list.
 */
export const DEFAULT_ASSETS: AssetItem[] = [
  { label: 'Logo files', detail: 'Vector if you have it — SVG, AI or EPS. A PNG works but will look soft when we scale it.', status: 'pending' },
  { label: 'Brand colours and fonts', detail: 'Whatever exists: a brand guide, hex codes, or the files a previous designer sent you.', status: 'pending' },
  { label: 'Page copy', detail: 'The words for each page. A rough draft is fine — we will edit it with you.', status: 'pending' },
  { label: 'Photographs', detail: 'Your own photos of the team, the office, the products. The higher the resolution the better.', status: 'pending' },
  { label: 'Domain access', detail: 'Login for wherever the domain is registered, so we can point it at the new site.', status: 'pending' },
  { label: 'Contact details to publish', detail: 'The phone number, email address and address you want shown on the site.', status: 'pending' },
];

/** Work stages start as the proposal's own timeline, then diverge from it. */
export function seedStages(timeline: ProposalPhase[]): WorkStage[] {
  return timeline.map((phase) => ({
    label: phase.phase,
    detail: phase.deliverable,
    status: 'pending' as const,
  }));
}

export function seedDelivery(content: ProposalContent): Delivery {
  return {
    assets: DEFAULT_ASSETS.map((a) => ({ ...a })),
    milestones: DEFAULT_MILESTONES.map((m) => ({ ...m })),
    stages: seedStages(content.timeline),
  };
}

/* ── money ──────────────────────────────────────────────────────────────── */

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Pull a number out of the proposal total so milestone amounts can be derived
 * from it. Returns null rather than guessing: a total written as a range
 * ("₹5,000 – ₹10,000") has no single value to take percentages of, and showing
 * a confidently wrong rupee figure to a paying client is worse than showing
 * none. The caller falls back to percentages alone.
 */
export function parseAmount(total: string): number | null {
  const clean = (s: string | undefined) => Number((s ?? '').replace(/,/g, ''));
  const only = (values: number[]) =>
    values.length === 1 && Number.isFinite(values[0]) ? (values[0] as number) : null;

  // Prefer rupee-prefixed numbers, so "₹1,85,000 + 18% GST" reads as 185000
  // rather than tripping over the 18.
  const rupee = [...total.matchAll(/₹\s*(\d[\d,]*)/g)].map((m) => clean(m[1]));
  if (rupee.length > 0) return only(rupee);

  return only([...total.matchAll(/\d[\d,]*/g)].map((m) => clean(m[0])));
}

/**
 * Milestone amounts as display strings, or nulls when the total is not a single
 * figure. The last payable row absorbs the rounding remainder so the parts add
 * up to the total exactly — a client who adds the column up will do so.
 */
export function milestoneAmounts(
  total: string,
  milestones: Milestone[]
): (string | null)[] {
  const value = parseAmount(total);
  if (value === null) return milestones.map(() => null);

  const raw = milestones.map((m) => Math.round((value * m.percent) / 100));
  const last = raw.length - 1;
  // Only correct the rounding drift when the percentages claim the whole total.
  if (last >= 0 && totalPercent(milestones) === 100) {
    const drift = value - raw.reduce((sum, n) => sum + n, 0);
    raw[last] = (raw[last] ?? 0) + drift;
  }
  return raw.map(formatInr);
}

export function totalPercent(milestones: Milestone[]): number {
  return milestones.reduce((sum, m) => sum + m.percent, 0);
}

/* ── parsing ────────────────────────────────────────────────────────────── */

/*
 * Everything below is defensive on purpose. These columns are read on a
 * client-facing page, and they are written from a JSON payload the dashboard
 * posts — so a malformed row must degrade to "no rows" rather than throw a 500
 * in front of a client, and a posted status must be checked against the schema
 * rather than trusted, exactly as the enquiry form does.
 */

const MAX_ROWS = 40;
const MAX_TEXT = 400;

function text(value: unknown, limit = MAX_TEXT): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function rows(json: string): unknown[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ROWS) : [];
  } catch {
    return [];
  }
}

/** Accepts a JSON string (from SQLite) or an already-parsed array (from a post). */
function normalise(input: string | unknown[]): unknown[] {
  return typeof input === 'string' ? rows(input) : input.slice(0, MAX_ROWS);
}

export function parseAssets(input: string | unknown[]): AssetItem[] {
  return normalise(input)
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      return {
        label: text(row.label, 120),
        detail: text(row.detail),
        status: oneOf(row.status, ASSET_STATUSES, 'pending'),
      };
    })
    .filter((a) => a.label.length > 0);
}

export function parseMilestones(input: string | unknown[]): Milestone[] {
  return normalise(input)
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      const percent = Number(row.percent);
      return {
        label: text(row.label, 120),
        percent: Number.isFinite(percent) ? Math.min(100, Math.max(0, Math.round(percent))) : 0,
        status: oneOf(row.status, MILESTONE_STATUSES, 'pending'),
        note: text(row.note),
      };
    })
    .filter((m) => m.label.length > 0);
}

export function parseStages(input: string | unknown[]): WorkStage[] {
  return normalise(input)
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      return {
        label: text(row.label, 120),
        detail: text(row.detail),
        status: oneOf(row.status, STAGE_STATUSES, 'pending'),
      };
    })
    .filter((s) => s.label.length > 0);
}

/** True once there is anything worth showing the client on the status tab. */
export function hasDelivery(delivery: Delivery): boolean {
  return (
    delivery.assets.length > 0 ||
    delivery.milestones.length > 0 ||
    delivery.stages.length > 0
  );
}
