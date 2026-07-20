'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { recordAccount } from '@/lib/agent/client';

const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Records every signed-in Clerk user into user_account exactly once per browser
// (localStorage-guarded), so signups are tracked no matter which entry point
// they used. Anonymous users are recorded when they start onboarding instead.
// Renders nothing. Safe no-op when Clerk isn't configured (no ClerkProvider).
export default function AccountRecorder() {
  if (!CLERK_ENABLED) return null;
  return <ClerkRecorder />;
}

function ClerkRecorder() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const key = `naya-recorded-${user.id}`;
    try {
      if (window.localStorage.getItem(key)) return;
    } catch {
      // ignore storage errors — worst case we re-record (endpoint is idempotent)
    }
    const email = user.primaryEmailAddress?.emailAddress;
    recordAccount('clerk', email).finally(() => {
      try {
        window.localStorage.setItem(key, '1');
      } catch {
        /* ignore */
      }
    });
  }, [isLoaded, isSignedIn, user]);

  return null;
}
