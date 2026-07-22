import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';
import {
  ACCESS_TOKEN_COOKIE,
  WAITLIST_COOKIE,
  isUnlimitedToken,
} from '@/lib/access';

const CLERK_ENABLED =
  !!process.env.CLERK_SECRET_KEY && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Gate is ON by default. Set NAYA_LAUNCH_GATE=false to open the site fully.
const LAUNCH_GATE = process.env.NAYA_LAUNCH_GATE !== 'false';

const PUBLIC_PATHS = [
  '/onboarding',
  '/waitlist', // redirects to /onboarding
  '/signup',
  '/privacy',
  '/terms',
  '/_next',
  '/favicon',
  '/icon',
  '/manifest',
  '/apple-touch',
];

const PUBLIC_API_PREFIXES = [
  '/api/waitlist',
  '/api/auth',
  '/api/onboarding/',
  '/api/webhooks/',
  '/api/cron/',
  '/api/manifest/',
  '/api/push/vapid-public-key',
];

/** Agent product — waitlist users can onboard/profile but not use these. */
const AGENT_PATHS = ['/for-you', '/app'];
const AGENT_API_PREFIXES = ['/api/agent/', '/api/concierge'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return true;
  }
  return PUBLIC_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}

function isAgentPath(pathname: string): boolean {
  if (AGENT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true;
  }
  return AGENT_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}

function hasSiteAccess(request: NextRequest): boolean {
  return (
    !!request.cookies.get(WAITLIST_COOKIE)?.value ||
    !!request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  );
}

function hasAgentAccess(request: NextRequest): boolean {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  return isUnlimitedToken(token);
}

function applyLaunchGate(request: NextRequest): NextResponse | null {
  if (!LAUNCH_GATE) return null;

  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return null;

  if (!hasSiteAccess(request)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Join the waitlist to use naya.', code: 'WAITLIST_REQUIRED' },
        { status: 401 },
      );
    }
    const dest = new URL('/onboarding', request.url);
    if (pathname !== '/' && pathname !== '/onboarding' && pathname !== '/waitlist') {
      dest.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(dest);
  }

  // Waitlist members can search + onboard, but not the agent product.
  if (isAgentPath(pathname) && !hasAgentAccess(request)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          error: 'Agent access requires Purdue or an invite.',
          code: 'AGENT_LOCKED',
        },
        { status: 403 },
      );
    }
    const dest = new URL('/', request.url);
    dest.searchParams.set('agent', 'locked');
    return NextResponse.redirect(dest);
  }

  return null;
}

function withLaunchGate() {
  return async (request: NextRequest) => {
    const gated = applyLaunchGate(request);
    if (gated) return gated;
    return NextResponse.next();
  };
}

export default CLERK_ENABLED
  ? clerkMiddleware(async (_auth, request) => {
      const gated = applyLaunchGate(request);
      if (gated) return gated;
    })
  : withLaunchGate();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
