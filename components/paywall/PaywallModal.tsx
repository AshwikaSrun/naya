'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  EMAIL_STORAGE_KEY,
  TRIAL_SEARCH_LIMIT,
  UNLIMITED_STORAGE_KEY,
  isPurdueEmail,
} from '@/lib/access';

type Props = {
  open: boolean;
  /** When true, modal cannot be dismissed — only the CTA continues. */
  required?: boolean;
  onClose?: () => void;
  /** After waitlist email succeeds — default: continue to taste quiz. */
  onJoined?: () => void;
};

const BULLETS = [
  `Join the waitlist + get ${TRIAL_SEARCH_LIMIT} free trial searches`,
  'Personalized For you feed ranked to your taste',
  'Saved search matching across every resale site',
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
 * Waitlist gate — same personal-style popup look.
 * Collects email here, then sends users to the taste quiz.
 */
export default function PaywallModal({
  open,
  required = true,
  onClose,
  onJoined,
}: Props) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const joinWaitlist = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('enter a valid email to join.');
      return;
    }

    setSaving(true);
    setError(null);
    void track('payment_started', { mode: 'waitlist_popup' });

    try {
      if (isPurdueEmail(trimmed)) {
        const authRes = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: trimmed }),
        });
        const authData = await authRes.json().catch(() => ({}));
        if (!authRes.ok) {
          throw new Error(
            typeof authData.error === 'string'
              ? authData.error
              : 'Could not unlock Purdue access.',
          );
        }
        window.localStorage.setItem(EMAIL_STORAGE_KEY, trimmed);
        window.localStorage.removeItem(UNLIMITED_STORAGE_KEY);
        void fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed, source: 'popup_purdue' }),
        });
      } else {
        const res = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed, source: 'popup_waitlist' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === 'string' ? data.error : 'Could not join waitlist.',
          );
        }
        window.localStorage.setItem(EMAIL_STORAGE_KEY, trimmed);
      }

      if (onJoined) onJoined();
      else window.location.assign('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSaving(false);
    }
  }, [email, onJoined]);

  if (!open) return null;

  const canClose = !required && !!onClose;
  const canSubmit = !!email.trim() && email.includes('@') && !saving;

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
            waitlist + free trial
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
            Join the waitlist, set up your taste in about a minute, and unlock{' '}
            {TRIAL_SEARCH_LIMIT} free trial searches — naya finds pieces made for
            you, not just the internet&apos;s best guess.
          </p>
          <ul className="mt-7 space-y-3">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                <span className="font-naya-sans text-[14px] leading-snug text-black/70">{b}</span>
              </li>
            ))}
          </ul>

          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              void joinWaitlist();
            }}
          >
            <label className="block">
              <span className="font-naya-sans mb-2 block text-[9px] uppercase tracking-[0.18em] text-black/35">
                email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                disabled={saving}
                className="font-naya-sans w-full border-b border-black/15 bg-transparent py-2.5 text-[15px] text-black placeholder:text-black/30 focus:border-black focus:outline-none disabled:opacity-50"
              />
            </label>
            <p className="font-naya-sans mt-3 text-[12px] leading-relaxed text-black/40">
              purdue students: use your @purdue.edu email for unlimited search + the
              agent.
            </p>

            <button
              type="submit"
              disabled={!canSubmit}
              className="pill-solid mt-6 w-full px-6 py-4 text-[13px] disabled:opacity-40"
            >
              {saving ? 'joining…' : 'Join waitlist + free trial'}
            </button>
          </form>

          {error && (
            <p className="font-naya-sans mt-3 text-center text-[12px] text-red-600/90">
              {error}
            </p>
          )}
          <p className="font-naya-sans mt-4 text-center text-[12px] text-black/40">
            Waitlist now · {TRIAL_SEARCH_LIMIT} free searches after setup · takes about
            a minute
          </p>
        </div>
      </div>
    </div>
  );
}
