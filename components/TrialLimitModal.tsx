'use client';

import Link from 'next/link';
import { TRIAL_SEARCH_LIMIT } from '@/lib/access';

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Shown when a waitlist member has used their free trial searches. */
export default function TrialLimitModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-limit-title"
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
      >
        <p className="font-naya-sans text-[10px] uppercase tracking-[0.18em] text-black/40">
          trial complete
        </p>
        <h2
          id="trial-limit-title"
          className="font-naya-serif mt-3 text-2xl font-light text-black"
        >
          you&apos;ve used your {TRIAL_SEARCH_LIMIT} free searches
        </h2>
        <p className="font-naya-sans mt-3 text-sm leading-relaxed text-black/50">
          you&apos;re on the waitlist — full search and the personal shopper unlock
          soon. purdue students can unlock now with their school email.
        </p>

        <Link
          href="/onboarding"
          className="mt-6 flex w-full items-center justify-center rounded-full bg-black px-6 py-3.5 text-[11px] font-medium lowercase tracking-[0.1em] text-white transition-opacity hover:opacity-90"
        >
          unlock with purdue / invite
        </Link>

        <button
          type="button"
          onClick={onClose}
          className="font-naya-sans mt-3 w-full py-2 text-[11px] text-black/30 transition-colors hover:text-black/50"
        >
          keep browsing
        </button>
      </div>
    </div>
  );
}
