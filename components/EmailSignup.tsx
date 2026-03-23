'use client';

import { useState, useEffect } from 'react';

export default function EmailSignup({ source = 'footer' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage.getItem('naya-user-email')) {
      setAlreadySigned(true);
    }
  }, []);

  if (alreadySigned) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || loading) return;

    setLoading(true);
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source }),
      });
    } catch { /* still mark as submitted */ }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('naya-user-email', trimmed);
    }
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center">
        <p className="font-naya-sans text-sm text-white/70">welcome to naya. you&apos;re in.</p>
      </div>
    );
  }

  return (
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
        className="font-naya-sans min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="shrink-0 rounded-full bg-white px-5 py-2.5 text-[10px] font-medium lowercase tracking-[0.1em] text-black transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {loading ? '...' : 'join'}
      </button>
    </form>
  );
}
