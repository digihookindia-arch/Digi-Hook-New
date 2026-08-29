import { NextResponse } from 'next/server';
import { createOAuthStateToken } from '@/lib/auth';
import { GSTATE_COOKIE } from '@/lib/cookies';
import { googleAuthUrl, isGoogleConfigured } from '@/lib/googleAuth';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * Starts the "Continue with Google" flow. The state is both HMAC-signed
 * (only this server can mint one) and stored in a short-lived cookie (only
 * the browser that started the flow can finish it).
 */
export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${SITE_URL}/portal/login`);
  }

  const state = createOAuthStateToken();
  const response = NextResponse.redirect(googleAuthUrl(state));
  response.cookies.set(GSTATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/portal/google',
    maxAge: 600,
  });
  return response;
}
