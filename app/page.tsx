'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import BottomSearchBar from '@/components/BottomSearchBar';
import ResultsGrid from '@/components/ResultsGrid';
import CartPanel from '@/components/CartPanel';
import { triggerInstall, isIOSDevice } from '@/components/InstallPrompt';
import { useNayaSearch, SEARCH_LIMIT } from '@/lib/useNayaSearch';
import NewFindsSection from '@/components/NewFindsSection';
import CampusProductGrid from '@/components/CampusProductGrid';
import { ALL_CAMPUSES } from '@/lib/campuses';

const NAV_LINKS = [
  { href: '/editorial', label: 'editorial' },
  { href: '/brands', label: 'brands' },
  { href: '/deals', label: 'deals' },
  { href: '/featured', label: 'featured' },
  { href: '/college', label: 'campus' },
  { href: '/app', label: 'concierge' },
  { href: '/profile', label: 'profile' },
];

const DEFAULT_TRENDING = [
  'vintage carhartt jacket',
  'baggy levi 550',
  'y2k zip hoodie',
  'vintage nike crewneck',
  'vintage purdue hoodie',
];

type PreviewProduct = {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark';
};

export default function Home() {
  const s = useNayaSearch(DEFAULT_TRENDING);
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/new-finds?preset=default')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const raw = (data.items || []) as (PreviewProduct & { source?: string })[];
        const mapped = raw.map((p) => ({
          ...p,
          source: (['ebay', 'grailed', 'depop', 'poshmark'].includes(p.source || '') ? p.source : 'ebay') as PreviewProduct['source'],
        }));
        setPreviewProducts(mapped);
      })
      .catch(() => { if (!cancelled) setPreviewProducts([]); });
    return () => { cancelled = true; };
  }, []);

  const brandCards = [
    { name: 'Ralph Lauren', image: 'Ralph Lauren.png', query: 'Ralph Lauren' },
    { name: 'Polo Sport', image: 'Polo Sport.png', query: 'Polo Sport' },
    { name: 'Pacsun', image: 'Pacsun.png', query: 'Pacsun' },
    { name: 'Princess Polly', image: 'Princess Polly.png', query: 'Princess Polly' },
    { name: 'Carhartt', image: 'Carhartt.png', query: 'Carhartt' },
    { name: 'Zara', image: 'zara.jpg', query: 'Zara' },
  ];

  const featuredCategories = [
    { title: 'Vintage denim', description: '501s, cargos, and lived-in washes.', query: 'vintage denim' },
    { title: 'Outerwear', description: 'Leather, puffers, and layered classics.', query: 'vintage outerwear' },
    { title: 'Graphic tees', description: 'Band tees, sports, and pop culture.', query: 'vintage graphic tee' },
    { title: 'Accessories', description: 'Bags, belts, and statement jewelry.', query: 'vintage accessories' },
  ];

  const dailyFinds = useMemo(() => {
    const allFinds = [
      { title: 'Vintage Carhartt Jacket', query: 'vintage carhartt jacket', priceRange: 'under $80' },
      { title: 'Nike Vintage Crewneck', query: 'vintage nike crewneck', priceRange: 'under $40' },
      { title: "Levi's 501 Jeans", query: 'vintage levi 501', priceRange: 'under $50' },
      { title: 'Vintage Purdue Hoodie', query: 'vintage purdue hoodie', priceRange: 'under $45' },
      { title: 'Y2K Zip Hoodie', query: 'y2k zip hoodie', priceRange: 'under $35' },
      { title: 'Ralph Lauren Polo', query: 'vintage ralph lauren polo', priceRange: 'under $30' },
      { title: 'Vintage Band Tee', query: 'vintage band tee', priceRange: 'under $35' },
      { title: 'North Face Puffer', query: 'vintage north face puffer', priceRange: 'under $90' },
      { title: 'Vintage Starter Jacket', query: 'vintage starter jacket', priceRange: 'under $70' },
      { title: 'Adidas Track Jacket', query: 'vintage adidas track jacket', priceRange: 'under $45' },
      { title: 'Vintage Champion Hoodie', query: 'vintage champion hoodie', priceRange: 'under $40' },
      { title: 'Baggy Levi 550', query: 'levi 550 baggy', priceRange: 'under $45' },
    ];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const startIdx = (dayOfYear * 3) % allFinds.length;
    return Array.from({ length: 4 }, (_, i) => allFinds[(startIdx + i) % allFinds.length]);
  }, []);

  const [showIOSInstall, setShowIOSInstall] = useState(false);

  const productFeatures = [
    {
      tag: 'discover',
      title: 'find it before anyone else.',
      description: 'search eBay, Grailed, Depop, and Poshmark at once. the best pieces, before they sell out.',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      tag: 'quality',
      title: 'no junk. only real finds.',
      description: 'smart scoring surfaces the best vintage pieces and hides everything else.',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
    },
    {
      tag: 'deals',
      title: 'always get the best price.',
      description: 'see the same piece listed across multiple sites. grab the cheapest one instantly.',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      tag: 'saves',
      title: 'one listing, best price.',
      description: 'when the same item appears on multiple sites, naya keeps the cheapest one.',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M17.5 14v7m-3.5-3.5h7" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      tag: 'style',
      title: 'describe your vibe. we\'ll find it.',
      description: 'tell us what you\'re going for. naya finds pieces that match your style — no keywords needed.',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      tag: 'campus',
      title: 'vintage campus gear, cheap.',
      description: 'vintage Purdue gear, Carhartt jackets, and streetwear deals — all at student prices.',
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 12v5c3 3 9 3 12 0v-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  const [activeFeature, setActiveFeature] = useState(0);
  const featureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startFeatureTimer = useCallback(() => {
    if (featureTimerRef.current) clearInterval(featureTimerRef.current);
    featureTimerRef.current = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % productFeatures.length);
    }, 3500);
  }, [productFeatures.length]);

  useEffect(() => {
    startFeatureTimer();
    return () => { if (featureTimerRef.current) clearInterval(featureTimerRef.current); };
  }, [startFeatureTimer]);

  const handleFeatureClick = (index: number) => {
    setActiveFeature(index);
    startFeatureTimer();
  };

  const buildSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  /* ================================================================
     RESULTS MODE
     ================================================================ */
  if (s.results || s.loading) {
    return (
      <div className="min-h-screen bg-white pb-32">
        <header className="sticky top-0 z-40 border-b border-black/5 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black" onClick={() => s.clearResults()}>
              naya
            </Link>
            <div className="flex items-center gap-3">
              <nav className="font-naya-sans hidden items-center gap-3 text-[10px] lowercase tracking-[0.15em] text-black/60 md:flex">
                {NAV_LINKS.slice(0, 3).map((link) => (
                  <Link key={link.href} href={link.href} className="px-3 py-1.5 transition-colors hover:text-black">
                    {link.label}
                  </Link>
                ))}
              </nav>
              {s.userEmail && (
                <span className={`hidden rounded-full px-3 py-1 text-[10px] tracking-wide md:inline ${
                  s.isPurdue ? 'bg-amber-50 font-medium text-amber-800' : 'bg-neutral-100 text-black/40'
                }`}>
                  {s.isPurdue ? '✦ purdue unlimited' : `${Math.max(0, SEARCH_LIMIT - s.searchCount)} searches left`}
                </span>
              )}
              <button type="button" onClick={() => s.setCartOpen(true)} className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5" aria-label="Open cart">
                <svg className="h-5 w-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {s.cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white">{s.cartCount}</span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 pt-8 text-center">
          <p className="font-naya-serif text-xl font-light italic text-black/70 md:text-2xl">{s.query}</p>
          <button type="button" onClick={s.handleShareSearch} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-1.5 text-[10px] lowercase tracking-[0.1em] text-black/40 transition-colors hover:border-black/20 hover:text-black/60">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            {s.shareCopied ? 'link copied!' : 'share these finds'}
          </button>
        </div>

        {s.loading && (
          <div className="mx-auto max-w-7xl px-6 pt-6">
            <div className="flex flex-col items-center py-8">
              <div className="flex flex-wrap justify-center gap-2">
                {s.activePlatforms.map((p) => {
                  const status = s.platformStatus[p];
                  return (
                    <span key={p} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] tracking-wide transition-all duration-300 ${status === 'done' ? 'bg-emerald-50 text-emerald-600' : status === 'error' ? 'bg-red-50 text-red-400' : 'bg-neutral-100 text-black/40'}`}>
                      {status === 'done' ? (
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : status === 'error' ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      ) : (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                      )}
                      {p}
                    </span>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-black/25">results appear as each marketplace responds</p>
            </div>
          </div>
        )}

        {s.error && (
          <div className="mx-auto max-w-md px-6 pt-12 text-center">
            <p className="text-sm text-black/60">{s.error}</p>
          </div>
        )}

        {!s.loading && s.results && (
          <div className="mx-auto max-w-7xl px-6 pt-6">
            <ResultsGrid results={s.results} filters={s.filters} />
          </div>
        )}

        <BottomSearchBar onSearch={s.handleSearch} disabled={s.loading} />
        <CartPanel open={s.cartOpen} onClose={() => s.setCartOpen(false)} />
      </div>
    );
  }

  /* ================================================================
     HERO MODE — landing page
     ================================================================ */
  return (
    <div className="min-h-screen bg-night-bg">
      {/* Hero */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/brands/browser.png')" }}></div>
        <div className="absolute inset-0 bg-black/50"></div>

        {/* Nav */}
        <div className="absolute inset-x-0 top-0 z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
            <Link href="/" className="font-naya-serif text-3xl font-light lowercase tracking-[0.15em] text-white md:text-4xl">
              naya
            </Link>
            <div className="flex items-center gap-4">
              <nav className="font-naya-sans hidden items-center gap-4 text-[10px] lowercase tracking-[0.15em] md:flex">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="text-white/70 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                ))}
              </nav>

              <button type="button" onClick={() => s.setCartOpen(true)} className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10" aria-label="Open cart">
                <svg className="h-5 w-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {s.cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-black">{s.cartCount}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-3xl px-6 text-center">
          <h1 className="font-naya-serif text-4xl font-light lowercase text-white md:text-6xl lg:text-7xl">
            what are you looking for?
          </h1>
          <p className="font-naya-sans mt-4 text-xs lowercase tracking-[0.12em] text-white/60 md:text-sm">
            the entire resale market in one search
          </p>
          <div className="mt-8">
            <SearchBar onSearch={s.handleSearch} disabled={s.loading} value={s.searchInput} onValueChange={s.setSearchInput} showTabs />
          </div>
          <Link href="/college" className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-[11px] lowercase tracking-[0.12em] text-white/90 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/15">
            <span>choose your campus</span>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </section>

      {/* ── New Finds Feed ── */}
      <NewFindsSection onSearch={s.handleSearch} />

      {/* ── Trending ── */}
      {s.trendingSearches.length > 0 && (
        <section className="bg-night-bg px-6 py-16 md:px-10">
          <div className="mx-auto max-w-5xl">
            <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">trending now</p>
            <h2 className="font-naya-serif mt-3 text-2xl font-light text-text-primary md:text-4xl">trending at purdue.</h2>
            <div className="mt-8 space-y-1">
              {s.trendingSearches.map((tq, i) => (
                <button key={tq} type="button" onClick={() => s.handleSearch(tq)} className="group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-all hover:bg-black/[0.03]">
                  <span className="font-naya-serif w-8 text-2xl font-extralight text-black/15 md:text-3xl">{i + 1}</span>
                  <span className="font-naya-serif text-lg font-light text-text-primary transition-colors group-hover:text-black md:text-xl">{tq}</span>
                  <svg className="ml-auto h-4 w-4 shrink-0 text-black/10 transition-all group-hover:translate-x-1 group-hover:text-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>

            {(previewProducts === null || previewProducts.length > 0) && (
              <>
                <p className="font-naya-sans mt-12 text-[10px] lowercase tracking-[0.2em] text-text-muted">picked for you</p>
                <div className="mt-4">
                  {previewProducts === null ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-neutral-100" />
                      ))}
                    </div>
                  ) : (
                    <CampusProductGrid products={previewProducts.slice(0, 6)} columns={6} />
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── Product Features — rotating showcase ── */}
      <section className="bg-night-bg px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">how it works</p>
          <h2 className="font-naya-serif mt-4 text-3xl font-light text-text-primary md:text-5xl">treasure hunting for vintage clothes.</h2>
          <div className="mt-16 grid gap-10 md:grid-cols-[280px_1fr] md:gap-16">
            <div className="flex flex-row gap-1 overflow-x-auto md:flex-col md:gap-0 md:overflow-x-visible">
              {productFeatures.map((feat, i) => (
                <button key={feat.tag} type="button" onClick={() => handleFeatureClick(i)} className={`group relative flex-shrink-0 rounded-lg px-4 py-3 text-left transition-all duration-300 md:px-5 md:py-4 ${activeFeature === i ? 'bg-black/[0.04]' : 'hover:bg-black/[0.02]'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-naya-serif text-lg font-extralight transition-colors duration-300 ${activeFeature === i ? 'text-text-primary' : 'text-black/15'}`}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={`text-[10px] font-medium lowercase tracking-[0.1em] transition-colors duration-300 md:text-[11px] ${activeFeature === i ? 'text-text-primary' : 'text-text-muted'}`}>{feat.tag}</span>
                  </div>
                  {activeFeature === i && (
                    <div className="absolute bottom-0 left-4 right-4 h-[2px] overflow-hidden rounded-full bg-black/[0.06] md:left-5 md:right-5">
                      <div className="h-full rounded-full bg-black/25" style={{ animation: 'featureProgress 3.5s linear' }} />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="relative min-h-[260px]">
              {productFeatures.map((feat, i) => (
                <div key={feat.tag} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${activeFeature === i ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>
                  <div className="text-black/10">{feat.icon}</div>
                  <h3 className="font-naya-serif mt-6 text-2xl font-light text-text-primary md:text-4xl lg:text-5xl">{feat.title}</h3>
                  <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-text-muted md:text-base">{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`@keyframes featureProgress { from { width: 0%; } to { width: 100%; } }`}</style>

      {/* ── Brand Spotlight ── */}
      <section className="bg-[#111] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-white/35">brands</p>
              <h2 className="font-naya-serif mt-3 text-3xl font-light text-white md:text-5xl">shop by brand.</h2>
            </div>
            <Link href="/brands" className="hidden text-[10px] lowercase tracking-[0.15em] text-white/40 transition-colors hover:text-white md:inline-block">view all</Link>
          </div>
          <div className="grid auto-rows-[260px] grid-cols-2 gap-2 sm:auto-rows-[340px] md:grid-cols-4 md:gap-3">
            {brandCards.map((brand, i) => {
              const isFeature = i === 0 || i === 3;
              return (
                <button key={brand.name} type="button" onClick={() => s.handleSearch(brand.query)} className={`group relative overflow-hidden rounded-xl ${isFeature ? 'col-span-2' : ''}`}>
                  <img src={encodeURI(`/brands/${brand.image}`)} alt={brand.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="font-naya-serif text-lg font-light lowercase text-white md:text-xl">{brand.name.toLowerCase()}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex justify-center md:hidden">
            <Link href="/brands" className="text-[10px] lowercase tracking-[0.15em] text-white/40 transition-colors hover:text-white">view all brands</Link>
          </div>
        </div>
      </section>

      {/* ── Featured Categories ── */}
      <section className="bg-white px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">categories</p>
          <h2 className="font-naya-serif mt-3 text-3xl font-light text-text-primary md:text-5xl">find something you&apos;ll actually wear.</h2>
          <div className="mt-14 grid gap-3 md:grid-cols-2">
            {featuredCategories.map((cat) => (
              <button key={cat.title} type="button" onClick={() => s.handleSearch(cat.query)} className="group flex items-center justify-between rounded-xl bg-[#f6f5f3] px-8 py-8 text-left transition-all hover:bg-[#efeee9]">
                <div>
                  <p className="font-naya-serif text-2xl font-light lowercase text-text-primary md:text-3xl">{cat.title.toLowerCase()}</p>
                  <p className="mt-2 text-xs font-light lowercase tracking-[0.04em] text-text-muted">{cat.description.toLowerCase()}</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-black/15 transition-transform duration-500 group-hover:translate-x-1.5 group-hover:text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Campus Mode ── */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/brands/coll2.jpg')" }}></div>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-white/40">campus mode</p>
          <h2 className="font-naya-serif mt-3 text-3xl font-light text-white md:text-5xl">trending at your school.</h2>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-white/65">choose your campus for localized trending searches, vintage merch, and picks tailored to your school.</p>
          <div className="mt-10 flex flex-wrap gap-2">
            {ALL_CAMPUSES.slice(0, 8).map((c) => (
              <Link key={c.slug} href={`/campus/${c.slug}`} className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-[10px] lowercase tracking-[0.12em] text-white/75 transition-colors hover:border-white/50 hover:text-white">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                {c.name.toLowerCase()}
              </Link>
            ))}
          </div>
          <Link href="/college" className="mt-10 inline-block text-[10px] lowercase tracking-[0.15em] text-white/50 transition-colors hover:text-white">choose your campus →</Link>
        </div>
      </section>

      {/* ── Today's Best Finds ── */}
      <section className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">updated daily</p>
          <h2 className="font-naya-serif mt-3 text-3xl font-light text-text-primary md:text-5xl">today&apos;s best finds.</h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {dailyFinds.map((find) => (
              <button key={find.query} type="button" onClick={() => s.handleSearch(find.query)} className="group flex items-center justify-between rounded-xl border border-black/[0.06] px-6 py-5 text-left transition-all hover:border-black/15 hover:shadow-sm">
                <div>
                  <p className="font-naya-serif text-lg font-light text-text-primary md:text-xl">{find.title.toLowerCase()}</p>
                  <p className="mt-1 text-xs text-text-muted">{find.priceRange}</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-black/10 transition-transform duration-500 group-hover:translate-x-1.5 group-hover:text-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recently Viewed ── */}
      <section className="bg-night-bg px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">recently viewed</p>
          <h2 className="font-naya-serif mt-3 text-2xl font-light text-text-primary md:text-4xl">pick up where you left off.</h2>
          <div className="mt-10">
            {s.recentlyViewed.length === 0 ? (
              <p className="text-sm text-text-muted">Browse a few listings and your recently viewed items will show up here.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {s.recentlyViewed.map((item) => {
                  const displayImage = item.source === 'depop' ? item.image.replace(/\/P\d+(\.\w+)$/i, '/P1$1') : item.image;
                  return (
                    <Link key={`${item.source}-${item.url}`} href={`/product/${buildSlug(item.title) || 'item'}?${new URLSearchParams({ title: item.title, price: item.price.toFixed(2), image: item.image, url: item.url, source: item.source }).toString()}`} className="group overflow-hidden rounded-2xl bg-white transition-all hover:shadow-soft">
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
                        <img src={displayImage} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onError={(e) => { if (displayImage !== item.image) e.currentTarget.src = item.image; }} />
                      </div>
                      <div className="p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">{item.source}</p>
                        <p className="mt-2 line-clamp-2 text-sm font-medium text-text-primary">{item.title}</p>
                        <p className="mt-2 text-sm font-semibold text-text-secondary">${item.price.toFixed(2)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Get the App ── */}
      <section className="bg-[#111] px-6 py-24 md:px-10">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-white/35">get the app</p>
            <h2 className="font-naya-serif mt-4 text-3xl font-light text-white md:text-5xl">naya on your home screen.</h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-white/50">one tap and naya lives on your home screen. faster finds, no app store needed.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => { if (!triggerInstall() && isIOSDevice()) { setShowIOSInstall(true); } }} className="rounded-full bg-white px-6 py-3.5 text-[10px] font-medium lowercase tracking-[0.12em] text-black transition-opacity hover:opacity-85">install naya</button>
            <Link href="/app" className="mt-3 text-center text-[10px] lowercase tracking-[0.15em] text-white/40 transition-colors hover:text-white">or try the AI concierge</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-night-bg px-6 py-14 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="font-naya-serif text-lg font-light lowercase tracking-[0.12em] text-text-primary">naya</span>
            <span className="text-[10px] text-text-muted">&copy; 2026</span>
          </div>
          <div className="flex flex-wrap gap-6 text-[10px] lowercase tracking-[0.12em] text-text-muted">
            <Link href="/privacy" className="transition-colors hover:text-text-primary">privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-text-primary">terms</Link>
            <a href="mailto:hello@naya.app" className="transition-colors hover:text-text-primary">contact</a>
          </div>
        </div>
      </footer>

      {/* ── Email capture modal ── */}
      {s.showEmailGate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="font-naya-serif text-2xl font-light text-black">let&apos;s find your next favorite piece</h2>
            <p className="font-naya-sans mt-2 text-sm text-black/50">drop your email to start discovering vintage finds. no waitlist, no spam.</p>
            <form onSubmit={s.handleEmailSubmit} className="mt-6">
              <input type="email" value={s.emailInput} onChange={(e) => s.setEmailInput(e.target.value)} placeholder="your email" required autoComplete="email" autoCapitalize="none" inputMode="email" autoFocus className="font-naya-sans w-full rounded-full border border-black/10 bg-neutral-50 px-5 py-3.5 text-base text-black placeholder:text-black/30 focus:border-black/30 focus:outline-none" />
              {s.emailError && <p className="font-naya-sans mt-2 text-xs text-red-500">{s.emailError}</p>}
              <button type="submit" disabled={s.emailLoading || !s.emailInput.trim()} className="mt-4 w-full rounded-full bg-black px-6 py-3.5 text-[11px] font-medium lowercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:opacity-40">
                {s.emailLoading ? 'one sec...' : 'start finding deals'}
              </button>
            </form>
            <div className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-center">
              <p className="font-naya-sans text-[11px] font-medium text-amber-900">purdue students get unlimited searches</p>
              <p className="font-naya-sans mt-0.5 text-[10px] text-amber-700/70">use your @purdue.edu email for full access</p>
            </div>
            <button type="button" onClick={() => { s.setShowEmailGate(false); s.pendingSearchRef.current = null; }} className="font-naya-sans mt-4 w-full py-2 text-[11px] text-black/30 transition-colors hover:text-black/50">maybe later</button>
          </div>
        </div>
      )}

      {/* ── Search limit reached modal ── */}
      {s.showLimitGate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="font-naya-serif text-2xl font-light text-black">you&apos;ve used all {SEARCH_LIMIT} searches</h2>
            <p className="font-naya-sans mt-2 text-sm text-black/50">want unlimited access? sign in with your @purdue.edu email.</p>
            <form onSubmit={s.handleEmailSubmit} className="mt-6">
              <input type="email" value={s.emailInput} onChange={(e) => s.setEmailInput(e.target.value)} placeholder="you@purdue.edu" required autoComplete="email" autoCapitalize="none" inputMode="email" autoFocus className="font-naya-sans w-full rounded-full border border-black/10 bg-neutral-50 px-5 py-3.5 text-base text-black placeholder:text-black/30 focus:border-black/30 focus:outline-none" />
              {s.emailError && <p className="font-naya-sans mt-2 text-xs text-red-500">{s.emailError}</p>}
              <button type="submit" disabled={s.emailLoading || !s.emailInput.trim()} className="mt-4 w-full rounded-full bg-black px-6 py-3.5 text-[11px] font-medium lowercase tracking-[0.1em] text-white transition-opacity hover:opacity-90 disabled:opacity-40">
                {s.emailLoading ? 'one sec...' : 'unlock unlimited searches'}
              </button>
            </form>
            <button type="button" onClick={() => { s.setShowLimitGate(false); s.pendingSearchRef.current = null; }} className="font-naya-sans mt-4 w-full py-2 text-[11px] text-black/30 transition-colors hover:text-black/50">close</button>
          </div>
        </div>
      )}

      {/* ── iOS install instructions modal ── */}
      {showIOSInstall && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
          <div className="mx-4 mb-6 w-full max-w-sm overflow-hidden rounded-2xl bg-white p-8 shadow-2xl sm:mb-0">
            <div className="flex items-center gap-3">
              <img src="/icon-192.png" alt="naya" className="h-12 w-12 rounded-xl" />
              <div>
                <p className="font-naya-serif text-xl font-light text-black">install naya</p>
                <p className="text-xs text-text-muted">add to your home screen</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">1</span>
                <p className="text-sm text-text-secondary">
                  tap the share button{' '}
                  <svg className="inline h-4 w-4 align-text-bottom text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" /></svg>{' '}
                  in the browser toolbar
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">2</span>
                <p className="text-sm text-text-secondary">scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">3</span>
                <p className="text-sm text-text-secondary">tap <strong>&quot;Add&quot;</strong> — that&apos;s it, naya is on your home screen</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowIOSInstall(false)} className="mt-6 w-full rounded-full bg-black py-3.5 text-[11px] font-medium lowercase tracking-[0.1em] text-white transition-opacity hover:opacity-90">got it</button>
          </div>
        </div>
      )}

      {/* ── Cart panel ── */}
      <CartPanel open={s.cartOpen} onClose={() => s.setCartOpen(false)} />
    </div>
  );
}
