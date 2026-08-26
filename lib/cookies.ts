/**
 * Session cookie constants, and nothing else.
 *
 * This file exists so the middleware can name the session cookie without
 * importing `lib/auth`, which pulls in Node's `crypto`. Middleware runs on the
 * Edge runtime, where that module does not exist — Next warns on every request
 * and compiles the file in a degraded state, purely because one constant was
 * imported from a module that also happens to sign things.
 *
 * Keep this free of imports and of anything touching Node built-ins. Note the
 * per-proposal `accessCookie` deliberately stays in `lib/auth` — the middleware
 * has no use for it, and moving a name is how live cookies get invalidated.
 */

/** The dashboard session cookie. Presence is checked by the middleware; the
 *  signature is verified server-side in `requireSession`. */
export const SESSION_COOKIE = 'dh_dash';

/** How long a signed-in session lasts. */
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

/** The client-portal session cookie. Presence is checked by the middleware;
 *  the signature is verified server-side in `requireClient`. */
export const CLIENT_COOKIE = 'dh_client';

/** How long a signed-in portal client stays signed in. */
export const CLIENT_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
