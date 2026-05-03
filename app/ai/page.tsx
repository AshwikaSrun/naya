'use client';

import { useState } from 'react';
import Link from 'next/link';

interface PriceCheckResponse {
  query: string;
  medianPrice: number | null;
  p25: number | null;
  p75: number | null;
  count: number;
  priceRange: { min: number; max: number } | null;
  byPlatform: Record<string, { median: number; count: number }>;
  userPrice: number | null;
  dealScore: 'good' | 'fair' | 'high';
}

const NAV_LINKS = [
  { href: '/deals', label: 'deals' },
  { href: '/college', label: 'campus' },
  { href: '/insights', label: 'insights' },
  { href: '/ai', label: 'api', active: true },
];

const TIERS = [
  {
    name: 'pilot',
    price: 'free',
    monthly: '1,000 calls / month',
    blurb: 'for early-stage teams validating fit. no card required.',
    bullets: [
      'price-check + cross-listings',
      'shared rate limit',
      'community support',
    ],
    cta: 'start with sandbox',
    href: 'mailto:ashwikasrun@gmail.com?subject=naya%20api%20%E2%80%94%20pilot',
  },
  {
    name: 'growth',
    price: '$249',
    monthly: '50,000 calls / month',
    blurb: 'for growing apps shipping price intelligence to real users.',
    bullets: [
      'all v1 endpoints',
      'p99 logging + monthly reports',
      'email support, 24h sla',
    ],
    cta: 'request a key',
    href: 'mailto:ashwikasrun@gmail.com?subject=naya%20api%20%E2%80%94%20growth',
    featured: true,
  },
  {
    name: 'scale',
    price: 'talk to us',
    monthly: 'unmetered',
    blurb: 'for marketplaces, brokers, and inventory engines at volume.',
    bullets: [
      'private deployment options',
      'historical exports + webhooks',
      'shared slack channel, 4h sla',
    ],
    cta: 'book a call',
    href: 'mailto:ashwikasrun@gmail.com?subject=naya%20api%20%E2%80%94%20scale',
  },
];

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/v1/price-check',
    desc: 'median + p25/p75 + dealScore across resale platforms.',
  },
  {
    method: 'GET',
    path: '/v1/cross-listings',
    desc: 'find the same item, cheaper, on a different platform.',
  },
  {
    method: 'GET',
    path: '/v1/health',
    desc: 'liveness probe. no auth.',
  },
];

const SAMPLE_QUERIES = [
  'carhartt detroit jacket',
  'levi 501 vintage',
  'nike dunk panda',
  'patagonia retro pile',
];

export default function AiApiPage() {
  const [query, setQuery] = useState('carhartt detroit jacket');
  const [price, setPrice] = useState('');
  const [result, setResult] = useState<PriceCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const runDemo = async (q?: string) => {
    const finalQuery = (q ?? query).trim();
    if (!finalQuery) return;
    setQuery(finalQuery);
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const params = new URLSearchParams({ q: finalQuery });
      if (price && parseFloat(price) > 0) params.set('price', price);
      const r = await fetch(`/api/ai/demo?${params}`);
      if (!r.ok) {
        setErr('demo is offline. try again in a moment.');
        return;
      }
      const data = (await r.json()) as PriceCheckResponse;
      setResult(data);
    } catch {
      setErr('something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black"
          >
            naya
          </Link>
          <nav className="font-naya-sans hidden items-center gap-3 text-[10px] lowercase tracking-[0.15em] text-black/60 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 transition-colors ${
                  l.active ? 'text-black font-medium' : 'hover:text-black'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Hero */}
        <section className="mb-20">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.3em] text-black/30">
            naya / api
          </p>
          <h1 className="font-naya-serif mt-3 text-4xl font-light leading-[1.05] text-black md:text-6xl">
            the resale price
            <br />
            intelligence layer.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-black/55">
            one endpoint. real-time medians, p25/p75, and a deal score across
            ebay, grailed, depop, and poshmark. built for shopping apps,
            chrome extensions, and inventory engines.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#try"
              className="rounded-xl bg-black px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-80"
            >
              try it live
            </a>
            <a
              href="#pricing"
              className="rounded-xl border border-black/15 bg-white px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-black/70 transition-colors hover:border-black/40 hover:text-black"
            >
              see pricing
            </a>
            <span className="ml-1 text-[11px] tracking-wide text-black/35">
              no card. sandbox key in 30 seconds.
            </span>
          </div>
        </section>

        {/* Live demo */}
        <section id="try" className="mb-24">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/30">01</p>
          <h2 className="font-naya-serif mt-1 text-3xl font-light text-black">try it live</h2>
          <p className="mt-2 max-w-xl text-sm text-black/45">
            this hits <code className="rounded bg-black/5 px-1.5 py-0.5 text-[12px]">/api/price-check</code>{' '}
            on the public scraper. add a price to see the deal score for a
            specific listing.
          </p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runDemo()}
              placeholder="e.g. carhartt detroit jacket"
              className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black placeholder:text-black/25 focus:border-black/30 focus:outline-none"
            />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runDemo()}
              placeholder="listing price (optional)"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-black placeholder:text-black/25 focus:border-black/30 focus:outline-none md:w-56"
            />
            <button
              type="button"
              onClick={() => runDemo()}
              disabled={loading}
              className="rounded-xl bg-black px-6 py-3 text-[11px] uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {loading ? 'checking...' : 'price check'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {SAMPLE_QUERIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => runDemo(s)}
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] lowercase tracking-wide text-black/55 transition-colors hover:border-black/30 hover:text-black"
              >
                {s}
              </button>
            ))}
          </div>

          {err && (
            <p className="mt-6 text-sm text-rose-500">{err}</p>
          )}

          {result && result.medianPrice === null && (
            <p className="mt-6 rounded-xl border border-black/10 bg-white p-6 text-sm text-black/45">
              no observations for &quot;{result.query}&quot; yet — try a more popular query.
            </p>
          )}

          {result && result.medianPrice !== null && (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {/* Stats card */}
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">market median</p>
                <p className="font-naya-serif mt-1 text-5xl font-light text-black">
                  ${result.medianPrice.toFixed(0)}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-black/5 pt-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">p25</p>
                    <p className="font-naya-serif mt-1 text-2xl font-light text-black/70">
                      ${result.p25 != null ? result.p25.toFixed(0) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">p75</p>
                    <p className="font-naya-serif mt-1 text-2xl font-light text-black/70">
                      ${result.p75 != null ? result.p75.toFixed(0) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">range</p>
                    <p className="font-naya-serif mt-1 text-base font-light text-black/60">
                      {result.priceRange
                        ? `$${result.priceRange.min.toFixed(0)} – $${result.priceRange.max.toFixed(0)}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">listings</p>
                    <p className="font-naya-serif mt-1 text-base font-light text-black/60">
                      {result.count}
                    </p>
                  </div>
                </div>
              </div>

              {/* Deal score card */}
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">deal score</p>
                <div className="mt-3 flex items-baseline gap-3">
                  <span
                    className={`font-naya-serif text-5xl font-light ${
                      result.dealScore === 'good'
                        ? 'text-emerald-600'
                        : result.dealScore === 'high'
                          ? 'text-rose-500'
                          : 'text-black/60'
                    }`}
                  >
                    {result.dealScore}
                  </span>
                  {result.userPrice !== null && (
                    <span className="text-sm text-black/40">
                      at ${result.userPrice.toFixed(0)}
                    </span>
                  )}
                </div>
                <p className="mt-4 text-[13px] leading-relaxed text-black/55">
                  {result.userPrice === null
                    ? 'pass ?price= to score a specific listing. without it, we report the market neutrally.'
                    : result.dealScore === 'good'
                      ? `under p25 (${result.p25 != null ? '$' + result.p25.toFixed(0) : ''}). this is a strong buy vs the market.`
                      : result.dealScore === 'high'
                        ? `above p75 (${result.p75 != null ? '$' + result.p75.toFixed(0) : ''}). most listings are cheaper.`
                        : 'mid-market. fair vs comparable listings.'}
                </p>
                {Object.keys(result.byPlatform).length > 0 && (
                  <div className="mt-6 border-t border-black/5 pt-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-black/30">by platform</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(result.byPlatform).map(([p, stats]) => (
                        <div key={p} className="rounded-lg border border-black/5 bg-[#faf9f7] px-3 py-2">
                          <p className="text-[10px] capitalize tracking-wide text-black/45">{p}</p>
                          <p className="font-naya-serif text-base font-light text-black">
                            ${stats.median.toFixed(0)}
                            <span className="ml-1 text-[10px] text-black/30">
                              ({stats.count})
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Endpoints */}
        <section className="mb-24">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/30">02</p>
          <h2 className="font-naya-serif mt-1 text-3xl font-light text-black">endpoints</h2>
          <p className="mt-2 max-w-xl text-sm text-black/45">
            three routes. one bearer token. zero sdk required.
          </p>

          <div className="mt-6 divide-y divide-black/5 rounded-2xl border border-black/10 bg-white">
            {ENDPOINTS.map((ep) => (
              <div key={ep.path} className="flex flex-col gap-1 px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-black px-2 py-0.5 text-[10px] font-medium tracking-widest text-white">
                    {ep.method}
                  </span>
                  <code className="font-naya-sans text-[14px] text-black">{ep.path}</code>
                </div>
                <p className="text-sm text-black/50">{ep.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-black/10 bg-black p-6 font-mono text-[12.5px] leading-[1.7] text-white/85">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">curl</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre">{`curl 'https://scraper-api-production-d197.up.railway.app/v1/price-check?q=carhartt+detroit+jacket&price=180' \\
  -H 'Authorization: Bearer naya_<your_key>'

# → { medianPrice: 165, p25: 130, p75: 210,
#     dealScore: "fair", count: 23, ... }`}</pre>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mb-24">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/30">03</p>
          <h2 className="font-naya-serif mt-1 text-3xl font-light text-black">pricing</h2>
          <p className="mt-2 max-w-xl text-sm text-black/45">
            fair tiers. no per-call surprises. cancel anytime.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`flex flex-col rounded-2xl border p-7 ${
                  t.featured
                    ? 'border-black bg-black text-white'
                    : 'border-black/10 bg-white text-black'
                }`}
              >
                <p className={`text-[10px] uppercase tracking-[0.25em] ${t.featured ? 'text-white/50' : 'text-black/35'}`}>
                  {t.name}
                </p>
                <p className={`font-naya-serif mt-3 text-4xl font-light ${t.featured ? 'text-white' : 'text-black'}`}>
                  {t.price}
                </p>
                <p className={`mt-1 text-[12px] tracking-wide ${t.featured ? 'text-white/55' : 'text-black/45'}`}>
                  {t.monthly}
                </p>
                <p className={`mt-4 text-[13px] leading-relaxed ${t.featured ? 'text-white/70' : 'text-black/55'}`}>
                  {t.blurb}
                </p>
                <ul className={`mt-5 space-y-2 text-[13px] ${t.featured ? 'text-white/75' : 'text-black/65'}`}>
                  {t.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className={t.featured ? 'text-white/40' : 'text-black/30'}>—</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={t.href}
                  className={`mt-7 rounded-xl px-5 py-3 text-center text-[11px] uppercase tracking-[0.18em] transition-opacity hover:opacity-80 ${
                    t.featured ? 'bg-white text-black' : 'bg-black text-white'
                  }`}
                >
                  {t.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="mb-16 rounded-2xl border border-black/10 bg-white px-8 py-12 text-center md:px-16 md:py-16">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.3em] text-black/30">
            ready when you are
          </p>
          <h2 className="font-naya-serif mt-3 text-3xl font-light text-black md:text-4xl">
            ship resale intelligence in an afternoon.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-black/50">
            email{' '}
            <a className="underline decoration-black/20 underline-offset-4 hover:decoration-black" href="mailto:ashwikasrun@gmail.com?subject=naya%20api">
              ashwikasrun@gmail.com
            </a>{' '}
            with your use case. we&apos;ll send a sandbox key the same day.
          </p>
        </section>
      </main>

      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-2 px-6 py-8 text-[11px] tracking-wide text-black/40 md:flex-row md:items-center">
          <p>© naya — resale intelligence for the next decade of secondhand.</p>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-black">terms</Link>
            <Link href="/privacy" className="hover:text-black">privacy</Link>
            <a href="mailto:ashwikasrun@gmail.com" className="hover:text-black">contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
