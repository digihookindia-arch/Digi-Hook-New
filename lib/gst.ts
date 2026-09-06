/**
 * The rules an Indian tax invoice has to obey, as pure functions.
 *
 * No storage, no crypto, no PDF — so the dashboard's client components can
 * validate a state code with the same code that decides the tax split on the
 * invoice itself. Same split as `ticketRules` / `tickets`.
 *
 * Two things here are regulation, not preference, and must not be "tidied":
 *
 *  - **Intra-state supply is CGST + SGST at half the rate each; inter-state is
 *    IGST at the full rate.** Which one applies is decided by comparing the
 *    place of supply against the supplier's own state, never by anything the
 *    client typed.
 *  - **A tax invoice needs a place of supply and the supplier's GSTIN.**
 *    Without either, this module refuses to produce one rather than guessing —
 *    an invoice with a wrong place of supply is worse than no invoice, because
 *    the client's accountant will file it.
 */

import { gstOn, type GstBreakdown } from './money';

/**
 * GST state codes. The first two digits of every GSTIN, and what decides
 * whether a supply is intra-state. Fixed by the government — this list is
 * reference data, not a preference.
 */
export const GST_STATES: readonly { code: string; name: string }[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export function stateName(code: string | null | undefined): string | null {
  if (!code) return null;
  return GST_STATES.find((s) => s.code === code)?.name ?? null;
}

/** A posted state code, or null. Never a guess — the caller must handle null. */
export function cleanStateCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim();
  return GST_STATES.some((s) => s.code === code) ? code : null;
}

/**
 * A GSTIN is 15 characters: 2-digit state code, 10-character PAN, an entity
 * digit, the letter Z, and a checksum character. Shape only — the checksum is
 * not verified here, because a client mistyping their own GSTIN is their
 * accountant's problem to catch, and refusing a valid-but-unusual one would
 * block a real invoice.
 */
const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/;

export function cleanGstin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const gstin = value.replace(/\s+/g, '').toUpperCase();
  return GSTIN_SHAPE.test(gstin) ? gstin : null;
}

/** The state a GSTIN belongs to, from its first two digits. */
export function gstinState(gstin: string | null | undefined): string | null {
  const clean = cleanGstin(gstin);
  return clean ? cleanStateCode(clean.slice(0, 2)) : null;
}

/* ── the tax split ──────────────────────────────────────────────────────── */

export type TaxSplit =
  | {
      kind: 'intra';
      /** Half the total rate each, per the CGST/SGST rules. */
      cgstPercent: number;
      sgstPercent: number;
      cgst: number;
      sgst: number;
      igst: 0;
      total: number;
    }
  | {
      kind: 'inter';
      igstPercent: number;
      igst: number;
      cgst: 0;
      sgst: 0;
      total: number;
    };

/**
 * Splits the tax on a taxable value according to where it is being supplied.
 *
 * The two halves of an intra-state split must add up to the whole tax exactly,
 * so the second half absorbs any odd rupee rather than each being rounded
 * independently — otherwise a ₹7,081 invoice whose parts sum to ₹7,080 goes
 * back and forth with somebody's accountant.
 */
export function taxSplit(input: {
  taxableValue: number;
  gstPercent: number;
  supplierStateCode: string;
  placeOfSupplyCode: string;
}): TaxSplit {
  const whole = gstOn(input.taxableValue, input.gstPercent).gst;

  if (input.supplierStateCode === input.placeOfSupplyCode) {
    const half = input.gstPercent / 2;
    const cgst = Math.round(whole / 2);
    return {
      kind: 'intra',
      cgstPercent: half,
      sgstPercent: half,
      cgst,
      sgst: whole - cgst,
      igst: 0,
      total: whole,
    };
  }

  return {
    kind: 'inter',
    igstPercent: input.gstPercent,
    igst: whole,
    cgst: 0,
    sgst: 0,
    total: whole,
  };
}

/* ── invoice numbering ──────────────────────────────────────────────────── */

/**
 * The Indian financial year a date falls in, as "26-27". April to March —
 * the invoice series restarts each year and must be unique within it.
 */
export function financialYear(date: Date): string {
  const year = date.getFullYear();
  // Month is 0-based, so 3 is April.
  const start = date.getMonth() >= 3 ? year : year - 1;
  return `${String(start % 100).padStart(2, '0')}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** "DH/26-27/0007". Consecutive within the year, as Rule 46 requires. */
export function invoiceNumber(fy: string, sequence: number): string {
  return `DH/${fy}/${String(sequence).padStart(4, '0')}`;
}

/* ── words ──────────────────────────────────────────────────────────────── */

const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty',
  'ninety',
];

function underThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n] as string;
  if (n < 100) {
    const rest = n % 10;
    return `${TENS[Math.floor(n / 10)]}${rest ? `-${ONES[rest]}` : ''}`;
  }
  const rest = n % 100;
  return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` and ${underThousand(rest)}` : ''}`;
}

/**
 * "Amount in words", in the Indian system — lakh and crore, not million.
 * Printed on the invoice because it is conventional here and because it is the
 * one line that makes a transposed digit obvious.
 */
export function amountInWords(rupees: number): string {
  const n = Math.round(Math.abs(rupees));
  if (n === 0) return 'Zero rupees only';

  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  if (crore) parts.push(`${underThousand(crore)} crore`);
  if (lakh) parts.push(`${underThousand(lakh)} lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} thousand`);
  // "and" before a trailing sub-hundred remainder, which is how the figure
  // is read aloud here: seven thousand AND eighty, not seven thousand eighty.
  if (rest) {
    parts.push(
      rest < 100 && parts.length > 0
        ? `and ${underThousand(rest)}`
        : underThousand(rest)
    );
  }

  const words = parts.join(' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} rupees only`;
}

/* ── can we even issue one? ─────────────────────────────────────────────── */

export type InvoiceBlock =
  | 'supplier-gstin'
  | 'place-of-supply'
  | 'client-address';

/**
 * What is stopping a tax invoice from being issued, in the order the studio
 * should fix it. Empty means it can go.
 *
 * Deliberately a list of blocks rather than a boolean: the dashboard tells the
 * studio exactly which field is missing, and "we could not issue an invoice"
 * with no reason is a support call.
 */
export function invoiceBlocks(input: {
  supplierGstin: string | null;
  placeOfSupplyCode: string | null;
  clientAddress: string;
}): InvoiceBlock[] {
  const blocks: InvoiceBlock[] = [];
  if (!cleanGstin(input.supplierGstin)) blocks.push('supplier-gstin');
  if (!cleanStateCode(input.placeOfSupplyCode)) blocks.push('place-of-supply');
  if (input.clientAddress.trim().length < 6) blocks.push('client-address');
  return blocks;
}

export const INVOICE_BLOCK_LABELS: Record<InvoiceBlock, string> = {
  'supplier-gstin':
    "Digi Hook's own GSTIN is not set (site.gstin in lib/site.ts).",
  'place-of-supply':
    "The client's state is not set on this proposal — it decides CGST/SGST versus IGST.",
  'client-address': "The client's billing address is not set on this proposal.",
};

/** Convenience for the caller that only wants the numbers. */
export function invoiceTotals(input: {
  taxableValue: number;
  gstPercent: number;
  supplierStateCode: string;
  placeOfSupplyCode: string;
}): { breakdown: GstBreakdown; split: TaxSplit } {
  return {
    breakdown: gstOn(input.taxableValue, input.gstPercent),
    split: taxSplit(input),
  };
}
