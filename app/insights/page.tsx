'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface TrendingItem {
  query: string;
  label: string;
  searchCount: number;
  avgResults: number;
}

interface PriceIndexResult {
  brand: string | null;
  itemType: string | null;
  medianPrice: number | null;
  count: number;
  trend30d: number | null;
  priceRange: { min: number; max: number } | null;
  byPlatform: Record<string, { median: number; count: number }>;
}

interface PriceMover {
  brand: string;
  itemType: string;
  medianPrice: number;
  trend30d: number;
  count: number;
}

export default function InsightsPage() {
  const [priceQuery, setPriceQuery] = useState('');
  const [priceResult, setPriceResult] = useState<PriceIndexResult | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [trendingCampus, setTrendingCampus] = useState('');
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [movers, setMovers] = useState<PriceMover[]>([]);
  const [moversLoading, setMoversLoading] = useState(true);

  const fetchTrending = useCallback(async (campus?: string) => {
    setTrendingLoading(true);
    try {
      const url = campus
        ? `/api/insights/trending?campus=${encodeURIComponent(campus)}&limit=10`
        : '/api/insights/trending?limit=10';
      const r = await fetch(url);
      const data = await r.json();
      setTrending(data.trending || []);
    } catch {
      setTrending([]);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending(trendingCampus || undefined);
  }, [trendingCampus, fetchTrending]);

  // Price movers — fetch top brands/items with biggest trend changes
  useEffect(() => {
    setMoversLoading(true);
    const popularQueries = [
      'carhartt jacket', 'nike crewneck', 'levi jeans', 'north face jacket',
      'champion hoodie', 'ralph lauren polo', 'patagonia vest', 'jordan shoes',
    ];

    Promise.all(
      popularQueries.map((q) =>
        fetch(`/api/insights/price-index?query=${encodeURIComponent(q)}`)
          .then((r) => r.json())
          .catch(() => null)
      )
    ).then((results) => {
      const valid: PriceMover[] = results
        .filter((r) => r && r.medianPrice !== null && r.count > 0)
        .map((r, i) => ({
          brand: r.brand || popularQueries[i].split(' ')[0],
          itemType: r.itemType || popularQueries[i].split(' ').slice(1).join(' '),
          medianPrice: r.medianPrice,
          trend30d: r.trend30d ?? 0,
          count: r.count,
        }))
        .sort((a, b) => Math.abs(b.trend30d) - Math.abs(a.trend30d));
      setMovers(valid);
      setMoversLoading(false);
    });
  }, []);

  const handlePriceSearch = async () => {
    if (!priceQuery.trim()) return;
    setPriceLoading(true);
    try {
      const r = await fetch(`/api/insights/price-index?query=${encodeURIComponent(priceQuery.trim())}`);
      const data = await r.json();
      setPriceResult(data);
    } catch {
      setPriceResult(null);
    } finally {
      setPriceLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-naya-serif text-xl font-light tracking-tight text-black">
            naya
          </Link>
          <h1 className="font-naya-sans text-[11px] uppercase tracking-[0.25em] text-black/40">
            market insights
          </h1>
          <Link
            href="/"
            className="font-naya-sans text-[11px] uppercase tracking-[0.15em] text-black/40 transition-colors hover:text-black"
          >
            back to search
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Hero */}
        <div className="mb-16">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.3em] text-black/30">data engine</p>
          <h2 className="font-naya-serif mt-2 text-3xl font-light text-black md:text-5xl">
            resale market intelligence.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-black/50">
            real-time pricing data and trend signals from thousands of listings across ebay, grailed, depop, and poshmark.
          </p>
        </div>

        {/* Section 1: Price Index Search */}
        <section className="mb-16">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/30">01</p>
          <h3 className="font-naya-serif mt-1 text-2xl font-light text-black">price index</h3>
          <p className="mt-2 text-sm text-black/40">search any brand or item to see median resale price and 30-day trend.</p>

          <div className="mt-6 flex gap-3">
            <input
              type="text"
              value={priceQuery}
              onChange={(e) => setPriceQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePriceSearch()}
              placeholder="e.g. carhartt jacket, nike dunks, levi 501..."
              className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black placeholder:text-black/25 focus:border-black/20 focus:outline-none"
            />
            <button
              type="button"
              onClick={handlePriceSearch}
              disabled={priceLoading}
              className="rounded-xl bg-black px-6 py-3 text-[11px] uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {priceLoading ? 'searching...' : 'lookup'}
            </button>
          </div>

          {priceResult && (
            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
              {priceResult.medianPrice === null ? (
                <p className="text-sm text-black/40">
                  no data yet for &quot;{priceQuery}&quot; — prices are collected as users search. try again after more searches.
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-baseline gap-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">median price</p>
                      <p className="font-naya-serif mt-1 text-4xl font-light text-black">
                        ${priceResult.medianPrice.toFixed(0)}
                      </p>
                    </div>
                    {priceResult.trend30d !== null && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">30-day trend</p>
                        <p className={`font-naya-serif mt-1 text-4xl font-light ${
                          priceResult.trend30d > 0 ? 'text-rose-500' : priceResult.trend30d < 0 ? 'text-emerald-500' : 'text-black/30'
                        }`}>
                          {priceResult.trend30d > 0 ? '+' : ''}{priceResult.trend30d}%
                        </p>
                      </div>
                    )}
                    {priceResult.priceRange && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">range</p>
                        <p className="font-naya-serif mt-1 text-2xl font-light text-black/50">
                          ${priceResult.priceRange.min.toFixed(0)} – ${priceResult.priceRange.max.toFixed(0)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">listings tracked</p>
                      <p className="font-naya-serif mt-1 text-2xl font-light text-black/50">
                        {priceResult.count}
                      </p>
                    </div>
                  </div>

                  {/* Platform breakdown */}
                  {Object.keys(priceResult.byPlatform).length > 0 && (
                    <div>
                      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-black/30">by platform</p>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(priceResult.byPlatform).map(([platform, stats]) => (
                          <div key={platform} className="rounded-xl border border-black/5 bg-[#faf9f7] px-4 py-3">
                            <p className="text-[11px] font-medium capitalize text-black/40">{platform}</p>
                            <p className="font-naya-serif mt-0.5 text-lg font-light text-black">
                              ${stats.median.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-black/25">{stats.count} listings</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section 2: Trending Searches */}
        <section className="mb-16">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/30">02</p>
          <h3 className="font-naya-serif mt-1 text-2xl font-light text-black">trending now</h3>
          <p className="mt-2 text-sm text-black/40">most searched items in the last 7 days.</p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setTrendingCampus('')}
              className={`rounded-full border px-3 py-1.5 text-[11px] lowercase tracking-wider transition-all ${
                !trendingCampus ? 'border-black bg-black text-white' : 'border-black/15 bg-white text-black/60 hover:border-black/30'
              }`}
            >
              global
            </button>
            {['purdue', 'michigan', 'ohio-state', 'indiana'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setTrendingCampus(c)}
                className={`rounded-full border px-3 py-1.5 text-[11px] lowercase tracking-wider transition-all ${
                  trendingCampus === c ? 'border-black bg-black text-white' : 'border-black/15 bg-white text-black/60 hover:border-black/30'
                }`}
              >
                {c.replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-black/10 bg-white">
            {trendingLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 border-b border-black/5 px-6 py-4 last:border-b-0">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-100" />
                    <div className="h-4 w-48 animate-pulse rounded bg-neutral-100" />
                  </div>
                ))}
              </div>
            ) : trending.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-black/30">no search data yet — trending will appear as users search.</p>
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {trending.map((t, i) => (
                  <Link
                    key={t.query}
                    href={`/?q=${encodeURIComponent(t.query)}`}
                    className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-black/[0.02]"
                  >
                    <span className="font-naya-serif w-8 text-2xl font-extralight text-black/10">{i + 1}</span>
                    <span className="font-naya-serif flex-1 text-lg font-light text-black/80 group-hover:text-black">
                      {t.label}
                    </span>
                    <span className="text-[11px] text-black/25">{t.searchCount} searches</span>
                    <svg className="h-4 w-4 text-black/10 transition-transform group-hover:translate-x-0.5 group-hover:text-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Price Movers */}
        <section className="mb-16">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/30">03</p>
          <h3 className="font-naya-serif mt-1 text-2xl font-light text-black">price movers</h3>
          <p className="mt-2 text-sm text-black/40">items with the biggest price changes in the last 30 days.</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {moversLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl border border-black/5 bg-neutral-50" />
              ))
            ) : movers.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-black/10 bg-white px-6 py-12 text-center">
                <p className="text-sm text-black/30">not enough data yet — price trends will appear as more searches are tracked.</p>
              </div>
            ) : (
              movers.map((m) => (
                <div key={`${m.brand}-${m.itemType}`} className="rounded-2xl border border-black/10 bg-white p-5">
                  <p className="text-[11px] font-medium capitalize text-black/40">{m.brand}</p>
                  <p className="font-naya-serif mt-0.5 text-lg font-light capitalize text-black">{m.itemType}</p>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="font-naya-serif text-2xl font-light text-black">${m.medianPrice.toFixed(0)}</span>
                    {m.trend30d !== 0 && (
                      <span className={`text-sm font-medium ${m.trend30d > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {m.trend30d > 0 ? '+' : ''}{m.trend30d}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-black/20">{m.count} listings</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-black/5 pt-8">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-black/20">naya data engine</p>
            <Link
              href="/"
              className="font-naya-sans text-[11px] uppercase tracking-[0.15em] text-black/30 transition-colors hover:text-black"
            >
              back to search
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
