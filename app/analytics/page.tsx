'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  range: string;
  installs: number;
  searches: number;
  clickThroughs: number;
  conversionRate: number;
  topQueries: { query: string; count: number }[];
  clicksBySource: { source: string; count: number }[];
}

const RANGES = [
  { label: '24h', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: 'all time', value: 'all' },
];

const SOURCE_COLORS: Record<string, string> = {
  ebay: '#E53238',
  grailed: '#000000',
  depop: '#FF2300',
  poshmark: '#7F0353',
  boiler_vintage: '#CDA349',
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      <p className="text-[10px] uppercase tracking-[0.15em] text-black/40">{label}</p>
      <p className="mt-2 font-naya-serif text-4xl font-light text-black">{value}</p>
      {sub && <p className="mt-1 text-xs text-black/40">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (r: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analytics?range=${r}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
    } catch {
      setError('Could not load analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  const maxQueryCount = data?.topQueries?.[0]?.count || 1;
  const maxSourceCount = data?.clicksBySource?.[0]?.count || 1;

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black">
            naya
          </Link>
          <nav className="font-naya-sans flex items-center gap-3 text-[10px] lowercase tracking-[0.15em] text-black/60">
            <Link href="/" className="px-3 py-1.5 transition-colors hover:text-black">search</Link>
            <Link href="/analytics" className="px-3 py-1.5 font-medium text-black">analytics</Link>
          </nav>
        </div>

        {/* Title + range picker */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-naya-serif text-3xl font-light text-black">analytics</h1>
            <p className="mt-1 text-xs text-black/40">track installs, searches, and click-throughs</p>
          </div>
          <div className="flex gap-1 rounded-full border border-black/10 bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`rounded-full px-4 py-1.5 text-[10px] lowercase tracking-[0.1em] transition-all ${
                  range === r.value
                    ? 'bg-black text-white'
                    : 'text-black/50 hover:text-black'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black/60" />
          </div>
        ) : data ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="installs" value={data.installs} sub="app downloads" />
              <StatCard label="searches" value={data.searches.toLocaleString()} sub="total queries" />
              <StatCard label="click-throughs" value={data.clickThroughs.toLocaleString()} sub="to external sites" />
              <StatCard label="conversion" value={`${data.conversionRate}%`} sub="search → click" />
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {/* Top searches */}
              <div className="rounded-2xl border border-black/5 bg-white p-6">
                <h2 className="mb-4 text-[10px] uppercase tracking-[0.15em] text-black/40">top searches</h2>
                {data.topQueries.length === 0 ? (
                  <p className="py-4 text-center text-xs text-black/30">no searches yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.topQueries.map((q, i) => (
                      <div key={q.query} className="flex items-center gap-3">
                        <span className="w-5 text-right text-[10px] font-medium text-black/25">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-black/80">{q.query}</span>
                            <span className="text-xs tabular-nums text-black/40">{q.count}</span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/5">
                            <div
                              className="h-full rounded-full bg-black/20 transition-all"
                              style={{ width: `${(q.count / maxQueryCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clicks by platform */}
              <div className="rounded-2xl border border-black/5 bg-white p-6">
                <h2 className="mb-4 text-[10px] uppercase tracking-[0.15em] text-black/40">clicks by platform</h2>
                {data.clicksBySource.length === 0 ? (
                  <p className="py-4 text-center text-xs text-black/30">no clicks yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.clicksBySource.map((s) => (
                      <div key={s.source} className="flex items-center gap-3">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: SOURCE_COLORS[s.source] || '#999' }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm capitalize text-black/80">{s.source.replace(/_/g, ' ')}</span>
                            <span className="text-xs tabular-nums text-black/40">{s.count}</span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/5">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(s.count / maxSourceCount) * 100}%`,
                                backgroundColor: SOURCE_COLORS[s.source] || '#999',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Funnel visualization */}
            <div className="mt-8 rounded-2xl border border-black/5 bg-white p-6">
              <h2 className="mb-6 text-[10px] uppercase tracking-[0.15em] text-black/40">conversion funnel</h2>
              <div className="flex items-end justify-center gap-8 md:gap-16">
                <FunnelStep label="searches" value={data.searches} pct={100} />
                <div className="mb-6 text-black/20">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
                <FunnelStep
                  label="click-throughs"
                  value={data.clickThroughs}
                  pct={data.searches > 0 ? (data.clickThroughs / data.searches) * 100 : 0}
                />
                <div className="mb-6 text-black/20">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
                <FunnelStep label="installs" value={data.installs} pct={data.searches > 0 ? (data.installs / data.searches) * 100 : 0} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function FunnelStep({ label, value, pct }: { label: string; value: number; pct: number }) {
  const barHeight = Math.max(20, Math.min(120, pct * 1.2));
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-naya-serif text-2xl font-light text-black">{value.toLocaleString()}</span>
      <div
        className="w-16 rounded-t-lg bg-black/10 transition-all sm:w-20"
        style={{ height: `${barHeight}px` }}
      />
      <span className="text-[10px] uppercase tracking-[0.1em] text-black/40">{label}</span>
      {pct < 100 && (
        <span className="text-[10px] tabular-nums text-black/30">{pct.toFixed(1)}%</span>
      )}
    </div>
  );
}
