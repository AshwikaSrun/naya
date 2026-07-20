'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CommandSearchBar from './CommandSearchBar';
import type { Product } from '@/lib/useNayaSearch';

type Props = {
  onSearch: (q: string) => void;
  searchValue: string;
  onSearchValueChange: (v: string) => void;
  trending?: Array<{ label: string; query: string }>;
  saved?: string[];
  recentlyViewed?: Product[];
  /** Optional kicker + cta for campus context. */
  kicker?: string;
  kickerColor?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Source of live product tiles for the right-column collage. */
  findsEndpoint?: string;
  /** Optional background image — appears only behind the editorial column. */
  backgroundImage?: string;
};

/**
 * Editorial + marketplace hero.
 *
 * Left  — photo-backed editorial card: serif headline, command search,
 *         trending chips, optional CTA. White typography over the photo.
 * Right — Pinterest-style mixed-span collage of live finds, sitting on the
 *         clean cream page base so the product imagery doesn't compete with
 *         the hero photograph.
 *
 * Collage layout (3×3 grid):
 *   [ 1  1  2 ]
 *   [ 1  1  3 ]
 *   [ 4  4  5 ]
 */
export default function EditorialHero({
  onSearch,
  searchValue,
  onSearchValueChange,
  trending = [],
  saved,
  recentlyViewed,
  kicker,
  kickerColor = '#000',
  ctaLabel,
  ctaHref,
  findsEndpoint = '/api/new-finds?preset=curated',
  backgroundImage,
}: Props) {
  const hasPhoto = !!backgroundImage;
  const [finds, setFinds] = useState<Product[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(findsEndpoint)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const items = (data.items || []) as Product[];
        setFinds(items.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setFinds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [findsEndpoint]);

  const topChips = trending.slice(0, 4);

  const BRAND_PHRASES: Array<{ key: string; label: string }> = [
    { key: 'ralph lauren', label: 'Ralph Lauren' },
    { key: 'polo sport', label: 'Polo Sport' },
    { key: 'carhartt', label: 'Carhartt' },
    { key: "levi's", label: "Levi's" },
    { key: 'levis', label: "Levi's" },
    { key: 'nike', label: 'Nike' },
    { key: 'adidas', label: 'Adidas' },
    { key: 'north face', label: 'North Face' },
    { key: 'patagonia', label: 'Patagonia' },
    { key: 'dickies', label: 'Dickies' },
    { key: 'prada', label: 'Prada' },
    { key: 'miu miu', label: 'Miu Miu' },
    { key: 'dior', label: 'Dior' },
    { key: 'fendi', label: 'Fendi' },
    { key: 'isabel marant', label: 'Isabel Marant' },
    { key: 'gaultier', label: 'Jean Paul Gaultier' },
    { key: 'chloé', label: 'Chloé' },
    { key: 'chloe', label: 'Chloé' },
    { key: 'marithe', label: 'Marithé Girbaud' },
    { key: 'girbaud', label: 'Marithé Girbaud' },
    { key: 'margiela', label: 'Margiela' },
    { key: 'yohji', label: 'Yohji' },
    { key: 'issey miyake', label: 'Issey Miyake' },
    { key: 'reformation', label: 'Reformation' },
    { key: 'supreme', label: 'Supreme' },
    { key: 'balenciaga', label: 'Balenciaga' },
  ];
  const extractBrand = (title: string): string | null => {
    const t = ` ${title.toLowerCase()} `;
    for (const b of BRAND_PHRASES) {
      if (t.includes(b.key)) return b.label;
    }
    const first = title.trim().split(/\s+/)[0];
    if (first && /^[A-Z][a-zA-Z]{2,}$/.test(first)) return first;
    return null;
  };

  // Left-column palette — on photo = white typography, off photo = black.
  const textMain = hasPhoto ? 'text-white' : 'text-black';
  const textMuted = hasPhoto ? 'text-white/75' : 'text-black/60';
  const textFaint = hasPhoto ? 'text-white/50' : 'text-black/35';
  const chipBg = hasPhoto
    ? 'border-white/30 bg-white/10 text-white backdrop-blur-sm hover:border-white hover:bg-white/15'
    : 'border-black/10 bg-white text-black/70 hover:border-black hover:text-black';
  const ctaLine = hasPhoto ? 'bg-white/50 group-hover:bg-white' : 'bg-black/30 group-hover:bg-black';

  // Deterministic span pattern so the collage stays consistent across refreshes.
  const spans = [
    'col-span-2 row-span-2', // 1 — big hero tile
    'col-span-1 row-span-1', // 2
    'col-span-1 row-span-1', // 3
    'col-span-2 row-span-1', // 4 — wide banner
    'col-span-1 row-span-1', // 5
  ];

  const collageItems = finds ?? Array.from({ length: 5 });

  return (
    <section className="relative bg-night-bg pt-[calc(env(safe-area-inset-top)+5rem)] pb-16 md:pt-28 md:pb-20 lg:pt-32 lg:pb-24">
      {/* Subtle grain on the cream base */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-6 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        {/* ── Left: editorial card (photo lives only here) ── */}
        <div
          className={`relative isolate min-w-0 overflow-hidden ${
            hasPhoto ? 'rounded-2xl' : ''
          }`}
        >
          {hasPhoto && (
            <>
              <div
                aria-hidden
                className="absolute inset-0 bg-cover bg-no-repeat [background-position:center_60%]"
                style={{ backgroundImage: `url('${backgroundImage}')` }}
              />
              {/* Overlay — kept subtle so the photo reads as a photograph */}
              <div aria-hidden className="absolute inset-0 bg-black/45" />
              {/* Soft vertical gradient adds depth at the bottom */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/35 to-transparent"
              />
            </>
          )}

          <div
            className={`relative flex min-h-[520px] flex-col justify-center md:min-h-[640px] lg:min-h-[700px] ${
              hasPhoto ? 'p-8 md:p-12 lg:p-14' : 'py-6'
            }`}
          >
            {kicker ? (
              <div className="mb-6 inline-flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: kickerColor }}
                />
                <p
                  className={`font-naya-sans text-[10px] uppercase tracking-[0.28em] ${textMuted}`}
                >
                  {kicker}
                </p>
              </div>
            ) : (
              <div className="naya-enter naya-enter-1 mb-7 inline-flex w-fit items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${
                      hasPhoto ? 'bg-white' : 'bg-black'
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      hasPhoto ? 'bg-white' : 'bg-black'
                    }`}
                  />
                </span>
                <p
                  className={`font-naya-sans text-[10px] uppercase tracking-[0.3em] ${textFaint}`}
                >
                  live vintage index · 4 marketplaces
                </p>
              </div>
            )}

            <h1
              className={`naya-enter naya-enter-2 font-naya-serif text-balance text-[44px] font-light leading-[0.98] tracking-[-0.02em] sm:text-6xl md:text-7xl lg:text-[88px] ${textMain}`}
            >
              the entire resale market.{' '}
              <span className={`italic ${hasPhoto ? 'text-white/90' : 'text-black/80'}`}>
                one search.
              </span>
            </h1>

            <p
              className={`naya-enter naya-enter-3 font-naya-sans mt-6 max-w-md text-[15px] leading-relaxed md:text-base ${textMuted}`}
            >
              eBay, Grailed, Depop, and Poshmark, searched together, scored for quality,
              and de-duped. Real vintage, real prices.
            </p>

            <div className="naya-enter naya-enter-4 mt-7 md:mt-8">
              <CommandSearchBar
                onSearch={onSearch}
                value={searchValue}
                onValueChange={onSearchValueChange}
                trending={trending}
                saved={saved}
                recentlyViewed={recentlyViewed}
                variant={hasPhoto ? 'dark' : 'light'}
                className="!mx-0"
              />
            </div>

            {topChips.length > 0 && (
              <div className="naya-enter naya-enter-5 mt-5 flex flex-wrap gap-2">
                <span
                  className={`font-naya-sans self-center text-[10px] uppercase tracking-[0.24em] ${textFaint}`}
                >
                  try
                </span>
                {topChips.map((t) => (
                  <button
                    key={t.query}
                    type="button"
                    onClick={() => onSearch(t.query)}
                    className={`font-naya-sans rounded-full border px-3.5 py-1.5 text-[11px] lowercase tracking-[0.04em] transition-all duration-300 hover:-translate-y-0.5 ${chipBg}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {ctaLabel && ctaHref && (
              <Link
                href={ctaHref}
                className={`group font-naya-sans mt-8 inline-flex w-fit items-center gap-2 text-[11px] uppercase tracking-[0.2em] transition-colors ${textMuted} ${
                  hasPhoto ? 'hover:text-white' : 'hover:text-black'
                }`}
              >
                {ctaLabel}
                <span
                  aria-hidden
                  className={`inline-block h-px w-8 transition-all group-hover:w-14 ${ctaLine}`}
                />
              </Link>
            )}
          </div>
        </div>

        {/* ── Right: artsy mixed-span collage — sits on cream ── */}
        <div className="naya-enter naya-enter-3 relative min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-30" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-black" />
              </span>
              <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/65">
                just listed
              </p>
            </div>
            <Link
              href="/finds"
              className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/50 transition-colors hover:text-black"
            >
              view all →
            </Link>
          </div>

          <div className="grid aspect-square grid-cols-3 grid-rows-3 gap-2.5 sm:gap-3">
            {collageItems.slice(0, 5).map((p, i) => {
              const span = spans[i] ?? 'col-span-1 row-span-1';
              if (!p) {
                return (
                  <div
                    key={i}
                    className={`${span} naya-skeleton min-h-0 rounded-xl`}
                  />
                );
              }
              const prod = p as Product;
              const isHero = i === 0;
              const brand = extractBrand(prod.title);
              return (
                <a
                  key={`${prod.source}-${prod.url}-${i}`}
                  href={prod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${span} naya-lift group relative block min-h-0 min-w-0 overflow-hidden rounded-xl bg-black/[0.04] ring-1 ring-black/5`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={prod.image}
                    alt={prod.title}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                    loading="eager"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.dataset.fallback) return;
                      img.dataset.fallback = '1';
                      img.src = prod.image.replace(/\/s-l\d+\./i, '/s-l500.');
                    }}
                  />

                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/15 to-transparent opacity-80"
                  />

                  {prod.discountPercent && prod.discountPercent > 0 && (
                    <span className="font-naya-sans absolute left-2 top-2 rounded-sm bg-black px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-white">
                      −{prod.discountPercent}%
                    </span>
                  )}

                  <div className="absolute inset-x-2 bottom-2 flex flex-col gap-0.5">
                    {brand && (
                      <p
                        className={`font-naya-sans uppercase tracking-[0.16em] text-white drop-shadow-sm ${
                          isHero
                            ? 'text-[10px]'
                            : 'text-[9px] opacity-0 transition-opacity group-hover:opacity-100'
                        }`}
                      >
                        {brand}
                      </p>
                    )}
                    <div className="flex items-end justify-between gap-2">
                      <p
                        className={`font-naya-sans font-semibold text-white drop-shadow-sm ${
                          isHero ? 'text-lg md:text-xl' : 'text-[13px]'
                        }`}
                      >
                        ${prod.price.toFixed(0)}
                      </p>
                      <p
                        className={`font-naya-sans hidden uppercase tracking-[0.16em] text-white/80 sm:block ${
                          isHero
                            ? 'text-[9px]'
                            : 'text-[9px] opacity-0 transition-opacity group-hover:opacity-100'
                        }`}
                      >
                        {prod.source}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          <Link
            href="/finds"
            className="font-naya-sans mt-6 block w-full border-t border-black/10 pt-5 text-center text-[11px] uppercase tracking-[0.22em] text-black/65 transition-colors hover:text-black"
          >
            shop all live finds →
          </Link>
        </div>
      </div>
    </section>
  );
}
