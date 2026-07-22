'use client';

import { useCallback, useEffect } from 'react';
import { TRIAL_SEARCH_LIMIT } from '@/lib/access';

type Props = {
  open: boolean;
  /** When true, modal cannot be dismissed — only the CTA continues. */
  required?: boolean;
  onClose?: () => void;
};

const BULLETS = [
  'Set up your taste profile in about a minute',
  `${TRIAL_SEARCH_LIMIT} free marketplace searches to try naya now`,
  'Personalized For you feed — ready for you at launch',
  'Saved-search matching + style drops after we open the agent',
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

/**
 * Waitlist gate modal. When `required`, there is no close / backdrop dismiss —
 * the only path forward is joining and finishing setup.
 */
export default function PaywallModal({ open, required = true, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    void track('popup_viewed');
    void track('value_screen_viewed');
  }, [open]);

  // Block Escape while required modal is open.
  useEffect(() => {
    if (!open || !required) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, required]);

  // Warn before leaving the tab if they still haven't joined / finished setup.
  useEffect(() => {
    if (!open || !required) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [open, required]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const startWaitlist = useCallback(() => {
    void track('payment_started', { mode: 'waitlist_onboarding' });
    window.location.href = '/onboarding';
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      {/* Backdrop — not clickable when required */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      {!required && onClose && (
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0"
          onClick={onClose}
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-[#f7f4ee] px-6 pb-8 pt-6 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.55)] sm:rounded-[28px] sm:px-8"
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/40">
            waitlist
          </p>
          {!required && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="font-naya-sans text-[11px] uppercase tracking-[0.14em] text-black/40 hover:text-black"
            >
              close
            </button>
          ) : (
            <span className="font-naya-sans text-[10px] uppercase tracking-[0.14em] text-black/25">
              required
            </span>
          )}
        </div>

        <div>
          <h2
            id="paywall-title"
            className="font-naya-serif text-balance text-[clamp(2rem,5vw,2.75rem)] font-light leading-[1.05] tracking-[-0.03em] text-black"
          >
            Join the waitlist. Build your profile.
          </h2>
          <p className="font-naya-sans mt-4 text-[15px] leading-relaxed text-black/55">
            naya learns your taste so your account is ready at launch — the shopping
            agent opens then. for now, finish setup and try a short search trial.
          </p>
          <ul className="mt-7 space-y-3">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                <span className="font-naya-sans text-[14px] leading-snug text-black/70">{b}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={startWaitlist}
            className="pill-solid mt-8 w-full px-6 py-4 text-[13px]"
          >
            finish setup
          </button>
          <p className="font-naya-sans mt-4 text-center text-[12px] text-black/40">
            profile now · {TRIAL_SEARCH_LIMIT} trial searches · agent after launch
          </p>
          <p className="font-naya-sans mt-2 text-center text-[11px] text-black/35">
            purdue students: use your @purdue.edu email for full access
          </p>
        </div>
      </div>
    </div>
  );
}
