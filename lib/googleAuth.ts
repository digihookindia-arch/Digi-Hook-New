import { SITE_URL } from './site';

/**
 * "Continue with Google" for the client portal — OpenID Connect authorization
 * code flow, implemented directly against Google's endpoints so no OAuth
 * dependency is added. Google only *identifies* the visitor; accounts stay
 * invite-only. The callback matches the verified email against an existing
 * client and refuses everyone else, so Google sign-in can never create an
 * account the studio did not set up.
 *
 * Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (a Web application OAuth
 * client in Google Cloud Console, with SITE_URL/portal/google/callback as an
 * authorised redirect URI). Without them `isGoogleConfigured()` is false and
 * the login page simply shows no Google button — same plain-spoken pattern
 * as `isEmailConfigured()`.
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';

export function isGoogleConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export function googleRedirectUri(): string {
  return `${SITE_URL}/portal/google/callback`;
}

/** Where the "Continue with Google" button sends the browser. */
export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email',
    state,
    // Always show the account picker — a client with several Google accounts
    // must be able to pick the one their portal account was invited under.
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Exchanges the callback's code for Google's ID token. Returns null on any
 * failure — the callback turns that into a friendly retry message.
 */
export async function exchangeCodeForIdToken(code: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: googleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) {
      console.error('[portal] Google token exchange failed', res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { id_token?: string };
    return data.id_token ?? null;
  } catch (err) {
    console.error('[portal] Google token exchange failed', err);
    return null;
  }
}

/**
 * The pure half of ID-token verification, split out so the tests can pin it
 * without network: given the claims Google's tokeninfo endpoint returned,
 * the verified email — or null when anything is off. Checks what matters:
 * the token was minted for THIS app (aud), by Google (iss), for a verified
 * address (email_verified).
 */
export function validateGoogleClaims(
  claims: {
    aud?: string;
    iss?: string;
    email?: string;
    email_verified?: string | boolean;
  },
  clientId: string = CLIENT_ID
): string | null {
  if (!clientId || claims.aud !== clientId) return null;
  if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com')
    return null;
  if (String(claims.email_verified) !== 'true') return null;
  const email = (claims.email ?? '').trim().toLowerCase();
  return email.includes('@') ? email : null;
}

/**
 * Verifies the ID token via Google's tokeninfo endpoint (which checks the
 * signature and expiry server-side) and returns the verified email, or null.
 * tokeninfo over HTTPS is Google's documented low-volume validation route;
 * portal sign-ins are a handful a day, nowhere near needing local JWKS.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) return null;
    return validateGoogleClaims(await res.json());
  } catch (err) {
    console.error('[portal] Google token verification failed', err);
    return null;
  }
}
