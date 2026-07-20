'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MobileNav from '@/components/MobileNav';
import OnboardingFlow from '@/components/agent/OnboardingFlow';
import SavedSearchManager from '@/components/agent/SavedSearchManager';
import AgentMatchCard from '@/components/agent/AgentMatchCard';
import PaywallModal from '@/components/paywall/PaywallModal';
import { getFeed, getProfile, runAgent, type AgentMatch } from '@/lib/agent/client';
import type { TasteProfile } from '@/lib/agent/types';

type View = 'loading' | 'onboarding' | 'feed';

export default function ForYouClient() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>('loading');
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [matches, setMatches] = useState<AgentMatch[]>([]);
  const [fallback, setFallback] = useState(false);
  const [paywalled, setPaywalled] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    const { matches: rows, fallback: fb, paywalled: pw } = await getFeed();
    setMatches(rows);
    setFallback(fb);
    setPaywalled(pw);
    if (pw) setPaywallOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('paywall') === '1') setPaywallOpen(true);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      const status = await fetch('/api/subscription/status')
        .then((r) => r.json())
        .catch(() => null);
      const entitled = !!status?.active;

      const p = await getProfile();
      setProfile(p);

      if (entitled && (!p || !p.onboarded)) {
        setView('onboarding');
        return;
      }

      if (!p || !p.onboarded) {
        setView('onboarding');
      } else {
        setView('feed');
        await loadFeed();
      }
    })();
  }, [loadFeed]);

  const handleOnboarded = async () => {
    setProfile((prev) => (prev ? { ...prev, onboarded: true } : prev));
    try {
      await fetch('/api/subscription/funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'onboarding_completed_after_paywall' }),
      });
    } catch {
      /* ignore */
    }
    setView('feed');
    await loadFeed();
  };

  const handleRun = useCallback(async () => {
    if (paywalled) {
      setPaywallOpen(true);
      return;
    }
    setRunning(true);
    setNote(null);
    const res = await runAgent();
    await loadFeed();
    setRunning(false);
    if (res) {
      setNote(
        res.processed === 0
          ? 'add a search below so the agent knows what to watch for.'
          : `scanned ${res.processed} search${res.processed === 1 ? '' : 'es'}. ${res.matches} new match${res.matches === 1 ? '' : 'es'}.`,
      );
    }
  }, [loadFeed, paywalled]);

  const handleResolved = (listingId: string, feedback: 'liked' | 'dismissed') => {
    if (feedback === 'dismissed') {
      setMatches((prev) => prev.filter((m) => m.listing_id !== listingId));
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black">
            naya
          </Link>
          <div className="flex items-center gap-3">
            <nav className="font-naya-sans hidden items-center gap-3 text-[10px] lowercase tracking-[0.15em] text-black/60 md:flex">
              <Link href="/for-you" className="px-3 py-1.5 font-medium text-black">
                for you
              </Link>
              <Link href="/deals" className="px-3 py-1.5 transition-colors hover:text-black">
                deals
              </Link>
              <Link href="/insights" className="px-3 py-1.5 transition-colors hover:text-black">
                insights
              </Link>
              <Link href="/app" className="px-3 py-1.5 transition-colors hover:text-black">
                concierge
              </Link>
              <Link href="/profile" className="px-3 py-1.5 transition-colors hover:text-black">
                profile
              </Link>
            </nav>
            <MobileNav />
          </div>
        </div>

        {view === 'loading' && (
          <div className="font-naya-sans py-24 text-center text-sm text-black/30">loading your agent…</div>
        )}

        {view === 'onboarding' && (
          <OnboardingFlow initial={profile ?? undefined} onComplete={handleOnboarded} />
        )}

        {view === 'feed' && (
          <>
            <header className="mb-10 text-center">
              <p className="font-naya-sans mb-4 text-[10px] uppercase tracking-[0.2em] text-black/30">
                your personal shopper
              </p>
              <h1 className="font-naya-serif mb-3 text-3xl font-light text-black md:text-5xl">for you.</h1>
              <p className="font-naya-sans text-sm text-black/45">
                ranked picks from across every marketplace, matched to your taste.
              </p>
            </header>

            {paywalled && (
              <div className="mb-8 rounded-[20px] border border-black/10 bg-[#f7f4ee] p-6 text-center md:p-8">
                <p className="font-naya-serif text-2xl font-light tracking-[-0.02em] text-black">
                  Unlock your personal style
                </p>
                <p className="font-naya-sans mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-black/55">
                  You&apos;re seeing popular finds. Sign up and build your taste profile for
                  matches made for you.
                </p>
                <button
                  type="button"
                  onClick={() => setPaywallOpen(true)}
                  className="pill-solid mt-5 px-6 py-3 text-[12px]"
                >
                  Sign up to unlock
                </button>
              </div>
            )}

            <section className="mb-10 rounded-2xl border border-black/8 bg-[#faf9f7] p-6 md:p-8">
              <SavedSearchManager onChanged={handleRun} onPaywall={() => setPaywallOpen(true)} />
              <div className="mt-5 flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={running}
                  className="font-naya-sans rounded-full border border-black/20 px-5 py-2 text-[12px] lowercase tracking-[0.1em] text-black transition-colors hover:border-black disabled:opacity-40"
                >
                  {running ? 'scanning marketplaces…' : 'refresh my feed'}
                </button>
                <Link
                  href="/for-you/edit"
                  className="font-naya-sans text-[11px] lowercase tracking-[0.1em] text-black/45 transition-colors hover:text-black"
                >
                  edit taste profile
                </Link>
                {note && <span className="font-naya-sans text-[11px] text-black/45">{note}</span>}
              </div>
            </section>

            {fallback && matches.length > 0 && (
              <div className="font-naya-sans mb-6 rounded-xl border border-black/8 bg-[#faf9f7] px-5 py-3 text-center text-[12px] text-black/50">
                {paywalled
                  ? 'popular on naya. unlock personalization for taste-matched picks.'
                  : 'popular on naya while your agent learns your taste. add a search or some brands and these become personalized picks.'}
              </div>
            )}

            {matches.length === 0 ? (
              <div className="font-naya-sans py-16 text-center text-sm text-black/35">
                no matches yet. add a search above and hit refresh, and naya will start hunting.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {matches.map((m) => (
                  <AgentMatchCard key={m.listing_id} match={m} onResolved={handleResolved} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
