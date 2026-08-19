import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPaths = ['/dashboard', '/settings', '/notifications', '/organizer', '/admin/dashboard', '/admin/event-management', '/admin/organizer-applications'];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected) {
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
      const adminCookie = request.cookies.get('xenova_admin_token')?.value;
      if (!adminCookie && process.env.NODE_ENV === 'production') {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/organizer/:path*',
    '/admin/:path*',
  ],
};
