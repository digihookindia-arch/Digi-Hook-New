import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Dashboard auth: one shared team password, exchanged for a signed session
 * cookie. The password itself is never stored in the cookie — the cookie is
 * `expiry.signature`, verified with an HMAC the browser cannot forge.
 */

export const SESSION_COOKIE = 'dh_dash';
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      'AUTH_SECRET must be set to a random string of at least 32 characters.'
    );
  }
  return value;
}

/** Constant-time compare that also tolerates differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still burn a comparison so the failure takes the same time.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    throw new Error('DASHBOARD_PASSWORD is not set.');
  }
  return safeEqual(candidate, expected);
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

export function createSessionToken(): string {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  return `${expires}.${sign(String(expires))}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expires, signature] = token.split('.');
  if (!expires || !signature) return false;
  if (!safeEqual(signature, sign(expires))) return false;
  return Number(expires) > Date.now();
}

/* ── per-proposal access codes ──────────────────────────────────────────── */

export const accessCookie = (slug: string) => `dh_p_${slug.slice(0, 8)}`;

export function createAccessToken(slug: string, code: string): string {
  return sign(`${slug}:${code}`);
}

export function verifyAccessToken(
  token: string | undefined,
  slug: string,
  code: string
): boolean {
  if (!token) return false;
  return safeEqual(token, createAccessToken(slug, code));
}
