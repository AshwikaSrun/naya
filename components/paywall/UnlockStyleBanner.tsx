'use client';

import { useEffect, useState } from 'react';
import PaywallModal from './PaywallModal';

/**
 * Persistent CTA. Pre-Stripe: drives signup → onboarding.
 * With Stripe: shown to signed-in free users for the paid pilot.
 */
export default function UnlockStyleBanner() {
  const [active, setActive] = useState<boolean | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem('naya-unlock-banner-dismissed') === '1') {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/subscription/status')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setSignedIn(!!d.signedIn);
        setActive(!!d.active);
        setStripeReady(!!d.stripeConfigured);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setSignedIn(false);
          setActive(false);
          setStripeReady(false);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || dismissed || active === true) return null;

  // Pre-Stripe: show to everyone. With Stripe: only signed-in free users.
  if (stripeReady && !signedIn) return null;

  return (
    <>
      <aside className="border-b border-black/8 bg-[#f7f4ee]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="min-w-0 flex-1">
            <p className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/40">
              Unlock your personal style
            </p>
            <p className="font-naya-serif mt-1 text-xl font-light tracking-[-0.02em] text-black md:text-2xl">
              {stripeReady
                ? 'Taste-matched finds for $8.99/mo. Fully refundable for 30 days.'
                : 'Tell naya your taste. Get a For you feed that actually fits you.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="pill-solid px-5 py-3 text-[12px]"
            >
              {stripeReady ? 'Start my pilot' : signedIn ? 'Build my profile' : 'Sign up free'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                window.sessionStorage.setItem('naya-unlock-banner-dismissed', '1');
              }}
              className="font-naya-sans text-[11px] uppercase tracking-[0.14em] text-black/40 hover:text-black"
            >
              dismiss
            </button>
          </div>
        </div>
      </aside>
      <PaywallModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
