'use client';

import { useEffect, useState } from 'react';
import PaywallModal from './PaywallModal';

const ONBOARDED_KEY = 'naya-onboarded';

/**
 * Required waitlist / profile gate on the homepage.
 * Stays open until the user has joined and finished setup — no dismiss.
 */
export default function UnlockStylePrompt({
  autoOpen = true,
  delayMs = 400,
}: {
  autoOpen?: boolean;
  delayMs?: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!autoOpen) return;

    // Fully through the funnel — no modal.
    if (window.localStorage.getItem(ONBOARDED_KEY) === '1') {
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [autoOpen, delayMs]);

  // If they somehow clear state mid-session, force the modal back.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => {
      const done = window.localStorage.getItem(ONBOARDED_KEY) === '1';
      if (!done) setOpen(true);
      else setOpen(false);
    };
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);

  return <PaywallModal open={open} required />;
}
