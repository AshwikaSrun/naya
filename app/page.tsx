'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BottomSearchBar from '@/components/BottomSearchBar';
import ResultsGrid from '@/components/ResultsGrid';
import CartPanel from '@/components/CartPanel';
import { useNayaSearch } from '@/lib/useNayaSearch';
import GetNayaBanner from '@/components/GetNayaBanner';
import EmailSignup from '@/components/EmailSignup';
import NewFindsSection from '@/components/NewFindsSection';
import CampusProductGrid from '@/components/CampusProductGrid';
import { ALL_CAMPUSES } from '@/lib/campuses';
import MobileNav from '@/components/MobileNav';
import TrendingCards from '@/components/TrendingCards';
import CampusModeTeaser from '@/components/CampusModeTeaser';
import StickyHeader from '@/components/StickyHeader';
import EditorialHero from '@/components/EditorialHero';
import BrandSpotlight from '@/components/BrandSpotlight';
import Reveal from '@/components/Reveal';

const NAV_LINKS = [
  { href: '/deals', label: 'deals' },
  { href: '/college', label: 'campus' },
  { href: '/insights', label: 'insights' },
  { href: '/app', label: 'concierge' },
  { href: '/profile', label: 'profile' },
];

const DEFAULT_TRENDING = [
  { label: 'vintage carhartt jacket worn in', query: 'vintage carhartt jacket worn' },
  { label: 'baggy denim faded levis 569', query: 'vintage levi 569 faded' },
  { label: 'oversized hoodie washed vintage', query: 'oversized vintage hoodie washed' },
  { label: 'graphic tee faded vintage clean', query: 'vintage graphic tee faded' },
  { label: 'carhartt double knee pants faded', query: 'carhartt double knee faded' },
  { label: 'distressed knit sweater oversized', query: 'oversized vintage knit sweater distressed' },
  { label: 'isabel marrant', query: 'isabel marant vintage' },
];

type PreviewProduct = {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark' | 'boiler_vintage';
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
          source: (['ebay', 'grailed', 'depop', 'poshmark', 'boiler_vintage'].includes(p.source || '') ? p.source : 'ebay') as PreviewProduct['source'],
        }));
        setPreviewProducts(mapped);
      })
      .catch(() => { if (!cancelled) setPreviewProducts([]); });
    return () => { cancelled = true; };
  }, []);

  /* ================================================================
     RESULTS MODE
     ================================================================ */
  if (s.results || s.loading) {
    return (
      <div className="min-h-screen bg-white pb-32">
        <header className="sticky top-0 z-40 border-b border-black/5 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3">
            <Link href="/" className="font-naya-serif shrink-0 text-2xl font-light lowercase tracking-[0.12em] text-black" onClick={() => s.clearResults()}>
              naya
            </Link>
            <form
              className="relative flex min-w-0 flex-1 items-center"
              onSubmit={(e) => { e.preventDefault(); const v = s.searchInput.trim(); if (v) s.handleSearch(v); }}
            >
              <svg className="pointer-events-none absolute left-3 h-4 w-4 text-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={s.searchInput}
                onChange={(e) => s.setSearchInput(e.target.value)}
                placeholder="search vintage, brands, styles..."
                className="h-9 w-full rounded-full border border-black/8 bg-neutral-50 pl-9 pr-4 text-[13px] text-black placeholder:text-black/30 focus:border-black/20 focus:outline-none"
              />
            </form>
            <div className="flex shrink-0 items-center gap-2">
              <nav className="font-naya-sans hidden items-center gap-2 text-[10px] lowercase tracking-[0.15em] text-black/60 lg:flex">
                {NAV_LINKS.slice(0, 3).map((link) => (
                  <Link key={link.href} href={link.href} className="px-2 py-1.5 transition-colors hover:text-black">
                    {link.label}
                  </Link>
                ))}
              </nav>
              <button type="button" onClick={() => s.setCartOpen(true)} className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5" aria-label="Open cart">
                <svg className="h-5 w-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {s.cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white">{s.cartCount}</span>
                )}
              </button>
              <MobileNav />
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
            <ResultsGrid results={s.results} filters={s.filters} onSearch={s.handleSearch} relatedSearches={DEFAULT_TRENDING} />
          </div>
        )}

        <BottomSearchBar
          onSearch={s.handleSearch}
          disabled={s.loading}
          trending={s.trendingSearches}
          saved={s.savedSearches}
          recentlyViewed={s.recentlyViewed}
        />
        <CartPanel open={s.cartOpen} onClose={() => s.setCartOpen(false)} />
      </div>
    );
  }

  /* ================================================================
     HERO MODE — landing page
     ================================================================ */
  return (
    <div className="min-h-screen bg-night-bg">
      <StickyHeader
        navLinks={NAV_LINKS}
        cartCount={s.cartCount}
        onCartClick={() => s.setCartOpen(true)}
        onSearch={s.handleSearch}
        searchValue={s.searchInput}
        onSearchValueChange={s.setSearchInput}
        trending={s.trendingSearches.length ? s.trendingSearches : DEFAULT_TRENDING}
        saved={s.savedSearches}
        recentlyViewed={s.recentlyViewed}
        overHero={false}
      />

      <EditorialHero
        onSearch={s.handleSearch}
        searchValue={s.searchInput}
        onSearchValueChange={s.setSearchInput}
        trending={s.trendingSearches.length ? s.trendingSearches : DEFAULT_TRENDING}
        saved={s.savedSearches}
        recentlyViewed={s.recentlyViewed}
        ctaLabel="shop your campus"
        ctaHref="/college"
        findsEndpoint="/api/new-finds?preset=curated"
        backgroundImage="/brands/browser.png"
      />

      {/* ── New Finds Feed — the main "live marketplace" moment ── */}
      <Reveal>
        <NewFindsSection onSearch={s.handleSearch} />
      </Reveal>

      {/* ── Shop by Brand — editorial image grid ── */}
      <Reveal>
        <BrandSpotlight />
      </Reveal>

      {/* ── Trending picks (visual cards + live product row) ── */}
      {s.trendingSearches.length > 0 && (
        <Reveal as="section" className="bg-night-bg px-6 py-24 md:px-10 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/50">this week</p>
                <h2 className="font-naya-serif mt-3 text-4xl font-light leading-[1.05] tracking-[-0.01em] text-black md:text-6xl">
                  trending <span className="italic text-black/75">right now.</span>
                </h2>
              </div>
              <Link href="/finds" className="font-naya-sans hidden text-[10px] uppercase tracking-[0.22em] text-black/50 transition-colors hover:text-black md:inline-block">
                view all →
              </Link>
            </div>
            <TrendingCards
              trends={s.trendingSearches}
              onPick={s.handleSearch}
              previewProducts={previewProducts}
              contextLabel="this week"
            />

            {(previewProducts === null || previewProducts.length > 0) && (
              <>
                <p className="font-naya-sans mt-16 text-[10px] uppercase tracking-[0.28em] text-black/50">picked for you</p>
                <div className="mt-5">
                  {previewProducts === null ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="naya-skeleton aspect-[4/5] rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <CampusProductGrid products={previewProducts.slice(0, 6)} columns={6} />
                  )}
                </div>
              </>
            )}
          </div>
        </Reveal>
      )}

      {/* ── Campus Mode (single moment, unified with teaser) ── */}
      <Reveal>
        <CampusModeTeaser campuses={ALL_CAMPUSES} />
      </Reveal>

      {/* ── App / Extension — the single dark "moment" of the page ── */}
      <Reveal>
        <GetNayaBanner variant="full" />
      </Reveal>

      {/* ── Stay in the Loop — continues the dark section ── */}
      <Reveal as="section" className="bg-[#0a0a0a] px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-md text-center">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-white/45">stay in the loop</p>
          <h2 className="font-naya-serif mt-4 text-3xl font-light leading-[1.1] text-white md:text-4xl">
            get notified about <span className="italic">new drops</span> &amp; deals.
          </h2>
          <p className="font-naya-sans mt-3 text-xs text-white/45">no spam. just the good stuff.</p>
          <div className="mt-7">
            <EmailSignup source="home_footer" />
          </div>
        </div>
      </Reveal>

      {/* ── Footer ── */}
      <footer className="bg-night-bg px-6 py-14 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="font-naya-serif text-lg font-light lowercase tracking-[0.12em] text-text-primary">naya</span>
            <span className="text-[10px] text-text-muted">&copy; 2026</span>
          </div>
          <div className="flex flex-wrap gap-6 text-[10px] uppercase tracking-[0.2em] text-text-muted">
            <Link href="/editorial" className="transition-colors hover:text-text-primary">editorial</Link>
            <Link href="/brands" className="transition-colors hover:text-text-primary">brands</Link>
            <Link href="/privacy" className="transition-colors hover:text-text-primary">privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-text-primary">terms</Link>
            <a href="mailto:nayaeditorialshop@gmail.com" className="transition-colors hover:text-text-primary">contact</a>
          </div>
        </div>
      </footer>

      {/* ── Sticky mobile app banner ── */}
      <GetNayaBanner variant="sticky" />

      {/* ── Cart panel ── */}
      <CartPanel open={s.cartOpen} onClose={() => s.setCartOpen(false)} />
    </div>
  );
}
