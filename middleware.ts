import { NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

const CLERK_ENABLED =
  !!process.env.CLERK_SECRET_KEY && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Only engage Clerk's middleware when keys exist; otherwise pass through so the
// site never 500s on a deploy that hasn't had keys added yet.
export default CLERK_ENABLED ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
