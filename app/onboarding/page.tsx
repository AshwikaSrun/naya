'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import OnboardingFlow from '@/components/agent/OnboardingFlow';
import PaywallModal from '@/components/paywall/PaywallModal';
import { getProfile, recordAccount } from '@/lib/agent/client';
import type { TasteProfile } from '@/lib/agent/types';
import {
  EMAIL_STORAGE_KEY,
  hasUnlimitedClientAccess,
  isPurdueEmail,
} from '@/lib/access';

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initial, setInitial] = useState<Partial<TasteProfile> | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [paidNote, setPaidNote] = useState<string | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setUnlimited(hasUnlimitedClientAccess());
    setHasEmail(!!window.localStorage.getItem(EMAIL_STORAGE_KEY));

    recordAccount('onboarding');
    (async () => {
      const sessionId = searchParams.get('session_id');
      const paid = searchParams.get('paid') === '1';
      if (paid && sessionId) {
        setConfirming(true);
        try {
          const res = await fetch('/api/subscription/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          const data = await res.json();
          if (res.ok) {
            const until = data.refundEligibleUntil
              ? new Date(data.refundEligibleUntil).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : null;
            setPaidNote(
              until
                ? `You're in. Your pilot started today. Full refund available until ${until}.`
                : "You're in. Your pilot started today.",
            );
          }
        } catch {
          /* webhook may still land */
        } finally {
          setConfirming(false);
        }
      }

      const p = await getProfile();
      setInitial(p ?? undefined);
      setReady(true);
    })();
  }, [searchParams]);

  const handleComplete = () => {
    void fetch('/api/subscription/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'onboarding_completed_after_paywall' }),
    }).catch(() => null);

    if (hasUnlimitedClientAccess()) {
      router.push('/for-you');
    } else {
      router.push('/?trial=1');
    }
  };

  const purdue =
    typeof window !== 'undefined' &&
    isPurdueEmail(window.localStorage.getItem(EMAIL_STORAGE_KEY));

  // Waitlist email uses the personal-style popup — not the quiz card.
  if (ready && !hasEmail) {
    return (
      <div className="relative min-h-screen bg-[#f7f4ee]">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="mx-auto max-w-3xl px-6 pt-16 text-center">
            <p className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black">
              naya
            </p>
            <p className="font-naya-serif mt-10 text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.05] tracking-[-0.03em] text-black/25">
              search smarter. shop yours.
            </p>
          </div>
        </div>
        <PaywallModal
          open
          required
          onJoined={() => {
            setHasEmail(true);
            setUnlimited(hasUnlimitedClientAccess());
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
        <div className="mb-10 flex items-center justify-center">
          <Link
            href="/"
            className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black"
          >
            naya
          </Link>
        </div>

        {paidNote && (
          <div className="mb-8 rounded-[20px] border border-black/10 bg-[#f7f4ee] p-5 text-center">
            <p className="font-naya-serif text-2xl font-light tracking-[-0.02em] text-black">
              You&apos;re in.
            </p>
            <p className="font-naya-sans mt-2 text-[14px] leading-relaxed text-black/55">
              {paidNote}
            </p>
          </div>
        )}

        <div className="mb-8 text-center">
          <p className="font-naya-sans mb-3 text-[10px] uppercase tracking-[0.2em] text-black/30">
            {purdue ? 'purdue access' : unlimited ? 'early access' : 'your taste'}
          </p>
          <p className="font-naya-sans text-[13px] text-black/45">
            a few taps so we know what you&apos;re into — then your trial searches unlock.
          </p>
        </div>

        {confirming || !ready ? (
          <div className="font-naya-sans py-24 text-center text-sm text-black/30">
            {confirming ? 'confirming your pilot…' : 'loading…'}
          </div>
        ) : (
          <OnboardingFlow initial={initial} onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="font-naya-sans flex min-h-screen items-center justify-center text-sm text-black/30">
          loading…
        </div>
      }
    >
      <OnboardingInner />
    </Suspense>
  );
}
