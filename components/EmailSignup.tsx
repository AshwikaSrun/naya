'use client';

import { useState, useEffect } from 'react';
import { EMAIL_STORAGE_KEY } from '@/lib/access';

export default function EmailSignup({
  source = 'footer',
  variant = 'dark',
}: {
  source?: string;
  variant?: 'dark' | 'light';
}) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const isLight = variant === 'light';

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage.getItem(EMAIL_STORAGE_KEY)) {
      setAlreadySigned(true);
    }
  }, []);

  if (alreadySigned) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'signup failed');
      }
      window.localStorage.setItem(EMAIL_STORAGE_KEY, trimmed);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <p className={`font-naya-sans text-sm ${isLight ? 'text-black/60' : 'text-white/70'}`}>
          you&apos;re on the list.{' '}
          <a
            href="/onboarding"
            className={`underline underline-offset-2 ${isLight ? 'text-black' : 'text-white'}`}
          >
            finish setup
          </a>
        </p>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your email for updates"
          required
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          className={`font-naya-sans min-w-0 flex-1 rounded-full border px-4 py-2.5 text-sm focus:outline-none ${
            isLight
              ? 'border-black/10 bg-transparent text-black placeholder:text-black/30 focus:border-black/30'
              : 'border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-white/30'
          }`}
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className={`shrink-0 rounded-full px-5 py-2.5 text-[10px] font-medium lowercase tracking-[0.1em] transition-opacity hover:opacity-90 disabled:opacity-40 ${
            isLight ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          {loading ? '...' : 'join'}
        </button>
      </form>
      {error && (
        <p className={`font-naya-sans mt-2 text-center text-[11px] ${isLight ? 'text-red-600' : 'text-red-300'}`}>
          {error}
        </p>
      )}
    </div>
  );
}
