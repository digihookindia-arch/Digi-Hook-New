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
  /**
   * An exact rupee figure for this payment, overriding the percent-derived
   * amount. Null means "derive from the total" — the default, and what every
   * row stored before this field existed reads back as. Set by the studio when
   * the split is agreed in rupees rather than shares, or when the proposal
   * total is a range and percentages alone cannot produce a figure.
   */
  amount: number | null;
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
  { label: 'Advance', percent: 20, status: 'pending', note: 'Due on sign-off, before work starts.', amount: null },
  { label: 'Frontend complete', percent: 30, status: 'pending', note: 'Due when the build is ready for your review.', amount: null },
  { label: 'On completion', percent: 50, status: 'pending', note: 'Due on handover, before the site goes live.', amount: null },
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
 * The rupee value of each milestone: an explicit `amount` when the studio has
 * set one, otherwise the row's share of the total — or null when neither can
 * produce a figure (a range total with no override).
 */
export function milestoneAmountValues(
  total: string,
  milestones: Milestone[]
): (number | null)[] {
  const value = parseAmount(total);
  const raw = milestones.map((m) =>
    m.amount ?? (value === null ? null : Math.round((value * m.percent) / 100))
  );

  // The last payable row absorbs the rounding remainder so the parts add up to
  // the total exactly — a client who adds the column up will do so. Only in
  // pure percent mode claiming the whole total: an explicit figure anywhere
  // means the studio is managing the sums by hand, and a "correction" would
  // silently rewrite a number somebody typed on purpose.
  const last = raw.length - 1;
  const pure = milestones.every((m) => m.amount === null);
  if (value !== null && last >= 0 && pure && totalPercent(milestones) === 100) {
    const drift = value - raw.reduce((sum: number, n) => sum + (n ?? 0), 0);
    raw[last] = (raw[last] ?? 0) + drift;
  }
  return raw;
}

/** Milestone amounts as display strings, nulls where no figure exists. */
export function milestoneAmounts(
  total: string,
  milestones: Milestone[]
): (string | null)[] {
  return milestoneAmountValues(total, milestones).map((n) =>
    n === null ? null : formatInr(n)
  );
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
      // Rows stored before the amount column, and rows in percent mode, have
      // no amount — both must read back as null, not 0, or every old schedule
      // would suddenly claim three ₹0 payments.
      const amount =
        row.amount === null || row.amount === undefined || row.amount === ''
          ? null
          : Number(row.amount);
      return {
        label: text(row.label, 120),
        percent: Number.isFinite(percent) ? Math.min(100, Math.max(0, Math.round(percent))) : 0,
        status: oneOf(row.status, MILESTONE_STATUSES, 'pending'),
        note: text(row.note),
        amount:
          amount !== null && Number.isFinite(amount) && amount >= 0
            ? Math.round(amount)
            : null,
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
