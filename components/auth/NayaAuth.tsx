'use client';

import Link from 'next/link';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

type Tone = 'dark' | 'light';

/**
 * Header auth control. "Sign up" goes to onboarding (email waitlist first).
 * Purdue / invite unlock the personal shopper.
 */
export default function NayaAuth({
  tone = 'dark',
  showSignUp = true,
}: {
  tone?: Tone;
  showSignUp?: boolean;
}) {
  if (!CLERK_ENABLED) {
    const ghost = tone === 'light' ? 'text-white/85 hover:text-white' : 'text-black/65 hover:text-black';
    return showSignUp ? (
      <Link
        href="/onboarding"
        className={`font-naya-sans text-[11px] lowercase tracking-[0.16em] transition-colors ${ghost}`}
      >
        join waitlist
      </Link>
    ) : null;
  }
  return <ClerkControls tone={tone} showSignUp={showSignUp} />;
}

function ClerkControls({ tone, showSignUp }: { tone: Tone; showSignUp: boolean }) {
  const { isLoaded, isSignedIn } = useUser();

  const ghost = tone === 'light' ? 'text-white/85 hover:text-white' : 'text-black/65 hover:text-black';
  const solid = tone === 'light' ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-neutral-800';

  if (!isLoaded) {
    return <span className="block h-8 w-16" aria-hidden />;
  }

  if (isSignedIn) {
    return <UserButton appearance={{ elements: { avatarBox: 'h-8 w-8' } }} />;
  }

  return (
    <div className="flex items-center gap-2.5">
      <SignInButton mode="modal">
        <button
          type="button"
          className={`font-naya-sans text-[11px] lowercase tracking-[0.16em] transition-colors ${ghost}`}
        >
          sign in
        </button>
      </SignInButton>
      {showSignUp && (
        <Link
          href="/onboarding"
          className={`font-naya-sans rounded-full px-4 py-1.5 text-[11px] lowercase tracking-[0.12em] transition-colors ${solid}`}
        >
          join waitlist
        </Link>
      )}
    </div>
  );
}
