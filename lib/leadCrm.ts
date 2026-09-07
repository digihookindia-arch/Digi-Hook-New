/**
 * When to ring this lead next.
 *
 * The whole of the studio's CRM is three fields — status, notes, and this. It
 * earns its place by answering one question on the list page: who am I supposed
 * to be calling today?
 *
 * ## Time is stored exactly as the studio typed it
 *
 * A follow-up is `YYYY-MM-DDTHH:MM` with no zone and no seconds — the literal
 * value of an `<input type="datetime-local">`, kept as a string and compared as
 * a string. "Thursday at 10:30" means half past ten in Noida, and nothing here
 * converts it, stores it as an instant, or re-derives it in another zone. That
 * is the same reasoning as `dueDate` on a milestone, one step finer: an ISO
 * string sorts correctly, so `<` and `>` are all the arithmetic needed, and a
 * server that happens to run in UTC cannot shift a morning call into the
 * previous evening.
 *
 * The one place a real clock is needed is "is this overdue", which requires
 * knowing the time in India rather than on the server. India is UTC+05:30 and
 * has no daylight saving, so that is a fixed offset — exact, and no dependency.
 *
 * Pure and free of `node:` imports so the dashboard's client components can use
 * the same rules the server does. Same split as `ticketRules` / `tickets`.
 */

/** India is UTC+05:30 all year. No DST, so this never needs a table. */
const IST_OFFSET_MINUTES = 330;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Now, in Noida, in the same shape a follow-up is stored in — so "is this
 * overdue" is a string comparison against the same alphabet.
 */
export function istNow(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 16);
}

/**
 * Accepts what the date picker posts and refuses everything else.
 *
 * Returns null for empty input, which is how a follow-up is cleared — "no date
 * set" is a legitimate state and must not be mistaken for a validation
 * failure. Seconds are trimmed rather than rejected: some browsers include
 * them, and a lead should not fail to save over `:00`.
 */
export function cleanFollowUp(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim();
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;

  const [, y, mo, d, h, mi] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59) return null;
  // A year outside this range is a typo or a paste, not a follow-up.
  if (year < 2000 || year > 2100) return null;

  // Catches 31 February, which the ranges above let through.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;

  return `${y}-${mo}-${d}T${h}:${mi}`;
}

export type FollowUpState = 'none' | 'overdue' | 'today' | 'upcoming';

/**
 * Overdue is decided on the minute, not the day: a call booked for 10:30 is
 * late at 11:00, and a list that only goes red at midnight is a list nobody
 * trusts before lunch. `today` is still reported separately, because a call
 * later this afternoon is not the same as one you have missed.
 */
export function followUpState(
  value: string | null | undefined,
  now: string = istNow()
): FollowUpState {
  const when = cleanFollowUp(value);
  if (!when) return 'none';
  if (when < now) return 'overdue';
  if (when.slice(0, 10) === now.slice(0, 10)) return 'today';
  return 'upcoming';
}

/** How the state reads on screen. */
export const FOLLOW_UP_LABELS: Record<FollowUpState, string> = {
  none: 'No follow-up set',
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Scheduled',
};

/**
 * "Thu 10 Sep, 10:30 am" — formatted from the stored parts, never through the
 * runtime's locale or zone. `toLocaleString` on a server in UTC would print a
 * different day for an early-morning call, which is precisely the bug this
 * whole file is arranged to avoid.
 */
export function formatFollowUp(value: string | null | undefined): string {
  const when = cleanFollowUp(value);
  if (!when) return '';

  const year = Number(when.slice(0, 4));
  const month = Number(when.slice(5, 7));
  const day = Number(when.slice(8, 10));
  const hour = Number(when.slice(11, 13));
  const minute = when.slice(14, 16);

  const weekday = DAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const suffix = hour < 12 ? 'am' : 'pm';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;

  return `${weekday} ${day} ${MONTHS[month - 1]}, ${twelve}:${minute} ${suffix}`;
}

/**
 * Sorts leads so the ones needing a call come first: overdue, then today, then
 * scheduled, then everything with no date. Within a group, soonest first.
 *
 * Leads with no follow-up sink rather than disappear — an unscheduled lead is
 * the most likely one to be forgotten, so it stays on the page.
 */
export function byFollowUp<T extends { followUpAt: string | null }>(
  rows: T[],
  now: string = istNow()
): T[] {
  const rank: Record<FollowUpState, number> = {
    overdue: 0,
    today: 1,
    upcoming: 2,
    none: 3,
  };
  return [...rows].sort((a, b) => {
    const byState = rank[followUpState(a.followUpAt, now)] - rank[followUpState(b.followUpAt, now)];
    if (byState !== 0) return byState;
    if (!a.followUpAt) return 0;
    if (!b.followUpAt) return 0;
    return a.followUpAt < b.followUpAt ? -1 : a.followUpAt > b.followUpAt ? 1 : 0;
  });
}
