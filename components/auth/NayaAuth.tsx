'use client';

import Link from 'next/link';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

type Tone = 'dark' | 'light';

/**
 * Header auth control. Over the dark hero pass tone="light"; on solid surfaces
 * pass tone="dark". When Clerk isn't configured yet it falls back to a plain
 * link so the nav never looks broken.
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
    return (
      <Link
        href="/signup"
        className={`font-naya-sans text-[11px] lowercase tracking-[0.16em] transition-colors ${ghost}`}
      >
        sign up
      </Link>
    );
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
        <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
          <button
            type="button"
            className={`font-naya-sans rounded-full px-4 py-1.5 text-[11px] lowercase tracking-[0.12em] transition-colors ${solid}`}
          >
            sign up
          </button>
        </SignUpButton>
      )}
    </div>
  );
}
