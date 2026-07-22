'use client';

import { useCallback, useEffect } from 'react';

type Props = {
  open: boolean;
  /** When true, modal cannot be dismissed — only the CTA continues. */
  required?: boolean;
  onClose?: () => void;
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

/**
 * Waitlist / unlock gate. Look matches the personal-style signup modal;
 * CTA sends users to /onboarding (email + taste profile).
 */
export default function PaywallModal({ open, required = true, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    void track('popup_viewed');
    void track('value_screen_viewed');
  }, [open]);

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

  useEffect(() => {
    if (!open || !required) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [open, required]);

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

  const canClose = !required && !!onClose;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div aria-hidden className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      {canClose && (
        <button type="button" aria-label="Close" className="absolute inset-0" onClick={onClose} />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-[#f7f4ee] px-6 pb-8 pt-6 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.55)] sm:rounded-[28px] sm:px-8"
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/40">
            personal style
          </p>
          {canClose ? (
            <button
              type="button"
              onClick={onClose}
              className="font-naya-sans text-[11px] uppercase tracking-[0.14em] text-black/40 hover:text-black"
            >
              close
            </button>
          ) : (
            <span className="w-10" aria-hidden />
          )}
        </div>

        <div>
          <h2
            id="paywall-title"
            className="font-naya-serif text-balance text-[clamp(2rem,5vw,2.75rem)] font-light leading-[1.05] tracking-[-0.03em] text-black"
          >
            Unlock Your Personal Style
          </h2>
          <p className="font-naya-sans mt-4 text-[15px] leading-relaxed text-black/55">
            naya learns your taste and finds pieces made for you, not just the
            internet&apos;s best guess.
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
            Sign up to unlock
          </button>
          <p className="font-naya-sans mt-4 text-center text-[12px] text-black/40">
            Free while we pilot. Takes about a minute.
          </p>
        </div>
      </div>
    </div>
  );
}
