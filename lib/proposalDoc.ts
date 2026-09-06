/**
 * How a proposal is labelled as a document: its reference, its dates, and how
 * long the quoted price stands.
 *
 * Pure and dependency-free, so the client-facing pages, the studio dashboard
 * and the receipt emails all name the same proposal the same way. A reference
 * that reads one way on the page and another in an email is a support call.
 */

/**
 * How long a quoted price stands. Thirty days is the ordinary commercial
 * convention and, more practically, the studio's own costs — hosting, licences,
 * a subcontracted photographer — are only knowable that far out.
 *
 * Expiry is presentational: nothing stops an old proposal being accepted, and
 * the studio would rather talk than turn a returning client away. What it does
 * is stop a client discovering a six-month-old price and assuming it holds.
 */
export const PROPOSAL_VALID_DAYS = 30;

/** The reference printed on the document, in emails, and on a receipt. */
export function proposalRef(slug: string): string {
  return slug.slice(0, 8).toUpperCase();
}

/** Dates on client-facing documents are always long-form and Indian-ordered. */
export function formatDocDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function validUntil(issuedAt: string): Date | null {
  const date = new Date(issuedAt);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + PROPOSAL_VALID_DAYS);
  return date;
}

/**
 * Whether the quoted price has passed its validity window. Compared on whole
 * days rather than the exact instant — a proposal does not lapse at 14:32.
 */
export function isExpired(issuedAt: string, now: Date = new Date()): boolean {
  const until = validUntil(issuedAt);
  if (!until) return false;
  until.setHours(23, 59, 59, 999);
  return now.getTime() > until.getTime();
}

/**
 * How long the whole project runs, from the per-phase durations Claude wrote.
 *
 * Returns null unless *every* phase parses. A cover that says "about 3 weeks"
 * when one phase said "to be confirmed" is a promise nobody made — the same
 * rule `parseAmount` follows for money, and for the same reason: on a document
 * a client signs, no figure beats a wrong one.
 *
 * Rounds to the unit a person would actually say. Nobody quotes a build at
 * "19 days".
 */
const DURATION_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  fortnight: 14,
  month: 30,
};

export function timelineSummary(
  phases: { duration: string }[]
): string | null {
  if (phases.length === 0) return null;

  let days = 0;
  for (const phase of phases) {
    // "2 weeks", "3-4 days", "about 2 months" — take the last number written
    // as the honest upper bound, and the first unit word that follows it.
    const match = /(\d+)\s*(?:-|–|to)?\s*(\d+)?\s*(day|week|fortnight|month)/i.exec(
      phase.duration
    );
    if (!match) return null;
    const upper = Number(match[2] ?? match[1]);
    const unit = DURATION_DAYS[(match[3] ?? '').toLowerCase()];
    if (!Number.isFinite(upper) || !unit) return null;
    days += upper * unit;
  }

  if (days <= 0) return null;
  if (days < 14) return `about ${days} days`;
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return `about ${weeks} weeks`;
  }
  const months = Math.round(days / 30);
  return `about ${months} months`;
}
