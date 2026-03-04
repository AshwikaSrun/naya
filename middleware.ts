import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/waitlist',
  '/api/waitlist',
  '/api/auth',
  '/privacy',
  '/terms',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true;
  }

  // Static assets, images, fonts, Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/brands') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|css|js|woff2?|ttf)$/)
  ) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('naya-token')?.value;
  if (token) {
    return NextResponse.next();
  }

  const waitlistUrl = new URL('/waitlist', request.url);
  return NextResponse.redirect(waitlistUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
