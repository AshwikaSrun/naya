'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import BottomSearchBar from '@/components/BottomSearchBar';
import ResultsGrid from '@/components/ResultsGrid';
import CartPanel from '@/components/CartPanel';
import { triggerInstall, isIOSDevice } from '@/components/InstallPrompt';
import { useNayaSearch } from '@/lib/useNayaSearch';
import { getCampus, ALL_CAMPUSES, type CampusConfig } from '@/lib/campuses';
import NewFindsSection from '@/components/NewFindsSection';
import CampusProductGrid from '@/components/CampusProductGrid';
import SearchPromptCard from '@/components/SearchPromptCard';
import { getFallbackForCampus } from '@/lib/fallbackProducts';
import { getDepopImageUrl } from '@/lib/depopImage';
import EmailSignup from '@/components/EmailSignup';
import DealDiscoveryNotifications from '@/components/DealDiscoveryNotifications';
import MobileNav from '@/components/MobileNav';

const NAV_LINKS = [
  { href: '/editorial', label: 'editorial' },
  { href: '/brands', label: 'brands' },
  { href: '/deals', label: 'deals' },
  { href: '/featured', label: 'featured' },
  { href: '/college', label: 'college' },
  { href: '/app', label: 'concierge' },
  { href: '/profile', label: 'profile' },
];

export default function CampusPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.slug as string)?.toLowerCase();
  const campus = getCampus(slug);

  useEffect(() => {
    if (!campus) router.replace('/college');
  }, [campus, router]);

  if (!campus) return null;

  return <CampusLanding campus={campus} />;
}

type PreviewProduct = {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark' | 'boiler_vintage';
};

function CampusLanding({ campus }: { campus: CampusConfig }) {
  const s = useNayaSearch(campus.defaultTrending, campus.slug);
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[] | null>(null);

  useEffect(() => {
    window.localStorage.setItem('naya-campus', campus.slug);

    const existing = document.querySelector('link[rel="manifest"]');
    if (campus.slug === 'purdue') {
      const link = existing || document.createElement('link');
      link.setAttribute('rel', 'manifest');
      link.setAttribute('href', `/api/manifest/purdue`);
      if (!existing) document.head.appendChild(link);
    } else if (existing) {
      existing.setAttribute('href', '/manifest.json');
    }

    return () => {
      const el = document.querySelector('link[rel="manifest"]');
      if (el) el.setAttribute('href', '/manifest.json');
    };
  }, [campus.slug]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    fetch(`/api/new-finds?preset=default&campus=${encodeURIComponent(campus.slug)}`, { signal: controller.signal })
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
      .catch(() => { if (!cancelled) setPreviewProducts([]); })
      .finally(() => clearTimeout(timeout));
    return () => { cancelled = true; controller.abort(); clearTimeout(timeout); };
  }, [campus.slug]);

  const brandCards = [
    { name: 'Ralph Lauren', image: 'Ralph Lauren.png', query: 'Ralph Lauren' },
    { name: 'Polo Sport', image: 'Polo Sport.png', query: 'Polo Sport' },
    { name: 'Pacsun', image: 'Pacsun.png', query: 'Pacsun' },
    { name: 'Princess Polly', image: 'Princess Polly.png', query: 'Princess Polly' },
    { name: 'Carhartt', image: 'Carhartt.png', query: 'Carhartt' },
    { name: 'Zara', image: 'zara.jpg', query: 'Zara' },
  ];

  const dailyFinds = useMemo(() => {
    const allFinds = [
      { title: 'Vintage Carhartt Jacket', query: 'vintage carhartt jacket', priceRange: 'under $80' },
      { title: 'Nike Vintage Crewneck', query: 'vintage nike crewneck', priceRange: 'under $40' },
      { title: "Levi's 501 Jeans", query: 'vintage levi 501', priceRange: 'under $50' },
      { title: `Vintage ${campus.name} Hoodie`, query: `vintage ${campus.name.toLowerCase()} hoodie`, priceRange: 'under $45' },
      { title: 'Y2K Zip Hoodie', query: 'y2k zip hoodie', priceRange: 'under $35' },
      { title: 'Ralph Lauren Polo', query: 'vintage ralph lauren polo', priceRange: 'under $30' },
      { title: 'Vintage Band Tee', query: 'vintage band tee', priceRange: 'under $35' },
      { title: 'North Face Puffer', query: 'vintage north face puffer', priceRange: 'under $90' },
    ];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const startIdx = (dayOfYear * 3) % allFinds.length;
    return Array.from({ length: 4 }, (_, i) => allFinds[(startIdx + i) % allFinds.length]);
  }, [campus.name]);

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
            <Link href={`/campus/${campus.slug}`} className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black" onClick={() => s.clearResults()}>
              naya
            </Link>
            <div className="flex items-center gap-3">
              <nav className="font-naya-sans hidden items-center gap-3 text-[10px] lowercase tracking-[0.15em] text-black/60 md:flex">
                {NAV_LINKS.slice(0, 3).map((link) => (
                  <Link key={link.href} href={link.href} className="px-3 py-1.5 transition-colors hover:text-black">{link.label}</Link>
                ))}
              </nav>
              {/* Colored campus badge in results header */}
              <span className="hidden items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] lowercase tracking-[0.1em] md:inline-flex" style={{ borderColor: campus.color + '40', color: campus.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: campus.color }} />
                {campus.name.toLowerCase()}
              </span>
              <button type="button" onClick={() => s.setCartOpen(true)} className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5" aria-label="Open cart">
                <svg className="h-5 w-5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {s.cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white">{s.cartCount}</span>}
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
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: campus.color }} />
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
          <div className="mx-auto max-w-md px-6 pt-12 text-center"><p className="text-sm text-black/60">{s.error}</p></div>
        )}

        {!s.loading && s.results && (
          <div className="mx-auto max-w-7xl px-6 pt-6">
            <ResultsGrid results={s.results} filters={s.filters} onSearch={s.handleSearch} relatedSearches={campus.defaultTrending} />
          </div>
        )}

        <BottomSearchBar onSearch={s.handleSearch} disabled={s.loading} />
        <CartPanel open={s.cartOpen} onClose={() => s.setCartOpen(false)} />
      </div>
    );
  }

  /* ================================================================
     CAMPUS LANDING
     Editorial foundation + school color as accent
     ================================================================ */
  return (
    <div className="min-h-screen bg-night-bg">
      {/* Hero — subtle school-color glow at bottom */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/brands/browser.png')" }}></div>
        <div className="absolute inset-0 bg-black/50"></div>
        {/* School-color glow at bottom of hero */}
        <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: `linear-gradient(to top, ${campus.color}12, transparent)` }} />

        {/* Nav */}
        <div className="absolute inset-x-0 top-0 z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
            <Link href={`/campus/${campus.slug}`} className="font-naya-serif text-3xl font-light lowercase tracking-[0.15em] text-white md:text-4xl">
              naya
            </Link>
            <div className="flex items-center gap-4">
              <nav className="font-naya-sans hidden items-center gap-4 text-[10px] lowercase tracking-[0.15em] md:flex">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="text-white/70 transition-colors hover:text-white">{link.label}</Link>
                ))}
              </nav>

              {/* Campus switcher — dot of school color */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCampusDropdownOpen(!campusDropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[10px] lowercase tracking-[0.1em] text-white/60 transition-colors hover:border-white/40 hover:text-white"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: campus.color }} />
                  {campus.name.toLowerCase()}
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {campusDropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] py-1 shadow-2xl">
                    <Link href="/" onClick={() => setCampusDropdownOpen(false)} className="block px-4 py-2 text-[11px] lowercase tracking-[0.08em] text-white/50 transition-colors hover:bg-white/5 hover:text-white">
                      all campuses
                    </Link>
                    {ALL_CAMPUSES.map((c) => (
                      <Link key={c.slug} href={`/campus/${c.slug}`} onClick={() => setCampusDropdownOpen(false)} className={`flex items-center gap-2 px-4 py-2 text-[11px] lowercase tracking-[0.08em] transition-colors hover:bg-white/5 hover:text-white ${campus.slug === c.slug ? 'text-white' : 'text-white/50'}`}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                        {c.name.toLowerCase()}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <button type="button" onClick={() => s.setCartOpen(true)} className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10" aria-label="Open cart">
                <svg className="h-5 w-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {s.cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-black">{s.cartCount}</span>}
              </button>
              <MobileNav color="light" />
            </div>
          </div>
        </div>

        {/* Headline + search */}
        <div className="relative z-10 w-full max-w-3xl px-6 text-center">
          <h1 className="font-naya-serif text-4xl font-light lowercase text-white md:text-6xl lg:text-7xl">
            what are you looking for?
          </h1>
          <p className="font-naya-sans mt-4 flex items-center justify-center gap-2 text-xs lowercase tracking-[0.12em] text-white/60 md:text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: campus.color }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: campus.color }} />
            </span>
            the entire resale market in one search
          </p>
          <div className="mt-8">
            <SearchBar onSearch={s.handleSearch} disabled={s.loading} value={s.searchInput} onValueChange={s.setSearchInput} showTabs suggestions={campus.defaultTrending.slice(0, 4)} />
          </div>
        </div>
      </section>

      {/* ── New Finds Feed ── */}
      <NewFindsSection campus={campus.slug} onSearch={s.handleSearch} />

      {/* ── Trending at {School} — school-colored rank numbers ── */}
      {s.trendingSearches.length > 0 && (
        <section className="bg-night-bg px-6 py-16 md:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2">
              <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">trending now</p>
              <span className="h-1 w-1 rounded-full" style={{ background: campus.color }} />
            </div>
            <h2 className="font-naya-serif mt-3 text-2xl font-light text-text-primary md:text-4xl">trending at {campus.name.toLowerCase()}.</h2>
            <div className="mt-8 space-y-1">
              {s.trendingSearches.map((tq, i) => (
                <button key={tq.query} type="button" onClick={() => s.handleSearch(tq.query)} className="group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-all hover:bg-black/[0.03]">
                  <span className="font-naya-serif w-8 text-2xl font-extralight md:text-3xl" style={{ color: campus.color + (i === 0 ? '' : i === 1 ? 'aa' : '55') }}>{i + 1}</span>
                  <span className="font-naya-serif text-lg font-light text-text-primary transition-colors group-hover:text-black md:text-xl">{tq.label}</span>
                  <svg className="ml-auto h-4 w-4 shrink-0 text-black/10 transition-all group-hover:translate-x-1 group-hover:text-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>

            {(() => {
              const fallback = getFallbackForCampus(campus.name);
              const hasReal = previewProducts && previewProducts.length > 0;
              return (
                <>
                  <p className="font-naya-sans mt-12 text-[10px] lowercase tracking-[0.2em] text-text-muted">picked for you</p>
                  <div className="mt-4">
                    {hasReal ? (
                      <CampusProductGrid products={previewProducts!.slice(0, 6)} columns={6} />
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {fallback.slice(0, 6).map((item, i) => (
                          <SearchPromptCard key={i} {...item} onSearch={s.handleSearch} />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </section>
      )}

      {/* ── Vintage {School} Merch — school-colored left accent on first card ── */}
      <section className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">{campus.name.toLowerCase()} merch</p>
          <h2 className="font-naya-serif mt-3 text-3xl font-light text-text-primary md:text-5xl">vintage {campus.name.toLowerCase()} gear.</h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {campus.merchQueries.map((item, i) => (
              <button
                key={item.query}
                type="button"
                onClick={() => s.handleSearch(item.query)}
                className="group flex items-center justify-between rounded-xl border border-black/[0.06] px-6 py-5 text-left transition-all hover:border-black/15 hover:shadow-sm"
                style={i === 0 ? { borderLeftWidth: 3, borderLeftColor: campus.color } : undefined}
              >
                <p className="font-naya-serif text-lg font-light text-text-primary md:text-xl">{item.title.toLowerCase()}</p>
                <svg className="h-4 w-4 shrink-0 text-black/10 transition-transform duration-500 group-hover:translate-x-1.5 group-hover:text-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>

          {(() => {
            const fallback = getFallbackForCampus(campus.name);
            const hasReal = previewProducts && previewProducts.length > 6;
            return (
              <>
                <p className="font-naya-sans mt-12 text-[10px] lowercase tracking-[0.2em] text-text-muted">vintage {campus.name.toLowerCase()} finds</p>
                <div className="mt-4">
                  {hasReal ? (
                    <CampusProductGrid products={previewProducts!.slice(6, 12)} columns={6} />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {fallback.slice(6, 12).map((item, i) => (
                        <SearchPromptCard key={i} {...item} onSearch={s.handleSearch} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* ── What Students Are Into — school-colored active chip ── */}
      <section className="bg-night-bg px-6 py-20 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">popular at {campus.name.toLowerCase()}</p>
          <h2 className="font-naya-serif mt-3 text-3xl font-light text-text-primary md:text-5xl">what {campus.name.toLowerCase()} students are into.</h2>
          <div className="mt-10 flex flex-wrap gap-2">
            {campus.findCategories.map((cat, i) => (
              <button
                key={cat.query}
                type="button"
                onClick={() => s.handleSearch(cat.query)}
                className="rounded-full border px-5 py-2.5 text-sm font-light transition-all hover:shadow-sm"
                style={
                  i === 0
                    ? { borderColor: campus.color + '40', color: campus.color, background: campus.color + '08' }
                    : { borderColor: 'rgba(0,0,0,0.1)', color: 'inherit' }
                }
              >
                {cat.label}
              </button>
            ))}
          </div>

          {(() => {
            const fallback = getFallbackForCampus(campus.name);
            const hasReal = previewProducts && previewProducts.length > 12;
            return (
              <>
                <p className="font-naya-sans mt-12 text-[10px] lowercase tracking-[0.2em] text-text-muted">popular picks</p>
                <div className="mt-4">
                  {hasReal ? (
                    <CampusProductGrid products={previewProducts!.slice(12, 18)} columns={6} />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {fallback.slice(12, 18).map((item, i) => (
                        <SearchPromptCard key={i} {...item} onSearch={s.handleSearch} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* ── Boiler Vintage Spotlight (Purdue only) ── */}
      {campus.slug === 'purdue' && (
        <BoilerVintageSpotlight onSearch={s.handleSearch} />
      )}

      {/* ── Purdue push alerts (installed app) ── */}
      {campus.slug === 'purdue' && (
        <section className="bg-night-bg px-6 py-12 md:px-10">
          <div className="mx-auto max-w-2xl">
            <DealDiscoveryNotifications variant="campus" />
          </div>
        </section>
      )}

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
              <p className="text-sm text-text-muted">browse a few listings and your recently viewed items will show up here.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {s.recentlyViewed.map((item) => {
                  const displayImage = item.source === 'depop' ? getDepopImageUrl(item.image, 400) : item.image;
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

      {/* ── Stay in the Loop ── */}
      <section className="bg-[#111] px-6 py-16 md:px-10">
        <div className="mx-auto max-w-md text-center">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-white/35">stay in the loop</p>
          <h2 className="font-naya-serif mt-3 text-2xl font-light text-white md:text-3xl">get notified about new drops &amp; deals.</h2>
          <p className="font-naya-sans mt-2 text-xs text-white/40">no spam. just the good stuff.</p>
          <div className="mt-6">
            <EmailSignup source={`campus_${campus.slug}`} />
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
            <a href="mailto:nayaeditorialshop@gmail.com" className="transition-colors hover:text-text-primary">contact</a>
          </div>
        </div>
      </footer>

      {/* ── iOS install instructions ── */}
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

/* ── Boiler Vintage Feature Spotlight ── */

function BoilerVintageSpotlight({ onSearch }: { onSearch: (q: string) => void }) {
  const [items, setItems] = useState<{ title: string; price: number; image: string; url: string; brand?: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/search?q=purdue&platform=boiler_vintage&limit=8&campus=purdue')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setItems((data.results?.boiler_vintage || []).slice(0, 6));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const queries = [
    { label: 'crewnecks', query: 'purdue crewneck' },
    { label: 'hoodies', query: 'purdue hoodie' },
    { label: 'jackets', query: 'purdue jacket' },
    { label: 'tees', query: 'purdue tee' },
  ];

  return (
    <section className="bg-white px-6 py-20 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">campus exclusive</p>
          <span className="h-1 w-1 rounded-full bg-[#CEB888]" />
        </div>
        <h2 className="font-naya-serif mt-3 text-3xl font-light text-text-primary md:text-5xl">
          boiler vintage.
        </h2>
        <p className="font-naya-sans mt-3 max-w-lg text-sm font-light leading-relaxed text-text-muted">
          authentic vintage purdue gear sourced from collectors — only on naya.
        </p>

        {/* Category chips */}
        <div className="mt-8 flex flex-wrap gap-2">
          {queries.map((cat, i) => (
            <button
              key={cat.query}
              type="button"
              onClick={() => onSearch(cat.query)}
              className="rounded-full border px-5 py-2.5 text-sm font-light transition-all hover:shadow-sm"
              style={
                i === 0
                  ? { borderColor: '#CEB88840', color: '#CEB888', background: '#CEB88808' }
                  : { borderColor: 'rgba(0,0,0,0.1)', color: 'inherit' }
              }
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {items.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {items.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-xl bg-neutral-50 transition-all hover:shadow-soft"
              >
                <div className="relative aspect-square w-full overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#CEB888]">boiler vintage</p>
                  <p className="mt-1 line-clamp-2 text-xs font-medium text-text-primary">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold text-text-secondary">${item.price.toFixed(2)}</p>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => onSearch('vintage purdue')}
            className="rounded-full border border-[#CEB888]/30 px-6 py-3 text-[11px] lowercase tracking-[0.12em] text-[#CEB888] transition-all hover:border-[#CEB888]/60 hover:bg-[#CEB888]/5"
          >
            shop all boiler vintage
          </button>
        </div>
      </div>
    </section>
  );
}
