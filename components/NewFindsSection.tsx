'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDepopImageUrl, DEPOP_WIDTH_CARD, DEPOP_WIDTH_HERO } from '@/lib/depopImage';
import ProductDetailPanel from '@/components/ProductDetailPanel';

interface FindItem {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: string;
  discoveredAt: number;
}

const FILTER_PRESETS = [
  { label: 'all', value: 'default' },
  { label: 'ralph • carhartt', value: 'anchors' },
  { label: 'it girl • viral', value: 'itgirl' },
  { label: 'isabel marant', value: 'isabelmarant' },
  { label: 'denim • street', value: 'denimstreet' },
  { label: 'soft • pinterest', value: 'soft' },
  { label: 'under the radar', value: 'elite' },
] as const;

const PRESET_SEARCH_QUERY: Record<string, string> = {
  default: 'vintage ralph lauren',
  anchors: 'vintage carhartt jacket',
  itgirl: 'vintage miu miu',
  isabelmarant: 'isabel marant vintage',
  denimstreet: 'carhartt double knee vintage',
  soft: 'reformation vintage',
  elite: 'jean paul gaultier vintage',
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function buildSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

const BRAND_PHRASES: Array<{ key: string; label: string }> = [
  { key: 'ralph lauren', label: 'Ralph Lauren' },
  { key: 'polo sport', label: 'Polo Sport' },
  { key: 'polo by ralph', label: 'Ralph Lauren' },
  { key: 'carhartt', label: 'Carhartt' },
  { key: "levi's", label: "Levi's" },
  { key: 'levis', label: "Levi's" },
  { key: 'levi ', label: "Levi's" },
  { key: 'nike', label: 'Nike' },
  { key: 'adidas', label: 'Adidas' },
  { key: 'the north face', label: 'The North Face' },
  { key: 'north face', label: 'The North Face' },
  { key: 'patagonia', label: 'Patagonia' },
  { key: 'dickies', label: 'Dickies' },
  { key: 'stussy', label: 'Stüssy' },
  { key: 'stüssy', label: 'Stüssy' },
  { key: 'supreme', label: 'Supreme' },
  { key: 'prada', label: 'Prada' },
  { key: 'miu miu', label: 'Miu Miu' },
  { key: 'dior', label: 'Dior' },
  { key: 'fendi', label: 'Fendi' },
  { key: 'balenciaga', label: 'Balenciaga' },
  { key: 'isabel marant', label: 'Isabel Marant' },
  { key: 'jean paul gaultier', label: 'Jean Paul Gaultier' },
  { key: 'gaultier', label: 'Jean Paul Gaultier' },
  { key: 'chloé', label: 'Chloé' },
  { key: 'chloe', label: 'Chloé' },
  { key: 'marithe', label: 'Marithé Girbaud' },
  { key: 'girbaud', label: 'Marithé Girbaud' },
  { key: 'martin margiela', label: 'Margiela' },
  { key: 'maison margiela', label: 'Margiela' },
  { key: 'margiela', label: 'Margiela' },
  { key: 'comme des garcons', label: 'Comme des Garçons' },
  { key: 'comme des garçons', label: 'Comme des Garçons' },
  { key: 'yohji', label: 'Yohji Yamamoto' },
  { key: 'issey miyake', label: 'Issey Miyake' },
  { key: 'vivienne westwood', label: 'Vivienne Westwood' },
  { key: 'reformation', label: 'Reformation' },
  { key: 'champion', label: 'Champion' },
  { key: 'tommy hilfiger', label: 'Tommy Hilfiger' },
  { key: 'tommy jeans', label: 'Tommy Jeans' },
  { key: 'lacoste', label: 'Lacoste' },
  { key: 'burberry', label: 'Burberry' },
  { key: 'coach', label: 'Coach' },
  { key: 'guess', label: 'Guess' },
  { key: 'harley davidson', label: 'Harley Davidson' },
  { key: 'kappa', label: 'Kappa' },
  { key: 'fila', label: 'Fila' },
  { key: 'converse', label: 'Converse' },
  { key: 'new balance', label: 'New Balance' },
  { key: 'wrangler', label: 'Wrangler' },
  { key: 'lee ', label: 'Lee' },
];

function extractBrand(title: string): string | null {
  const t = ` ${title.toLowerCase()} `;
  for (const b of BRAND_PHRASES) {
    if (t.includes(b.key)) return b.label;
  }
  // Fallback: if the title leads with a recognizable capitalized word
  const firstWord = title.trim().split(/\s+/)[0];
  if (firstWord && /^[A-Z][a-zA-Z]{2,}$/.test(firstWord)) return firstWord;
  return null;
}

/** Strip the brand phrase + common vintage filler from the title so the
 *  product name reads cleanly beside the brand tag. */
function cleanTitle(title: string, brand: string | null): string {
  let t = title.replace(/\s+/g, ' ').trim();
  if (brand) {
    // Remove any variant of the brand name (case-insensitive) from the title
    for (const b of BRAND_PHRASES) {
      if (b.label === brand) {
        const re = new RegExp(`\\b${b.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        t = t.replace(re, '');
      }
    }
  }
  t = t
    .replace(/\bvintage\b/gi, '')
    .replace(/\by2k\b/gi, '')
    .replace(/\bretro\b/gi, '')
    .replace(/[×x]\s*[×x]/gi, '×')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.\-–—×x]+|[\s,.\-–—×x]+$/g, '')
    .trim();
  return t;
}

function readWishlistUrls(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = window.localStorage.getItem('wishlistItems');
    const parsed = stored ? (JSON.parse(stored) as Array<{ url: string }>) : [];
    return new Set(parsed.map((p) => p.url));
  } catch {
    return new Set();
  }
}

function toggleWishlist(item: FindItem) {
  if (typeof window === 'undefined') return { next: false };
  try {
    const stored = window.localStorage.getItem('wishlistItems');
    const parsed = stored ? (JSON.parse(stored) as FindItem[]) : [];
    const isSaved = parsed.some((p) => p.url === item.url);
    const updated = isSaved
      ? parsed.filter((p) => p.url !== item.url)
      : [item, ...parsed.filter((p) => p.url !== item.url)];
    window.localStorage.setItem('wishlistItems', JSON.stringify(updated));
    return { next: !isSaved };
  } catch {
    return { next: false };
  }
}

interface Props {
  campus?: string;
  onSearch?: (query: string) => void;
}

/**
 * "New vintage finds" feed.
 *
 * Visual language matches `LiveFindsCollage` — cream section, editorial serif
 * headline with italic accent, pulsing black dot eyebrow, and clean 4:5
 * product tiles with a single price pill over a soft bottom gradient.
 * Hover reveals a heart + quick-view affordance; everything else stays quiet.
 */
export default function NewFindsSection({ campus, onSearch }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<FindItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState('default');
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selected, setSelected] = useState<null | {
    title: string;
    price: number;
    originalPrice?: number;
    discountPercent?: number;
    image: string;
    url: string;
    source: 'ebay' | 'grailed' | 'depop' | 'poshmark' | 'boiler_vintage';
  }>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    setWishlist(readWishlistUrls());
  }, []);

  const fetchFinds = useCallback(async (preset: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ preset });
      if (campus) params.set('campus', campus);
      const res = await fetch(`/api/new-finds?${params}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campus]);

  useEffect(() => {
    fetchFinds(activePreset);
  }, [activePreset, fetchFinds]);

  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      fetchFinds(activePreset, true);
    }, 3 * 60 * 1000);
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [activePreset, fetchFinds]);

  const handleRefresh = () => fetchFinds(activePreset, true);

  const gridHref = `/finds?${new URLSearchParams({
    preset: activePreset,
    ...(campus ? { campus } : {}),
  }).toString()}`;

  if (loading && items.length === 0) {
    return (
      <section className="bg-night-bg px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeader />
          <div className="mt-12 grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-lg bg-black/[0.05]"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="bg-night-bg px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-6xl">
        {/* ── Header ── */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeader />

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="font-naya-sans group flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-black/45 transition-colors hover:text-black disabled:opacity-40"
            >
              <svg
                className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              refresh
            </button>
            <Link
              href={gridHref}
              className="font-naya-sans text-[10px] uppercase tracking-[0.22em] text-black/45 transition-colors hover:text-black"
            >
              view all →
            </Link>
          </div>
        </div>

        {/* ── Filter presets — slim editorial underlines ── */}
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-black/10 pt-5">
          {FILTER_PRESETS.map((p) => {
            const active = activePreset === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setActivePreset(p.value)}
                className={`font-naya-sans relative text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  active ? 'text-black' : 'text-black/40 hover:text-black/70'
                }`}
              >
                {p.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute -bottom-[22px] left-0 right-0 h-px bg-black"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Feed ── */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
          {items.slice(0, 12).map((item) => {
            const displayImage =
              item.source === 'depop' ? getDepopImageUrl(item.image, DEPOP_WIDTH_CARD) : item.image;
            const productPageImage =
              item.source === 'depop' ? getDepopImageUrl(item.image, DEPOP_WIDTH_HERO) : item.image;

            const isSaved = wishlist.has(item.url);
            const brand = extractBrand(item.title);
            const title = cleanTitle(item.title, brand);

            const productUrl = `/product/${buildSlug(item.title) || 'item'}?${new URLSearchParams({
              title: item.title,
              price: item.price.toFixed(2),
              image: productPageImage,
              url: item.url,
              source: item.source,
            }).toString()}`;

            const openQuickView = () => {
              const src = (['ebay', 'grailed', 'depop', 'poshmark', 'boiler_vintage'] as const).includes(item.source as never)
                ? (item.source as 'ebay' | 'grailed' | 'depop' | 'poshmark' | 'boiler_vintage')
                : 'ebay';
              setSelected({
                title: item.title,
                price: item.price,
                originalPrice: item.originalPrice,
                discountPercent: item.discountPercent,
                image: productPageImage,
                url: item.url,
                source: src,
              });
            };

            return (
              <div key={item.url} className="group relative">
                <Link
                  href={productUrl}
                  className="block"
                  onClick={() => router.prefetch(productUrl)}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-black/[0.04]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={displayImage}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      loading="lazy"
                      onError={(e) => {
                        if (displayImage !== item.image) e.currentTarget.src = item.image;
                      }}
                    />

                    {/* Top-left: discount badge (only when real) */}
                    {item.discountPercent && item.discountPercent > 0 && (
                      <span className="font-naya-sans absolute left-2 top-2 rounded-sm bg-black px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-white">
                        −{item.discountPercent}%
                      </span>
                    )}

                    {/* Top-right: time-ago pill, fades in on hover */}
                    <span className="font-naya-sans absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-black/65 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      {timeAgo(item.discoveredAt)}
                    </span>
                  </div>

                  {/* ── Caption: brand + price + title + source ── */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-naya-sans line-clamp-1 text-[10px] uppercase tracking-[0.22em] text-black/55">
                        {brand || item.source}
                      </p>
                      {brand && (
                        <p className="font-naya-sans shrink-0 text-[9px] uppercase tracking-[0.16em] text-black/35">
                          {item.source}
                        </p>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <p className="font-naya-sans text-[17px] font-semibold tracking-[-0.01em] text-black">
                        ${item.price.toFixed(0)}
                      </p>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <p className="font-naya-sans text-[11px] text-black/35 line-through">
                          ${item.originalPrice.toFixed(0)}
                        </p>
                      )}
                    </div>
                    <p className="font-naya-sans mt-1 line-clamp-1 text-[12px] leading-snug text-black/50">
                      {title || item.title}
                    </p>
                  </div>
                </Link>

                {/* Heart — always visible if saved, hover-only otherwise */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const { next } = toggleWishlist(item);
                    setWishlist((prev) => {
                      const copy = new Set(prev);
                      if (next) copy.add(item.url);
                      else copy.delete(item.url);
                      return copy;
                    });
                  }}
                  aria-label={isSaved ? 'Remove from wishlist' : 'Save'}
                  className={`absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-black/70 shadow-sm backdrop-blur-sm transition-all hover:bg-white ${
                    isSaved
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  } ${item.discountPercent && item.discountPercent > 0 ? 'left-auto right-10' : ''}`}
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill={isSaved ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.682l-7.682-7.318a4.5 4.5 0 010-6.364z"
                    />
                  </svg>
                </button>

                {/* Quick view — hover only, desktop only */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickView();
                  }}
                  className="font-naya-sans absolute right-2 top-2 z-10 hidden h-7 items-center gap-1 rounded-full bg-white/95 px-2.5 text-[9px] uppercase tracking-[0.12em] text-black/70 shadow-sm backdrop-blur-sm transition-all hover:bg-white md:flex md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Quick view"
                >
                  quick view
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Footer rule + CTA matches LiveFindsCollage ── */}
        <Link
          href={gridHref}
          className="font-naya-sans mt-10 flex w-full items-center justify-center gap-3 border-t border-black/10 pt-6 text-[11px] uppercase tracking-[0.22em] text-black/65 transition-colors hover:text-black"
        >
          shop all new finds
          <span aria-hidden className="inline-block h-px w-8 bg-black/30" />
        </Link>

        {onSearch && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => onSearch(PRESET_SEARCH_QUERY[activePreset] || PRESET_SEARCH_QUERY.default)}
              className="font-naya-sans text-[10px] uppercase tracking-[0.18em] text-black/40 transition-colors hover:text-black"
            >
              or search for more →
            </button>
          </div>
        )}
      </div>

      <ProductDetailPanel product={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

/** Editorial eyebrow + headline — matches `LiveFindsCollage`. */
function SectionHeader() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black opacity-30" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-black" />
        </span>
        <p className="font-naya-sans text-[10px] uppercase tracking-[0.28em] text-black/60">
          live • just listed
        </p>
      </div>
      <h2 className="font-naya-serif mt-3 text-3xl font-light leading-[1.05] tracking-[-0.01em] text-black md:text-5xl">
        new vintage finds.{' '}
        <span className="italic text-black/80">live now.</span>
      </h2>
      <p className="font-naya-sans mt-3 max-w-lg text-sm font-light leading-relaxed text-black/55">
        posted in the last 30 minutes across eBay, Grailed, Depop &amp; Poshmark.
      </p>
    </div>
  );
}
