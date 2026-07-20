'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import PricingCard from './PricingCard';

const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

type Step = 'value' | 'pricing';

type Props = {
  open: boolean;
  onClose: () => void;
  onPaid?: () => void;
};

const BULLETS = [
  'Personalized For you feed ranked to your taste',
  'Saved search matching across every resale site',
  'Taste-scored finds in the Chrome extension',
  'Style-drop notifications when new matches land',
];

async function track(eventType: string, meta: Record<string, unknown> = {}) {
  try {
    await fetch('/api/subscription/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, meta }),
    });
  } catch {
    /* ignore */
  }
}

export default function PaywallModal(props: Props) {
  if (!props.open) return null;
  if (!CLERK_ENABLED) {
    return (
      <PaywallShell
        {...props}
        signedIn={false}
        onSignUp={() => {
          window.location.href = '/signup?redirect=/onboarding';
        }}
        onContinue={() => {
          window.location.href = '/onboarding';
        }}
      />
    );
  }
  return <PaywallModalClerk {...props} />;
}

function PaywallModalClerk(props: Props) {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn, openSignUp } = useClerk();
  const router = useRouter();
  return (
    <PaywallShell
      {...props}
      signedIn={!!isSignedIn}
      authLoaded={isLoaded}
      onSignUp={() => {
        if (openSignUp) openSignUp({ forceRedirectUrl: '/onboarding' });
        else openSignIn?.({ forceRedirectUrl: '/onboarding' });
      }}
      onContinue={() => {
        props.onClose();
        router.push('/onboarding');
      }}
    />
  );
}

function PaywallShell({
  open,
  onClose,
  signedIn,
  authLoaded = true,
  onSignUp,
  onContinue,
}: Props & {
  signedIn: boolean;
  authLoaded?: boolean;
  onSignUp: () => void;
  onContinue: () => void;
}) {
  const [step, setStep] = useState<Step>('value');
  const [stripeReady, setStripeReady] = useState(false);
  const [pilotExplainer, setPilotExplainer] = useState(false);
  const [ack, setAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('value');
    setPilotExplainer(false);
    setAck(false);
    setError(null);
    void track('popup_viewed');
    void track('value_screen_viewed');
    fetch('/api/subscription/status')
      .then((r) => r.json())
      .then((d) => setStripeReady(!!d.stripeConfigured))
      .catch(() => setStripeReady(false));
  }, [open]);

  /** Primary path for now: sign up (or continue) into onboarding. */
  const startOnboarding = useCallback(() => {
    if (!authLoaded) return;
    void track('payment_started', { mode: 'onboarding_only', stripeReady });
    if (!signedIn) {
      onSignUp();
      return;
    }
    onContinue();
  }, [authLoaded, onContinue, onSignUp, signedIn, stripeReady]);

  const startCheckout = useCallback(async () => {
    setError(null);
    if (!authLoaded) return;
    if (!signedIn) {
      onSignUp();
      return;
    }
    if (!ack) {
      setError('Please acknowledge the pilot and 30-day refund terms to continue.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/subscription/create', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Could not start checkout. Try again.');
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      setError('No checkout URL returned.');
      setLoading(false);
    } catch {
      setError('Network error starting checkout.');
      setLoading(false);
    }
  }, [ack, authLoaded, onSignUp, signedIn]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-[#f7f4ee] px-6 pb-8 pt-6 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.55)] sm:rounded-[28px] sm:px-8"
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/40">
            {stripeReady && step === 'pricing' ? 'step 2 of 2' : 'personal style'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="font-naya-sans text-[11px] uppercase tracking-[0.14em] text-black/40 hover:text-black"
          >
            close
          </button>
        </div>

        {step === 'value' && (
          <div>
            <h2
              id="paywall-title"
              className="font-naya-serif text-balance text-[clamp(2rem,5vw,2.75rem)] font-light leading-[1.05] tracking-[-0.03em] text-black"
            >
              Unlock Your Personal Style
            </h2>
            <p className="font-naya-sans mt-4 text-[15px] leading-relaxed text-black/55">
              naya learns your taste and finds pieces made for you, not just the internet&apos;s best
              guess.
            </p>
            <ul className="mt-7 space-y-3">
              {BULLETS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                  <span className="font-naya-sans text-[14px] leading-snug text-black/70">{b}</span>
                </li>
              ))}
            </ul>

            {/* Default path until Stripe is configured: signup → onboarding */}
            {!stripeReady ? (
              <>
                <button
                  type="button"
                  onClick={startOnboarding}
                  className="pill-solid mt-8 w-full px-6 py-4 text-[13px]"
                >
                  {signedIn ? 'Build my taste profile' : 'Sign up to unlock'}
                </button>
                <p className="font-naya-sans mt-4 text-center text-[12px] text-black/40">
                  Free while we pilot. Takes about a minute.
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStep('pricing');
                    void track('pricing_screen_viewed');
                  }}
                  className="pill-solid mt-8 w-full px-6 py-4 text-[13px]"
                >
                  Start my pilot · $8.99/mo
                </button>
                <button
                  type="button"
                  onClick={() => setPilotExplainer((v) => !v)}
                  className="font-naya-sans mt-4 w-full text-center text-[12px] text-black/45 underline-offset-2 hover:text-black hover:underline"
                >
                  What&apos;s a pilot?
                </button>
                {pilotExplainer && (
                  <p className="font-naya-sans mt-3 rounded-2xl border border-black/8 bg-white/70 p-4 text-[13px] leading-relaxed text-black/55">
                    A pilot is a paid 1-month trial of personalization at $8.99. Fully refundable
                    anytime in your first 30 days, no questions asked. Core search stays free.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {step === 'pricing' && stripeReady && (
          <div>
            <h2
              id="paywall-title"
              className="font-naya-serif text-balance text-[clamp(2rem,5vw,2.75rem)] font-light leading-[1.05] tracking-[-0.03em] text-black"
            >
              Try it risk-free
            </h2>
            <p className="font-naya-sans mt-4 text-[15px] leading-relaxed text-black/55">
              This is a 1-month pilot. $8.99, fully refundable anytime in your first 30 days if it is
              not for you. No questions asked.
            </p>

            <PricingCard className="mt-7" />

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-black/10 bg-white/80 p-4">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-1 h-4 w-4 accent-black"
              />
              <span className="font-naya-sans text-[13px] leading-snug text-black/65">
                I understand this is a paid pilot and I can request a full refund within 30 days.
              </span>
            </label>

            {error && (
              <p className="font-naya-sans mt-4 text-[13px] text-red-700/80">{error}</p>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => void startCheckout()}
              className="pill-solid mt-6 w-full px-6 py-4 text-[13px] disabled:opacity-50"
            >
              {loading ? 'Opening checkout…' : 'Continue to payment'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-naya-sans mt-4 w-full text-center text-[12px] text-black/45 hover:text-black"
            >
              Maybe later
            </button>
            <button
              type="button"
              onClick={() => setStep('value')}
              className="font-naya-sans mt-2 w-full text-center text-[11px] uppercase tracking-[0.14em] text-black/35"
            >
              back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
