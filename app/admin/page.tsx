'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  total_users: number;
  onboarded_users: number;
  onboarding_rate: number;
  signups_last_24h: number;
  signups_last_7d: number;
  active_saved_searches: number;
  total_matches: number;
}

const SECRET_KEY = 'naya-admin-secret';

// Internal stats dashboard. Reads /api/account/stats (guarded by ANALYTICS_SECRET).
// The secret is kept only in this browser's localStorage — no server session.
export default function AdminPage() {
  const [secret, setSecret] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(SECRET_KEY) || '';
    } catch {
      return '';
    }
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'unauthorized'>('idle');

  const load = useCallback(async (s: string) => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/account/stats?secret=${encodeURIComponent(s)}`, { cache: 'no-store' });
      if (res.status === 401) {
        setStatus('unauthorized');
        setStats(null);
        return;
      }
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data = (await res.json()) as Stats;
      setStats(data);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (secret) load(secret);
    // Only auto-load once on mount from the persisted secret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      window.localStorage.setItem(SECRET_KEY, secret);
    } catch {
      /* ignore */
    }
    load(secret);
  };

  const cards: { label: string; value: string | number; hint?: string }[] = stats
    ? [
        { label: 'total users', value: stats.total_users },
        { label: 'onboarded', value: stats.onboarded_users, hint: `${stats.onboarding_rate}% completion` },
        { label: 'signups · 24h', value: stats.signups_last_24h },
        { label: 'signups · 7d', value: stats.signups_last_7d },
        { label: 'active searches', value: stats.active_saved_searches },
        { label: 'agent matches', value: stats.total_matches },
      ]
    : [];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black">
            naya
          </Link>
          <span className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/30">admin</span>
        </div>

        <header className="mb-10 text-center">
          <p className="font-naya-sans mb-4 text-[10px] uppercase tracking-[0.2em] text-black/30">internal</p>
          <h1 className="font-naya-serif mb-3 text-3xl font-light text-black md:text-5xl">signups & activity.</h1>
        </header>

        <form onSubmit={submit} className="mx-auto mb-10 flex max-w-md items-center gap-3">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="analytics secret"
            className="font-naya-sans flex-1 border-b border-black/15 bg-transparent py-2 text-[13px] text-black placeholder:text-black/25 focus:border-black focus:outline-none"
          />
          <button
            type="submit"
            className="font-naya-sans rounded-full bg-black px-5 py-2 text-[12px] lowercase tracking-[0.1em] text-white transition-colors hover:bg-neutral-800"
          >
            {status === 'loading' ? 'loading…' : 'load'}
          </button>
        </form>

        {status === 'unauthorized' && (
          <p className="font-naya-sans mb-6 text-center text-[12px] text-red-500/80">
            wrong secret — check ANALYTICS_SECRET.
          </p>
        )}
        {status === 'error' && (
          <p className="font-naya-sans mb-6 text-center text-[12px] text-black/40">
            couldn&apos;t load stats — is the schema applied and the db configured?
          </p>
        )}

        {stats && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {cards.map((c) => (
                <div key={c.label} className="rounded-2xl border border-black/8 bg-[#faf9f7] p-6">
                  <p className="font-naya-sans text-[10px] uppercase tracking-[0.16em] text-black/35">{c.label}</p>
                  <p className="font-naya-serif mt-2 text-4xl font-light text-black">{c.value}</p>
                  {c.hint && <p className="font-naya-sans mt-1 text-[11px] text-black/40">{c.hint}</p>}
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => load(secret)}
                className="font-naya-sans text-[11px] lowercase tracking-[0.1em] text-black/45 transition-colors hover:text-black"
              >
                refresh
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
