import { formatInr, gstShares } from './money';
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
  /**
   * The date this payment falls due, as a plain ISO date ("2026-09-20"), or
   * null while the studio has not set one.
   *
   * A date, not a timestamp: a payment is due on a day, and comparing
   * timestamps would make a milestone fall due at midnight UTC, which is
   * half past five in the morning here.
   *
   * Null is not "never" — it means the schedule is dated by event rather than
   * by calendar ("due on sign-off"), which is how most of these start. A row
   * with no date never becomes overdue, and never joins the total due.
   */
  dueDate: string | null;
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
  { label: 'Advance', percent: 20, status: 'pending', note: 'Due on sign-off, before work starts.', amount: null, dueDate: null },
  { label: 'Frontend complete', percent: 30, status: 'pending', note: 'Due when the build is ready for your review.', amount: null, dueDate: null },
  { label: 'On completion', percent: 50, status: 'pending', note: 'Due on handover, before the site goes live.', amount: null, dueDate: null },
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

/*
 * Rupee formatting lives in `lib/money.ts` alongside the GST arithmetic, so
 * there is one place that decides how money is written. Re-exported here
 * because every caller of the schedule already imports it from this module.
 */
export { formatInr };

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

/**
 * A plain ISO date ("2026-09-20") or null. Anything else — a timestamp, a
 * half-typed date, junk from a crafted payload — reads as null, because a
 * milestone with an unparseable date must simply not be dated rather than
 * become permanently overdue.
 */
export function cleanDueDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const date = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  // Rejects 2026-02-31 and friends: Date normalises them, so round-tripping is
  // the cheap way to find out whether the day actually exists.
  const parsed = new Date(`${date}T00:00:00Z`);
  return parsed.toISOString().slice(0, 10) === date ? date : null;
}

/** Today, as the same plain ISO date the milestones carry. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
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
        dueDate: cleanDueDate(row.dueDate),
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

/* ── the schedule, with tax ─────────────────────────────────────────────── */

/**
 * One payment as every client-facing surface needs it: the quoted share, the
 * tax on it, and what is actually payable — with the display strings already
 * formatted.
 *
 * `subtotal` is null when the proposal total is a range or prose and the row
 * carries no explicit amount, in which case so are `gst` and `payable`. A row
 * that cannot be priced honestly shows a percentage and nothing else.
 */
/**
 * Where a payment stands against the calendar.
 *
 *  - `paid`     — settled, by gateway or by hand.
 *  - `due`      — dated, that date has arrived or passed, still unpaid. These
 *                 are the rows that make up the total due, and the client pays
 *                 them together rather than one at a time.
 *  - `upcoming` — dated in the future. Payable early if the client wants to.
 *  - `undated`  — no calendar date; it falls due on an event instead.
 */
export type DueState = 'paid' | 'due' | 'upcoming' | 'undated';

export type ScheduleRow = {
  milestone: Milestone;
  index: number;
  dueState: DueState;
  subtotal: number | null;
  gst: number | null;
  payable: number | null;
  subtotalText: string | null;
  gstText: string | null;
  payableText: string | null;
};

/**
 * The payment schedule with GST applied, derived in one place so the proposal
 * document, the status tab, the payment tab and the receipt emails cannot
 * describe the same money four different ways. Everything a client is asked to
 * pay comes through here.
 */
export function milestoneSchedule(
  total: string,
  milestones: Milestone[],
  gstPercent: number,
  /**
   * Which positions have settled — the gateway ledger's view, which the
   * milestone's own `status` does not know about. Passed in rather than read,
   * so this module stays free of storage.
   */
  settled: ReadonlySet<number> = new Set(),
  today: string = todayIso()
): ScheduleRow[] {
  const subtotals = milestoneAmountValues(total, milestones);
  const taxes = gstShares(subtotals, gstPercent);

  return milestones.map((milestone, index) => {
    const subtotal = subtotals[index] ?? null;
    const gst = taxes[index] ?? null;
    const payable = subtotal === null || gst === null ? null : subtotal + gst;
    const paid = milestone.status === 'paid' || settled.has(index);
    // String comparison is correct on ISO dates and sidesteps time zones
    // entirely — the whole reason the date is stored without a time.
    const dueState: DueState = paid
      ? 'paid'
      : milestone.dueDate === null
        ? 'undated'
        : milestone.dueDate <= today
          ? 'due'
          : 'upcoming';
    return {
      milestone,
      index,
      dueState,
      subtotal,
      gst,
      payable,
      subtotalText: subtotal === null ? null : formatInr(subtotal),
      gstText: gst === null ? null : formatInr(gst),
      payableText: payable === null ? null : formatInr(payable),
    };
  });
}

/**
 * What the schedule adds up to. Null wherever a row could not be priced —
 * a partial sum presented as a total is exactly the confidently wrong figure
 * `parseAmount` exists to avoid.
 */
export function scheduleTotals(
  rows: ScheduleRow[]
): { subtotal: number; gst: number; payable: number } | null {
  if (rows.length === 0) return null;
  if (rows.some((row) => row.payable === null)) return null;
  return {
    subtotal: rows.reduce((sum, row) => sum + (row.subtotal ?? 0), 0),
    gst: rows.reduce((sum, row) => sum + (row.gst ?? 0), 0),
    payable: rows.reduce((sum, row) => sum + (row.payable ?? 0), 0),
  };
}

/**
 * What the client owes right now: every dated payment whose date has arrived
 * and which has not been settled.
 *
 * This is the figure the payment page leads with, and the one the "pay
 * everything due" button charges. It accumulates — once the advance falls due
 * and goes unpaid, the next milestone's date arriving simply adds to it, so a
 * client who has fallen behind sees one number rather than three.
 *
 * Returns null if any due row could not be priced (a range total with no
 * explicit amount). A partial sum presented as "total due" is exactly the
 * confidently wrong figure `parseAmount` exists to avoid.
 */
export function totalDue(rows: ScheduleRow[]): {
  rows: ScheduleRow[];
  subtotal: number;
  gst: number;
  payable: number;
} | null {
  const due = rows.filter((row) => row.dueState === 'due');
  if (due.length === 0) return null;
  if (due.some((row) => row.payable === null)) return null;

  return {
    rows: due,
    subtotal: due.reduce((sum, row) => sum + (row.subtotal ?? 0), 0),
    gst: due.reduce((sum, row) => sum + (row.gst ?? 0), 0),
    payable: due.reduce((sum, row) => sum + (row.payable ?? 0), 0),
  };
}

/** How a due date reads to the client. Null where there is nothing to say. */
export function dueDateLabel(
  row: ScheduleRow,
  today: string = todayIso()
): string | null {
  const date = row.milestone.dueDate;
  if (!date) return null;
  const words = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  if (row.dueState === 'paid') return `Was due ${words}`;
  if (date === today) return `Due today`;
  return row.dueState === 'due' ? `Was due ${words}` : `Due ${words}`;
}
