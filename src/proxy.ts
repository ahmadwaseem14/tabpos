import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Exclude check for auth pages or assets
  const isAuthPage = pathname === '/login';
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicAsset =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icon-') ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png';

  if (isPublicAsset || isApiRoute) {
    return NextResponse.next();
  }

  console.log(`[PROXY] Path: ${pathname}, Token present: ${!!token}`);

  if (!token && !isAuthPage) {
    console.log(`[PROXY] Redirecting to /login because token is missing`);
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthPage) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (pathname === '/') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icon-).*)',
    '/',
  ],
};
