/**
 * Turning the phone numbers people actually type into something an API will
 * accept.
 *
 * Pure and dependency-free, so the dashboard's client components can warn about
 * an unreachable number using the same rules that decide whether a message
 * sends. Same split as `ticketRules` / `tickets`.
 *
 * The numbers in this database were typed by hand over months — "+91 98736
 * 74517", "09873674517", "9873674517", "+91-98736-74517". WhatsApp wants one
 * shape, and guessing wrong sends a client's project details to a stranger.
 * So this returns null for anything it cannot resolve confidently, and the
 * caller skips rather than sends.
 */

/** India. The studio's clients are Indian businesses; nothing here is global. */
const DEFAULT_COUNTRY = '91';

/**
 * A number in the form AiSensy wants: digits only, country code included, no
 * plus, no spaces. Null when the input cannot be resolved to exactly one
 * plausible number.
 *
 * The rules, in the order they are tried:
 *
 *  - An explicit `+` is trusted as already carrying its country code.
 *  - Ten digits is an Indian mobile without the code, so 91 is added.
 *  - A leading zero on eleven digits is the domestic trunk prefix, dropped.
 *  - Twelve digits starting 91 is already right.
 *
 * Anything else — too short, too long, a landline with an STD code we cannot
 * tell from a mobile — returns null. An Indian mobile also has to start 6-9,
 * which rules out a surprising amount of junk.
 */
export function toWhatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  const explicit = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (explicit) {
    // 8 is the shortest national number in use anywhere; 15 is the E.164 cap.
    return digits.length >= 10 && digits.length <= 15 ? digits : null;
  }

  if (digits.length === 10) {
    return /^[6-9]/.test(digits) ? `${DEFAULT_COUNTRY}${digits}` : null;
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    const national = digits.slice(1);
    return /^[6-9]/.test(national) ? `${DEFAULT_COUNTRY}${national}` : null;
  }

  if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY)) {
    return /^[6-9]/.test(digits.slice(2)) ? digits : null;
  }

  return null;
}

/** True when a stored number can actually be messaged. */
export function isReachable(raw: string | null | undefined): boolean {
  return toWhatsappNumber(raw) !== null;
}

/**
 * How the number reads back to the studio — "+91 98736 74517". Display only;
 * never send this to an API.
 */
export function formatWhatsappNumber(raw: string | null | undefined): string | null {
  const number = toWhatsappNumber(raw);
  if (!number) return null;
  if (number.startsWith(DEFAULT_COUNTRY) && number.length === 12) {
    const national = number.slice(2);
    return `+${DEFAULT_COUNTRY} ${national.slice(0, 5)} ${national.slice(5)}`;
  }
  return `+${number}`;
}
