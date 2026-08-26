/**
 * The support-window arithmetic behind "N days of support remaining" on the
 * portal. Pure and crypto-free (same discipline as lib/delivery.ts) so any
 * component can import it, and so the boundary cases live under test rather
 * than inline in a page.
 *
 * Dates are ISO YYYY-MM-DD, compared at UTC midnights so the countdown does
 * not wobble with the server's timezone. The window covers the days
 * [liveAt, liveAt + supportDays): a 180-day plan that goes live on the 1st
 * ends on day 181, and on that day the state is 'ended'.
 */

export type SupportState =
  /** No live date set, a future one, or an unparsable value — nothing has started, so nothing has run out. */
  | { state: 'not_live'; liveAt: string | null }
  | { state: 'active'; liveAt: string; endsOn: string; daysLeft: number }
  | { state: 'ended'; liveAt: string; endedOn: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC midnight for an ISO date string, or null when it does not parse. */
function utcDay(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(time) ? time : null;
}

export function supportState(
  liveAt: string | null,
  supportDays: number,
  now: Date = new Date()
): SupportState {
  if (!liveAt) return { state: 'not_live', liveAt: null };
  const start = utcDay(liveAt);
  if (start === null) return { state: 'not_live', liveAt };

  const days = Number.isFinite(supportDays) ? Math.max(0, Math.floor(supportDays)) : 0;
  const end = start + days * DAY_MS;
  const endIso = new Date(end).toISOString().slice(0, 10);

  if (now.getTime() < start) return { state: 'not_live', liveAt };

  const daysLeft = Math.ceil((end - now.getTime()) / DAY_MS);
  if (daysLeft <= 0) return { state: 'ended', liveAt, endedOn: endIso };
  return { state: 'active', liveAt, endsOn: endIso, daysLeft };
}
