'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import BottomSearchBar from '@/components/BottomSearchBar';
import ResultsGrid from '@/components/ResultsGrid';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Product {
  title: string;
  price: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark';
}

interface SearchResults {
  query: string;
  limit: number;
  platform: string;
  results: {
    ebay: Product[];
    grailed: Product[];
    depop: Product[];
    poshmark: Product[];
  };
}

const NAV_LINKS = [
  { href: '/editorial', label: 'editorial' },
  { href: '/brands', label: 'brands' },
  { href: '/featured', label: 'featured' },
  { href: '/college', label: 'college' },
  { href: '/app', label: 'concierge' },
  { href: '/profile', label: 'profile' },
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didHydrateSearch = useRef(false);
  const limit = 50;
  const activePlatforms = [
    'ebay',
    'grailed',
    'depop',
    'poshmark',
  ] as const;
  const comingSoonPlatforms = [] as const;
  const allPlatforms = [...activePlatforms, ...comingSoonPlatforms] as const;
  type Platform = (typeof allPlatforms)[number];
  const [platform] = useState<'all' | Platform>('all');

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

  const collegeMerch = [
    { name: 'Illinois', query: 'Illinois merch' },
    { name: 'Indiana', query: 'Indiana merch' },
    { name: 'Iowa', query: 'Iowa merch' },
    { name: 'Maryland', query: 'Maryland merch' },
    { name: 'Michigan', query: 'Michigan merch' },
    { name: 'Michigan State', query: 'Michigan State merch' },
    { name: 'Minnesota', query: 'Minnesota merch' },
    { name: 'Nebraska', query: 'Nebraska merch' },
    { name: 'Northwestern', query: 'Northwestern merch' },
    { name: 'Ohio State', query: 'Ohio State merch' },
    { name: 'Oregon', query: 'Oregon merch' },
    { name: 'Penn State', query: 'Penn State merch' },
    { name: 'Purdue', query: 'Purdue merch' },
    { name: 'Rutgers', query: 'Rutgers merch' },
    { name: 'UCLA', query: 'UCLA merch' },
    { name: 'USC', query: 'USC merch' },
    { name: 'Washington', query: 'Washington merch' },
    { name: 'Wisconsin', query: 'Wisconsin merch' },
  ];

  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [filters] = useState({ minPrice: '', maxPrice: '', size: '', condition: '' });
  const [savedSearches, setSavedSearches] = useState<string[]>([]);

  const handleSearch = async (
    searchQuery: string,
    platformOverride?: 'all' | Platform
  ) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setQuery(searchQuery);
    setSearchInput(searchQuery);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: limit.toString(),
        platform: platformOverride ?? platform,
      });

      const RAILWAY_URL = process.env.NEXT_PUBLIC_SCRAPER_URL || 'https://scraper-api-production-d197.up.railway.app';
      const response = await fetch(`${RAILWAY_URL}/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();

      setResults(data);
      if (typeof window !== 'undefined') {
        const next = [
          searchQuery,
          ...savedSearches.filter((v) => v.toLowerCase() !== searchQuery.toLowerCase()),
        ].slice(0, 8);
        setSavedSearches(next);
        window.localStorage.setItem('savedSearches', JSON.stringify(next));
      }
    } catch {
      setError('oops, something went wrong. try again?');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('recentlyViewed');
      setRecentlyViewed(stored ? (JSON.parse(stored) as Product[]) : []);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const s = window.localStorage.getItem('savedSearches');
      setSavedSearches(s ? (JSON.parse(s) as string[]) : []);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (didHydrateSearch.current) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (!q) return;
    const pParam = params.get('platform');
    const pVal = pParam ? (pParam.toLowerCase() as 'all' | Platform) : 'all';
    const allowed = new Set(['all', ...activePlatforms]);
    didHydrateSearch.current = true;
    handleSearch(q, allowed.has(pVal) ? pVal : 'all');
  }, [activePlatforms]);

  const buildSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  /* ================================================================
     RESULTS MODE — full-screen white layout
     ================================================================ */
  if (results || loading) {
    return (
      <div className="min-h-screen bg-white pb-32">
        {/* Results top nav */}
        <header className="sticky top-0 z-40 border-b border-black/5 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black" onClick={() => { setResults(null); setQuery(''); }}>
              naya
            </Link>
            <nav className="font-naya-sans hidden items-center gap-3 text-[10px] lowercase tracking-[0.15em] text-black/60 md:flex">
              {NAV_LINKS.slice(0, 3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 transition-colors hover:text-black"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {/* Query display */}
        <div className="mx-auto max-w-7xl px-6 pt-8 text-center">
          <p className="font-naya-serif text-xl font-light italic text-black/70 md:text-2xl">
            {query}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mx-auto max-w-7xl px-6 pt-6">
            <p className="mb-4 text-sm text-black/50">Searching across marketplaces...</p>
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-auto max-w-md px-6 pt-12 text-center">
            <p className="text-sm text-black/60">{error}</p>
          </div>
        )}

        {/* Results grid */}
        {!loading && results && (
          <div className="mx-auto max-w-7xl px-6 pt-6">
            <ResultsGrid results={results} filters={filters} />
          </div>
        )}

        {/* Bottom search bar */}
        <BottomSearchBar onSearch={handleSearch} disabled={loading} />
      </div>
    );
  }

  /* ================================================================
     HERO MODE — landing page with wallpaper
     ================================================================ */
  return (
    <div className="min-h-screen bg-night-bg">
      {/* Hero */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/brands/browser.png')" }}
        ></div>
        <div className="absolute inset-0 bg-black/50"></div>

        {/* Nav */}
        <div className="absolute inset-x-0 top-0 z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
            <Link href="/" className="font-naya-serif text-3xl font-light lowercase tracking-[0.15em] text-white md:text-4xl">
              naya
            </Link>
            <nav className="font-naya-sans hidden items-center gap-4 text-[10px] lowercase tracking-[0.15em] md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/70 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Headline + search */}
        <div className="relative z-10 w-full max-w-3xl px-6 text-center">
          <h1 className="font-naya-serif text-4xl font-light lowercase text-white md:text-6xl lg:text-7xl">
            what are you looking for?
          </h1>
          <p className="font-naya-sans mt-4 text-xs lowercase tracking-[0.12em] text-white/60 md:text-sm">
            the entire resale market in one search
          </p>
          <div className="mt-8">
            <SearchBar
              onSearch={handleSearch}
              disabled={loading}
              value={searchInput}
              onValueChange={setSearchInput}
              showTabs
            />
          </div>
        </div>
      </section>

      {/* ── Why Naya ── */}
      <section className="bg-night-bg px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">why naya</p>
          <h2 className="font-naya-serif mt-4 text-3xl font-light text-text-primary md:text-5xl">
            second-hand, without the friction.
          </h2>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {[
              { num: '01', title: 'one search, every marketplace', copy: 'stop jumping between apps. find deals in one place.' },
              { num: '02', title: 'built for student budgets', copy: 'smart filters and curated categories save time and money.' },
              { num: '03', title: 'lower waste, better style', copy: 'buy fewer, wear longer, keep great clothes in rotation.' },
            ].map((item) => (
              <div key={item.num}>
                <span className="font-naya-serif text-5xl font-extralight text-black/8">{item.num}</span>
                <p className="mt-4 text-[11px] font-medium lowercase tracking-[0.12em] text-text-primary">{item.title}</p>
                <p className="mt-3 text-sm font-light leading-relaxed text-text-muted">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Brand Spotlight — editorial masonry ── */}
      <section className="bg-[#111] px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-white/35">brands</p>
              <h2 className="font-naya-serif mt-3 text-3xl font-light text-white md:text-5xl">shop by brand.</h2>
            </div>
            <Link href="/brands" className="hidden text-[10px] lowercase tracking-[0.15em] text-white/40 transition-colors hover:text-white md:inline-block">
              view all
            </Link>
          </div>
          <div className="grid auto-rows-[260px] grid-cols-2 gap-2 sm:auto-rows-[340px] md:grid-cols-4 md:gap-3">
            {brandCards.map((brand, i) => {
              const isFeature = i === 0 || i === 3;
              return (
                <button
                  key={brand.name}
                  type="button"
                  onClick={() => handleSearch(brand.query)}
                  className={`group relative overflow-hidden rounded-xl ${isFeature ? 'col-span-2' : ''}`}
                >
                  <img
                    src={encodeURI(`/brands/${brand.image}`)}
                    alt={brand.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="font-naya-serif text-lg font-light lowercase text-white md:text-xl">{brand.name.toLowerCase()}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex justify-center md:hidden">
            <Link href="/brands" className="text-[10px] lowercase tracking-[0.15em] text-white/40 transition-colors hover:text-white">
              view all brands
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Categories ── */}
      <section className="bg-white px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">categories</p>
          <h2 className="font-naya-serif mt-3 text-3xl font-light text-text-primary md:text-5xl">explore the archive.</h2>
          <div className="mt-14 grid gap-3 md:grid-cols-2">
            {featuredCategories.map((cat) => (
              <button
                key={cat.title}
                type="button"
                onClick={() => handleSearch(cat.query)}
                className="group flex items-center justify-between rounded-xl bg-[#f6f5f3] px-8 py-8 text-left transition-all hover:bg-[#efeee9]"
              >
                <div>
                  <p className="font-naya-serif text-2xl font-light lowercase text-text-primary md:text-3xl">{cat.title.toLowerCase()}</p>
                  <p className="mt-2 text-xs font-light lowercase tracking-[0.04em] text-text-muted">{cat.description.toLowerCase()}</p>
                </div>
                <svg className="h-4 w-4 shrink-0 text-black/15 transition-transform duration-500 group-hover:translate-x-1.5 group-hover:text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── College Merch — full-bleed image ── */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/brands/coll2.jpg')" }}></div>
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-white/40">college</p>
          <h2 className="font-naya-serif mt-3 text-3xl font-light text-white md:text-5xl">big ten spotlight.</h2>
          <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-white/65">
            every big ten school in one place. team gear, vintage hoodies, and campus classics.
          </p>
          <div className="mt-10 flex flex-wrap gap-2">
            {collegeMerch.slice(0, 8).map((school) => (
              <button
                key={school.name}
                type="button"
                onClick={() => handleSearch(school.query)}
                className="rounded-full border border-white/20 px-4 py-2 text-[10px] lowercase tracking-[0.12em] text-white/75 transition-colors hover:border-white/50 hover:text-white"
              >
                {school.name.toLowerCase()}
              </button>
            ))}
          </div>
          <Link href="/college" className="mt-10 inline-block text-[10px] lowercase tracking-[0.15em] text-white/50 transition-colors hover:text-white">
            view all colleges
          </Link>
        </div>
      </section>

      {/* ── Recently Viewed ── */}
      <section className="bg-night-bg px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">recently viewed</p>
          <h2 className="font-naya-serif mt-3 text-2xl font-light text-text-primary md:text-4xl">pick up where you left off.</h2>
          <div className="mt-10">
            {recentlyViewed.length === 0 ? (
              <p className="text-sm text-text-muted">Browse a few listings and your recently viewed items will show up here.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentlyViewed.map((item) => {
                  const displayImage = item.source === 'depop' ? item.image.replace(/\/P\d+(\.\w+)$/i, '/P1000$1') : item.image;
                  return (
                    <Link key={`${item.source}-${item.url}`} href={{ pathname: `/product/${buildSlug(item.title) || 'item'}`, query: { title: item.title, price: item.price.toFixed(2), image: item.image, url: item.url, source: item.source } }} className="group overflow-hidden rounded-2xl bg-white transition-all hover:shadow-soft">
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

      {/* ── App + Extension ── */}
      <section className="bg-[#111] px-6 py-24 md:px-10">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-white/35">app + extension</p>
            <h2 className="font-naya-serif mt-4 text-3xl font-light text-white md:text-5xl">shop vintage faster anywhere you browse.</h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-white/50">save searches, track price drops, and scan listings instantly with the naya browser extension and mobile companion.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button type="button" className="rounded-full bg-white px-6 py-3.5 text-[10px] font-medium lowercase tracking-[0.12em] text-black transition-opacity hover:opacity-85">get the extension</button>
            <button type="button" className="rounded-full border border-white/15 px-6 py-3.5 text-[10px] font-medium lowercase tracking-[0.12em] text-white/70 transition-colors hover:bg-white/8">download the app</button>
            <Link href="/app" className="mt-3 text-[10px] lowercase tracking-[0.15em] text-white/40 transition-colors hover:text-white">
              join concierge waitlist
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-night-bg px-6 py-14 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="font-naya-serif text-lg font-light lowercase tracking-[0.12em] text-text-primary">naya</span>
            <span className="text-[10px] text-text-muted">© 2026</span>
          </div>
          <div className="flex flex-wrap gap-6 text-[10px] lowercase tracking-[0.12em] text-text-muted">
            <Link href="/privacy" className="transition-colors hover:text-text-primary">privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-text-primary">terms</Link>
            <a href="mailto:hello@naya.app" className="transition-colors hover:text-text-primary">contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
