'use client';

import { useState } from 'react';
import Link from 'next/link';

type View = 'waitlist' | 'code' | 'submitted';

export default function WaitlistPage() {
  const [view, setView] = useState<View>('waitlist');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setSuccessMessage(data.message || "you're on the list.");
      setView('submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code.');
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/brands/browser.png')" }}
      />
      <div className="fixed inset-0 bg-black/55" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">

          <h1 className="font-naya-serif text-5xl font-light lowercase tracking-[0.15em] text-white md:text-6xl">
            naya
          </h1>
          <p className="font-naya-sans mt-3 text-[11px] lowercase tracking-[0.12em] text-white/40 md:text-xs">
            the entire resale market in one search
          </p>

          {/* ── Waitlist ── */}
          {view === 'waitlist' && (
            <div className="mt-12 md:mt-16">
              <p className="font-naya-serif text-2xl font-light lowercase text-white/80 md:text-3xl">
                we&apos;re launching soon.
              </p>
              <p className="font-naya-sans mt-2 text-xs lowercase tracking-[0.04em] text-white/40">
                join the waitlist for early access
              </p>

              <form onSubmit={handleWaitlistSubmit} className="mt-8">
                <div className="flex items-center rounded-full border border-white/15 bg-white/8 px-5 py-3.5 backdrop-blur-md">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your email"
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    inputMode="email"
                    className="font-naya-sans min-w-0 flex-1 bg-transparent text-base font-light text-white placeholder:text-white/30 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="ml-3 shrink-0 p-1 text-white/40 transition-colors active:text-white disabled:opacity-20"
                  >
                    {loading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>

              {error && (
                <p className="font-naya-sans mt-4 text-xs text-red-400">{error}</p>
              )}

              <div className="mt-10 rounded-xl border border-white/20 bg-white/5 px-5 py-4 backdrop-blur-sm">
                <p className="font-naya-sans text-[11px] font-medium lowercase tracking-[0.08em] text-white/90">
                  purdue students get free access
                </p>
                <p className="font-naya-sans mt-1.5 text-[10px] lowercase tracking-[0.04em] text-white/50">
                  use your @purdue.edu email as your invite code below — no waitlist needed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setView('code'); setError(null); }}
                className="font-naya-sans mt-12 py-2 text-[11px] lowercase tracking-[0.1em] text-white/25 transition-colors active:text-white/50"
              >
                already have an invite code?
              </button>
            </div>
          )}

          {/* ── Code entry ── */}
          {view === 'code' && (
            <div className="mt-12 md:mt-16">
              <p className="font-naya-serif text-2xl font-light lowercase text-white/80 md:text-3xl">
                enter your invite code.
              </p>
              <p className="font-naya-sans mt-1.5 text-[10px] lowercase tracking-[0.04em] text-white/40">
                purdue students: use your @purdue.edu email for free access
              </p>

              <form onSubmit={handleCodeSubmit} className="mt-8">
                <div className="flex items-center rounded-full border border-white/15 bg-white/8 px-5 py-3.5 backdrop-blur-md">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="invite code or you@purdue.edu"
                    required
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="font-naya-sans min-w-0 flex-1 bg-transparent text-base font-light tracking-[0.06em] text-white placeholder:text-white/30 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="ml-3 shrink-0 p-1 text-white/40 transition-colors active:text-white disabled:opacity-20"
                  >
                    {loading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>

              {error && (
                <p className="font-naya-sans mt-4 text-xs text-red-400">{error}</p>
              )}

              <button
                type="button"
                onClick={() => { setView('waitlist'); setError(null); }}
                className="font-naya-sans mt-12 py-2 text-[11px] lowercase tracking-[0.1em] text-white/25 transition-colors active:text-white/50"
              >
                back to waitlist
              </button>
            </div>
          )}

          {/* ── Success ── */}
          {view === 'submitted' && (
            <div className="mt-12 md:mt-16">
              <p className="font-naya-serif text-2xl font-light lowercase text-white/80 md:text-3xl">
                {successMessage}
              </p>
              <p className="font-naya-sans mt-3 text-xs lowercase tracking-[0.04em] text-white/35">
                we&apos;ll send your invite code when it&apos;s time.
              </p>

              <button
                type="button"
                onClick={() => { setView('code'); setError(null); }}
                className="font-naya-sans mt-12 py-2 text-[11px] lowercase tracking-[0.1em] text-white/25 transition-colors active:text-white/50"
              >
                already have an invite code?
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 pb-8">
          <Link href="/privacy" className="font-naya-sans py-2 text-[10px] lowercase tracking-[0.12em] text-white/15 active:text-white/30">
            privacy
          </Link>
          <Link href="/terms" className="font-naya-sans py-2 text-[10px] lowercase tracking-[0.12em] text-white/15 active:text-white/30">
            terms
          </Link>
        </div>
      </div>
    </div>
  );
}
