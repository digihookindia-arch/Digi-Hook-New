import { NextResponse, type NextRequest } from 'next/server';
// Deliberately not '@/lib/auth': that module imports Node's crypto, which the
// Edge runtime has no answer for. Only the cookie name is needed here.
import { SESSION_COOKIE } from '@/lib/cookies';

/**
 * Gate on /dashboard. This only checks that a session cookie is *present* —
 * middleware runs on the edge runtime where Node's crypto is unavailable, so
 * the signature is verified in the page/action itself via `requireSession()`.
 * Treat this as a redirect for convenience, not as the security boundary.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/dashboard/login') return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
