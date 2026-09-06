/**
 * Rupees and GST — pure arithmetic and formatting, no storage and no
 * `node:crypto`, so the studio's client-side editors can import it as freely
 * as a server page can. Same split as `ticketRules` / `tickets`.
 *
 * Every figure a proposal quotes is *exclusive* of GST — the Claude system
 * prompt in `lib/claude.ts` enforces that, and the itemised pricing table sums
 * to the ex-GST total. Tax is therefore added here, in one place, rather than
 * folded into a price string upstream where nobody could audit it. A client
 * paying an invoice pays the figure this module produces.
 */

/**
 * The prevailing rate on IT, design and marketing services in India (SAC 9983
 * / 9984). Per-proposal on the row, because a rate change must not silently
 * rewrite what an old proposal quoted — proposals stored before that column
 * existed read back as this figure.
 */
export const DEFAULT_GST_PERCENT = 18;

/** The widest rate worth accepting from a form. Guards a typo, not a threat. */
const MAX_GST_PERCENT = 40;

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Clamps a posted rate to something sane.
 *
 * Absent reads as the default, not as zero — `Number(null)` is 0, and a
 * missing column quietly becoming "no GST" would under-bill a client rather
 * than fail loudly. A genuine 0 typed into the form is still honoured.
 */
export function cleanGstPercent(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return DEFAULT_GST_PERCENT;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_GST_PERCENT;
  return Math.min(MAX_GST_PERCENT, Math.max(0, Math.round(n)));
}

export type GstBreakdown = {
  /** What the proposal quotes: the ex-GST figure. */
  subtotal: number;
  gstPercent: number;
  gst: number;
  /** What is actually payable. */
  total: number;
};

export function gstOn(
  subtotal: number,
  gstPercent: number = DEFAULT_GST_PERCENT
): GstBreakdown {
  const base = Math.round(subtotal);
  const gst = Math.round((base * gstPercent) / 100);
  return { subtotal: base, gstPercent, gst, total: base + gst };
}

/**
 * GST on each row of a schedule, rounded to whole rupees.
 *
 * A client adds the column up. Rounding each row independently can leave the
 * rows a rupee or two adrift of the tax on the whole, so when every row has a
 * figure the last one absorbs the difference — the same remainder trick
 * `milestoneAmountValues` uses on the shares themselves, and for the same
 * reason. Rows with no figure (a range total, nothing to take a share of) stay
 * null and the adjustment is skipped, because there is no honest whole to
 * reconcile against.
 */
export function gstShares(
  subtotals: (number | null)[],
  gstPercent: number = DEFAULT_GST_PERCENT
): (number | null)[] {
  const shares = subtotals.map((n) =>
    n === null ? null : Math.round((Math.round(n) * gstPercent) / 100)
  );

  const complete = subtotals.every((n) => n !== null);
  const last = shares.length - 1;
  if (!complete || last < 0) return shares;

  const whole = gstOn(
    subtotals.reduce((sum: number, n) => sum + (n ?? 0), 0),
    gstPercent
  ).gst;
  const drift = whole - shares.reduce((sum: number, n) => sum + (n ?? 0), 0);
  shares[last] = (shares[last] ?? 0) + drift;
  return shares;
}

/**
 * How a figure is written on the document: the ex-GST amount, the tax, and the
 * payable total. One helper so the proposal, the payment tab and the receipt
 * email cannot describe the same money three different ways.
 */
export function gstLine(breakdown: GstBreakdown): string {
  return `${formatInr(breakdown.subtotal)} + ${breakdown.gstPercent}% GST ${formatInr(
    breakdown.gst
  )} = ${formatInr(breakdown.total)}`;
}

/** Razorpay works in paise, and only in integers. */
export function toPaise(rupees: number): number {
  return Math.round(rupees) * 100;
}
