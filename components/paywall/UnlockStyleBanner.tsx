'use client';

import { useEffect, useState } from 'react';
import PaywallModal from './PaywallModal';
import { TRIAL_SEARCH_LIMIT } from '@/lib/access';

/**
 * Persistent CTA strip — opens the required waitlist modal (no dismiss path).
 */
export default function UnlockStyleBanner() {
  const [open, setOpen] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem('naya-onboarded') === '1') {
      setOnboarded(true);
    }
  }, []);

  if (onboarded) return null;

  return (
    <>
      <aside className="border-b border-black/8 bg-[#f7f4ee]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="min-w-0 flex-1">
            <p className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/40">
              waitlist
            </p>
            <p className="font-naya-serif mt-1 text-xl font-light tracking-[-0.02em] text-black md:text-2xl">
              finish setup · get {TRIAL_SEARCH_LIMIT} trial searches · agent after launch
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="pill-solid px-5 py-3 text-[12px]"
            >
              finish setup
            </button>
          </div>
        </div>
      </aside>
      <PaywallModal open={open} required />
    </>
  );
}
