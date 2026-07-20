'use client';

import Link from 'next/link';
import BottomSearchBar from '@/components/BottomSearchBar';
import ResultsGrid from '@/components/ResultsGrid';
import CartPanel from '@/components/CartPanel';
import { useNayaSearch } from '@/lib/useNayaSearch';
import MobileNav from '@/components/MobileNav';
import StickyHeader from '@/components/StickyHeader';
import AgentHero from '@/components/AgentHero';
import FeatureShowcase from '@/components/FeatureShowcase';
import BrandSpotlight from '@/components/BrandSpotlight';
import EditorsPicks from '@/components/EditorsPicks';
import FeaturedEdit from '@/components/FeaturedEdit';
import Collections from '@/components/Collections';
import NewsletterSection from '@/components/NewsletterSection';
import ClosingCta from '@/components/ClosingCta';
import PhiaFooter from '@/components/PhiaFooter';
import UnlockStylePrompt from '@/components/paywall/UnlockStylePrompt';
import NayaAuth from '@/components/auth/NayaAuth';

const NAV_LINKS = [
  { href: '/finds', label: 'shop' },
  { href: '/app', label: 'concierge' },
  { href: '/editorial', label: 'newsletter' },
  { href: '/pricing', label: 'pricing' },
  { href: '/college', label: 'campus' },
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

export default function Home() {
  const s = useNayaSearch(DEFAULT_TRENDING);

  /* ================================================================
     RESULTS MODE
     ================================================================ */
  if (s.results || s.loading) {
    return (
      <div className="min-h-screen bg-white pb-32">
        <header className="sticky top-0 z-40 border-b border-black/5 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 text-black" onClick={() => s.clearResults()}>
              <span className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em]">naya</span>
              <span className="font-naya-sans translate-y-[-0.4em] rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-black/55">beta</span>
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
              <div className="hidden md:block">
                <NayaAuth tone="dark" showSignUp={false} />
              </div>
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

          {s.understood.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/35">
                understood
              </span>
              {s.understood.map((chip) => (
                <span
                  key={chip}
                  className="font-naya-sans rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] lowercase tracking-[0.02em] text-black/65"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
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
            <ResultsGrid results={s.results} filters={s.filters} onSearch={s.handleSearch} relatedSearches={DEFAULT_TRENDING} intent={s.searchIntent} />
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
     HERO MODE — landing page (phia-style editorial)
     ================================================================ */
  return (
    <div className="min-h-screen bg-[#f7f4ee]">
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
        overHero={true}
        heroTone="dark"
      />

      <UnlockStylePrompt />

      <AgentHero
        onSearch={s.handleSearch}
        searchValue={s.searchInput}
        onSearchValueChange={s.setSearchInput}
        trending={s.trendingSearches.length ? s.trendingSearches : DEFAULT_TRENDING}
        saved={s.savedSearches}
        recentlyViewed={s.recentlyViewed}
        backgroundImage="/editorial/hero-editorial.png"
      />

      {/* Dark feature blocks with floating cards */}
      <FeatureShowcase />

      {/* Explore brands — editorial masonry */}
      <BrandSpotlight />

      {/* Editor's picks — 3 large cards */}
      <EditorsPicks />

      {/* Featured edit — horizontal carousel of live finds */}
      <FeaturedEdit />

      {/* Save your favorite finds — collections */}
      <Collections />

      {/* Newsletter — phia-style signup + featured guide */}
      <NewsletterSection />

      {/* Closing CTA */}
      <ClosingCta />

      {/* Footer */}
      <PhiaFooter />

      {/* Cart panel */}
      <CartPanel open={s.cartOpen} onClose={() => s.setCartOpen(false)} />
    </div>
  );
}
