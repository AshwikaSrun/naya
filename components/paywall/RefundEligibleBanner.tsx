'use client';

import { useCallback, useEffect, useState } from 'react';

type Status = {
  signedIn?: boolean;
  active: boolean;
  refundEligible?: boolean;
  daysLeft?: number;
  refundEligibleUntil?: string;
};

/**
 * Account-settings strip: days left in the refund window + one-click refund.
 */
export default function RefundEligibleBanner() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch('/api/subscription/status')
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestRefund = async () => {
    if (!confirm('Request a full refund for your personalization pilot? This cannot be undone.')) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/subscription/refund', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMessage(
          data.error === 'refund_window_closed'
            ? 'Your 30-day refund window has closed.'
            : data.message || 'Could not process refund. Try again or contact support.',
        );
      } else {
        setMessage('Refund submitted. Your pilot access ends now.');
        refresh();
      }
    } catch {
      setMessage('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!status?.signedIn || !status.active) return null;

  const untilLabel = status.refundEligibleUntil
    ? new Date(status.refundEligibleUntil).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <section className="mb-10 rounded-[20px] border border-black/10 bg-[#f7f4ee] p-6 md:p-8">
      <p className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/40">
        personalization pilot
      </p>
      <h2 className="font-naya-serif mt-2 text-2xl font-light tracking-[-0.02em] text-black">
        {status.refundEligible
          ? `${status.daysLeft ?? 0} day${status.daysLeft === 1 ? '' : 's'} left to request a full refund`
          : 'Your 30-day refund window has closed'}
      </h2>
      <p className="font-naya-sans mt-3 max-w-xl text-[14px] leading-relaxed text-black/55">
        {status.refundEligible
          ? `Fully refundable until ${untilLabel}. No questions asked. One click below.`
          : 'Your subscription remains active until canceled, but the pilot refund window has ended.'}
      </p>
      {status.refundEligible && (
        <button
          type="button"
          disabled={loading}
          onClick={() => void requestRefund()}
          className="pill-outline mt-6 px-6 py-3 text-[12px] disabled:opacity-50"
        >
          {loading ? 'Processing…' : 'Request full refund'}
        </button>
      )}
      {message && (
        <p className="font-naya-sans mt-4 text-[13px] text-black/60">{message}</p>
      )}
    </section>
  );
}
