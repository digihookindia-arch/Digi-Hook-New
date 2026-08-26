import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

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

/* ── client portal accounts ─────────────────────────────────────────────── */

export const CLIENT_COOKIE = 'dh_client';
export const CLIENT_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Password hashing via scrypt from node:crypto — no dependency to install.
 * The stored format is self-describing (scrypt:N:r:p:salt:hash, all hex for
 * the last two) so the cost parameters can be raised later without
 * invalidating hashes written at the old cost.
 */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('hex'),
    hash.toString('hex'),
  ].join(':');
}

/**
 * False, never a throw, on anything malformed — an empty or corrupted stored
 * value must read as "wrong password", not a 500 on the login page. An empty
 * hash also covers invited-but-not-activated accounts, which cannot sign in.
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, saltHex, hashHex] = stored.split(':');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return expected.length > 0 && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Portal session token: clientId.expires.signature. The signed payload is
 * prefixed 'client:' so a token minted for the portal can never verify as a
 * dashboard session or a proposal access token, and vice versa.
 */
export function createClientSessionToken(clientId: string): string {
  const expires = Date.now() + CLIENT_SESSION_MAX_AGE * 1000;
  return `${clientId}.${expires}.${sign(`client:${clientId}:${expires}`)}`;
}

/** The clientId when the token is valid and unexpired, else null. */
export function verifyClientSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [clientId, expires, signature] = token.split('.');
  if (!clientId || !expires || !signature) return null;
  if (!safeEqual(signature, sign(`client:${clientId}:${expires}`))) return null;
  return Number(expires) > Date.now() ? clientId : null;
}

/**
 * Set-password link token, used for both the invite and forgot-password
 * emails: clientId.expires.signature, signed over the account's *current*
 * password hash. The hash itself never appears in the token — it is only
 * HMAC input — so setting a password changes the hash and kills every
 * outstanding link for that account. Single-use without a tokens table.
 */
export function createSetPasswordToken(
  clientId: string,
  currentPasswordHash: string,
  maxAgeMs: number
): string {
  const expires = Date.now() + maxAgeMs;
  return `${clientId}.${expires}.${sign(`setpw:${clientId}:${expires}:${currentPasswordHash}`)}`;
}

/** The clientId when the link is valid for the account's current hash, else null. */
export function verifySetPasswordToken(
  token: string | undefined,
  currentPasswordHash: string
): string | null {
  if (!token) return null;
  const [clientId, expires, signature] = token.split('.');
  if (!clientId || !expires || !signature) return null;
  if (!safeEqual(signature, sign(`setpw:${clientId}:${expires}:${currentPasswordHash}`)))
    return null;
  return Number(expires) > Date.now() ? clientId : null;
}
