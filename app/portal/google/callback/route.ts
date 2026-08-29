import { type NextRequest, NextResponse } from 'next/server';
import { CLIENT_COOKIE, CLIENT_SESSION_MAX_AGE, GSTATE_COOKIE } from '@/lib/cookies';
import { createClientSessionToken, verifyOAuthStateToken } from '@/lib/auth';
import {
  exchangeCodeForIdToken,
  isGoogleConfigured,
  verifyGoogleIdToken,
} from '@/lib/googleAuth';
import { getClientByEmail } from '@/lib/clients';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * Finishes the Google flow. Google only proves which email the visitor owns;
 * the portal stays invite-only — an email without an existing client account
 * is turned away with a message, never signed up. Every failure lands back
 * on the login page with a reason code the page can explain; no error here
 * reveals whether an email has an account beyond what the visitor already
 * proved they own.
 */
export async function GET(request: NextRequest) {
  const login = (reason?: string) =>
    NextResponse.redirect(
      `${SITE_URL}/portal/login${reason ? `?google=${reason}` : ''}`
    );

  if (!isGoogleConfigured()) return login();

  const params = request.nextUrl.searchParams;
  // The visitor pressed cancel on Google's screen — not an error.
  if (params.get('error')) return login();

  const state = params.get('state') ?? '';
  const cookieState = request.cookies.get(GSTATE_COOKIE)?.value ?? '';
  if (!verifyOAuthStateToken(state) || state !== cookieState) {
    return login('failed');
  }

  const code = params.get('code');
  if (!code) return login('failed');

  const idToken = await exchangeCodeForIdToken(code);
  const email = idToken ? await verifyGoogleIdToken(idToken) : null;
  if (!email) return login('failed');

  const client = await getClientByEmail(email);
  if (!client) return login('unknown');

  const response = NextResponse.redirect(`${SITE_URL}/portal`);
  response.cookies.delete(GSTATE_COOKIE);
  response.cookies.set(CLIENT_COOKIE, createClientSessionToken(client.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CLIENT_SESSION_MAX_AGE,
  });
  return response;
}
