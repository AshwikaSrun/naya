'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';
import { recordAccount } from '@/lib/agent/client';

const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Dedicated signup page. After creating an account the user is sent straight
// into the personal-shopping onboarding quiz (/onboarding). When Clerk isn't
// configured we still capture an email so signups are tracked, then continue.
export default function SignupPage() {
  return (
    <div className="relative min-h-screen bg-black">
      <div
        aria-hidden
        className="absolute inset-0 scale-105 bg-cover bg-center"
        style={{ backgroundImage: "url('/editorial/signup-wallpaper.png')" }}
      />
      {/* Soft dim — collage stays visible, form stays readable */}
      <div aria-hidden className="absolute inset-0 bg-black/30" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/25" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
        <Link href="/" className="font-naya-serif mb-2 text-3xl font-light lowercase tracking-[0.12em] text-white">
          naya
        </Link>
        <p className="font-naya-sans mb-8 text-center text-[12px] lowercase tracking-[0.1em] text-white/55">
          create your account. your personal shopper starts right after.
        </p>

        {CLERK_ENABLED ? (
          <SignUp
            routing="hash"
            signInUrl="/signup"
            forceRedirectUrl="/onboarding"
            fallbackRedirectUrl="/onboarding"
          />
        ) : (
          <FallbackSignup />
        )}
      </div>
    </div>
  );
}

function FallbackSignup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || !value.includes('@')) return;
    setBusy(true);
    await recordAccount('signup_page', value);
    router.push('/onboarding');
  };

  return (
    <form
      onSubmit={submit}
      className="w-full rounded-2xl border border-white/12 bg-white/5 p-6 backdrop-blur-md"
    >
      <label className="font-naya-sans mb-2 block text-[10px] uppercase tracking-[0.18em] text-white/45">
        email
      </label>
      <input
        type="email"
        value={email}
        onChange={(ev) => setEmail(ev.target.value)}
        placeholder="you@email.com"
        className="font-naya-sans w-full border-b border-white/20 bg-transparent py-2 text-[14px] text-white placeholder:text-white/30 focus:border-white focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy}
        className="font-naya-sans mt-6 w-full rounded-full bg-white px-6 py-3.5 text-[12px] lowercase tracking-[0.12em] text-black transition-colors hover:bg-white/90 disabled:opacity-40"
      >
        {busy ? 'setting up…' : 'continue'}
      </button>
      <p className="font-naya-sans mt-4 text-center text-[11px] text-white/40">
        already have an account?{' '}
        <Link href="/for-you" className="text-white/70 underline-offset-2 hover:underline">
          go to your feed
        </Link>
      </p>
    </form>
  );
}
