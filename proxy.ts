import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LAUNCH_GATE = process.env.NAYA_LAUNCH_GATE === 'true';

const ALLOWED_PATHS = [
  '/waitlist',
  '/api/',
  '/privacy',
  '/terms',
  '/_next',
  '/favicon',
  '/icon',
  '/manifest',
  '/apple-touch',
  '/brands/', // for waitlist bg image
];

function isAllowed(pathname: string): boolean {
  if (!LAUNCH_GATE) return true;
  return ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
}

function hasAccessToken(request: NextRequest): boolean {
  return !!request.cookies.get('naya-token')?.value;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!LAUNCH_GATE) return NextResponse.next();

  if (hasAccessToken(request)) return NextResponse.next();
  if (isAllowed(pathname)) return NextResponse.next();

  return NextResponse.redirect(new URL('/waitlist', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)).*)'],
};
