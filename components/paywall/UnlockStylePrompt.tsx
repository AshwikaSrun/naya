'use client';

import { useEffect, useState } from 'react';
import PaywallModal from './PaywallModal';

const DISMISS_KEY = 'naya-unlock-modal-dismissed';

/**
 * Homepage unlock prompt — a real modal overlay (not a strip under the fixed nav).
 * Opens once per session. Pre-Stripe CTA: signup → onboarding.
 */
export default function UnlockStylePrompt({
  autoOpen = true,
  delayMs = 900,
}: {
  autoOpen?: boolean;
  delayMs?: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(DISMISS_KEY) === '1') return;

    let cancelled = false;
    let timer: number | undefined;

    fetch('/api/subscription/status')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || d.active || !autoOpen) return;
        timer = window.setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, delayMs);
      })
      .catch(() => {
        if (cancelled || !autoOpen) return;
        timer = window.setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, delayMs);
      });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [autoOpen, delayMs]);

  const handleClose = () => {
    setOpen(false);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    }
  };

  return <PaywallModal open={open} onClose={handleClose} />;
}
