/**
 * Every date and time this application shows a human, rendered in Noida.
 *
 * ## Why this file exists
 *
 * `new Date(iso).toLocaleDateString('en-IN')` looks correct and is not. The
 * locale decides the *format*; the runtime's own zone decides the *value*. On
 * the VPS that zone is UTC, so a payment taken at 11pm IST rendered as 5:30pm
 * on the previous day — to a studio in Noida and to clients who are also in
 * India. In a client component it is worse rather than better: Next renders it
 * on the server in UTC and again in the browser in IST, the two disagree, and
 * React patches over the difference.
 *
 * ## Why it does not use Intl either
 *
 * `Intl` with `timeZone: 'Asia/Kolkata'` fixes the value but not the wording.
 * Node's ICU abbreviates September as "Sept" for en-IN where other builds and
 * browsers say "Sep", so the same instant renders differently on the server and
 * on the client — a hydration mismatch, and two spellings of the same month
 * across the dashboard. Formatting from the parts is a dozen lines, is
 * identical in every runtime, and cannot drift.
 *
 * India is UTC+05:30 with no daylight saving, so the offset is a constant
 * rather than a table.
 *
 * ## Two kinds of value, two sets of functions
 *
 * - **An instant** — `2026-09-07T09:36:15Z`, a moment in time. `istDate` /
 *   `istDateTime` / `istShort` / `istTime` convert it into Noida's zone.
 * - **A plain date** — `2026-09-07`: a milestone's due date, the day some SEO
 *   work happened. It has no time and no zone, so `onDate` does not convert
 *   it. Running one of these through an instant formatter shifts it by five
 *   and a half hours and can land it on the day before.
 */

const IST_OFFSET_MINUTES = 330;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** The parts of an instant, as they read on a clock in Noida. */
function istParts(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function clock(hour: number, minute: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** An instant as a day in Noida: "7 Sep 2026". */
export function istDate(value: string | null | undefined): string {
  const p = istParts(value);
  return p ? `${p.day} ${MONTHS[p.month]} ${p.year}` : '';
}

/** An instant, to the minute, in Noida: "7 Sep 2026, 3:06 pm". */
export function istDateTime(value: string | null | undefined): string {
  const p = istParts(value);
  return p ? `${p.day} ${MONTHS[p.month]} ${p.year}, ${clock(p.hour, p.minute)}` : '';
}

/** The same without the year, for anything obviously recent: "7 Sep, 3:06 pm". */
export function istShort(value: string | null | undefined): string {
  const p = istParts(value);
  return p ? `${p.day} ${MONTHS[p.month]}, ${clock(p.hour, p.minute)}` : '';
}

/** Just the clock time in Noida: "3:06 pm". */
export function istTime(value: string | null | undefined): string {
  const p = istParts(value);
  return p ? clock(p.hour, p.minute) : '';
}

/**
 * A plain `YYYY-MM-DD` written out — "7 Sep 2026" — without moving it.
 * Read straight from the string, so there is no instant to convert and nothing
 * that can shift it across a day boundary.
 */
export function onDate(value: string | null | undefined): string {
  const day = (value ?? '').trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return '';

  const [, year, month, date] = match;
  const index = Number(month) - 1;
  if (index < 0 || index > 11) return '';
  return `${Number(date)} ${MONTHS[index]} ${year}`;
}

/** A plain date with its weekday: "Mon 7 Sep 2026". */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function onDateWithDay(value: string | null | undefined): string {
  const written = onDate(value);
  if (!written) return '';
  const day = (value ?? '').trim().slice(0, 10);
  return `${DAYS[new Date(`${day}T00:00:00Z`).getUTCDay()]} ${written}`;
}

/**
 * Today in Noida, as `YYYY-MM-DD`.
 *
 * `new Date().toISOString().slice(0, 10)` is today in *UTC*, which after
 * 18:30 IST is yesterday — so work logged on a September evening was filed
 * against the previous day. Anything defaulting a date to "today" wants this.
 */
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}
