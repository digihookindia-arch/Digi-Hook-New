import { NextResponse, type NextRequest } from 'next/server';
// Deliberately not '@/lib/auth': that module imports Node's crypto, which the
// Edge runtime has no answer for. Only the cookie names are needed here.
import { CLIENT_COOKIE, SESSION_COOKIE } from '@/lib/cookies';

/**
 * Gates on /dashboard (studio) and /portal (clients). These only check that
 * the relevant cookie is *present* — middleware runs on the edge runtime
 * where Node's crypto is unavailable, so signatures are verified in the
 * page/action itself via `requireSession()` / `requireClient()`. Treat this
 * as a redirect for convenience, not as the security boundary.
 */

/** Portal pages a signed-out visitor must be able to reach. */
const PORTAL_PUBLIC = [
  '/portal/login',
  '/portal/forgot',
  '/portal/set-password',
  '/portal/google',
  '/portal/google/callback',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/portal')) {
    if (PORTAL_PUBLIC.includes(pathname)) return NextResponse.next();
    if (!request.cookies.get(CLIENT_COOKIE)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = '/portal/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === '/dashboard/login') return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/portal/:path*'],
};
