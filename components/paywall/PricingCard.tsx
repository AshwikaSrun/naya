'use client';

import { PILOT_PRICE_CENTS } from '@/lib/subscription';

type Props = {
  className?: string;
  compact?: boolean;
};

/**
 * Clear price card with the 30-day full-refund badge.
 * Used in the paywall modal and the persistent unlock banner.
 */
export default function PricingCard({ className = '', compact = false }: Props) {
  const dollars = (PILOT_PRICE_CENTS / 100).toFixed(2);

  return (
    <div
      className={`rounded-[20px] border border-black/10 bg-white ${compact ? 'p-4' : 'p-6'} ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-left">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/40">
            personalization pilot
          </p>
          <p className="font-naya-serif mt-1 text-[clamp(2rem,4vw,2.75rem)] font-light tracking-[-0.03em] text-black">
            ${dollars}
            <span className="font-naya-sans ml-1 text-base tracking-normal text-black/45">/mo</span>
          </p>
        </div>
        <span className="font-naya-sans inline-flex items-center rounded-full bg-black px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white">
          100% refundable · 30 days
        </span>
      </div>
      {!compact && (
        <p className="font-naya-sans mt-4 text-[13px] leading-relaxed text-black/50">
          $8.99 for one month. Fully refundable anytime in your first 30 days if it is not for you.
          No questions asked.
        </p>
      )}
    </div>
  );
}
