'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

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
  { label: 'carhartt • flat lay', value: 'carhartt' },
  { label: 'nike vintage • clean', value: 'nike' },
  { label: 'y2k', value: 'y2k' },
  { label: 'denim • minimal', value: 'denim' },
  { label: 'streetwear • aesthetic', value: 'streetwear' },
];

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

interface Props {
  campus?: string;
  onSearch?: (query: string) => void;
}

export default function NewFindsSection({ campus, onSearch }: Props) {
  const [items, setItems] = useState<FindItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState('default');
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // Silently fail — the section just won't show items
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campus]);

  useEffect(() => {
    fetchFinds(activePreset);
  }, [activePreset, fetchFinds]);

  // Auto-refresh every 3 minutes
  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      fetchFinds(activePreset, true);
    }, 3 * 60 * 1000);
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [activePreset, fetchFinds]);

  const handlePresetClick = (preset: string) => {
    setActivePreset(preset);
  };

  const handleRefresh = () => {
    fetchFinds(activePreset, true);
  };

  if (loading && items.length === 0) {
    return (
      <section className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">just listed</p>
          <h2 className="font-naya-serif mt-3 text-3xl font-light text-text-primary md:text-5xl">new vintage finds.</h2>
          <div className="mt-10 flex flex-col items-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
            <p className="mt-4 text-xs text-text-muted">scanning marketplaces...</p>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="bg-white px-6 py-20 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-text-muted">just listed</p>
            <h2 className="font-naya-serif mt-3 text-3xl font-light text-text-primary md:text-5xl">new vintage finds.</h2>
            <p className="font-naya-sans mt-2 text-xs text-text-muted">posted in the last 30 minutes across all marketplaces.</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-4 flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-[10px] lowercase tracking-[0.1em] text-text-muted transition-all hover:border-black/20 hover:text-text-primary disabled:opacity-40"
          >
            <svg className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            refresh
          </button>
        </div>

        {/* Filter presets */}
        <div className="mt-8 flex flex-wrap gap-2">
          {FILTER_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePresetClick(p.value)}
              className={`rounded-full border px-4 py-2 text-[11px] font-light lowercase transition-all ${
                activePreset === p.value
                  ? 'border-black/30 bg-black text-white'
                  : 'border-black/10 text-text-primary hover:border-black/25'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Pinterest-style masonry feed */}
        <div className="mt-10 columns-2 gap-4 sm:columns-3 lg:columns-4 [&>a]:mb-4 [&>a]:break-inside-avoid">
          {items.slice(0, 12).map((item) => {
            const displayImage = item.source === 'depop'
              ? item.image.replace(/\/P\d+(\.\w+)$/i, '/P1$1')
              : item.image;

            return (
              <Link
                key={item.url}
                href={`/product/${buildSlug(item.title) || 'item'}?${new URLSearchParams({
                  title: item.title,
                  price: item.price.toFixed(2),
                  image: item.image,
                  url: item.url,
                  source: item.source,
                }).toString()}`}
                className="group block overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition-all hover:border-black/15 hover:shadow-md"
              >
                <div className="relative w-full overflow-hidden bg-neutral-100">
                  <img
                    src={displayImage}
                    alt={item.title}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => { if (displayImage !== item.image) e.currentTarget.src = item.image; }}
                  />
                  {item.discountPercent && item.discountPercent >= 30 && (
                    <span className="absolute left-2 top-2 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      {item.discountPercent}% off
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-medium text-black shadow-sm">
                    {item.source}
                  </span>
                </div>
                <div className="p-3">
                  <p className="font-naya-serif line-clamp-2 text-[13px] font-light leading-snug text-text-primary">
                    {item.title}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-bold text-black">${item.price.toFixed(2)}</span>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="text-[11px] text-black/40 line-through">${item.originalPrice.toFixed(0)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-text-muted">{timeAgo(item.discoveredAt)}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {onSearch && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => onSearch(activePreset === 'default' ? 'vintage' : FILTER_PRESETS.find(p => p.value === activePreset)?.label || 'vintage')}
              className="text-[10px] lowercase tracking-[0.15em] text-text-muted transition-colors hover:text-text-primary"
            >
              search for more finds →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
