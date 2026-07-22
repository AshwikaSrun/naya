'use client';

import { useEffect, useState } from 'react';
import { ONBOARDED_STORAGE_KEY } from '@/lib/access';
import PaywallModal from './PaywallModal';

/**
 * Required unlock gate on the homepage.
 * Homepage stays visible behind the modal; trial search unlocks after onboarding.
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

    if (window.localStorage.getItem(ONBOARDED_STORAGE_KEY) === '1') {
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [autoOpen, delayMs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => {
      const done = window.localStorage.getItem(ONBOARDED_STORAGE_KEY) === '1';
      if (!done) setOpen(true);
      else setOpen(false);
    };
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);

  return <PaywallModal open={open} required />;
}
