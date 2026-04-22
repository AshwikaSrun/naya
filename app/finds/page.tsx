'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import ProductDetailPanel from '@/components/ProductDetailPanel';

type Product = {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark' | 'boiler_vintage';
};

const FILTER_PRESETS = [
  { label: 'all', value: 'default' },
  { label: 'ralph • carhartt', value: 'anchors' },
  { label: 'it girl • viral', value: 'itgirl' },
  { label: 'isabel marrant', value: 'isabelmarant' },
  { label: 'denim • street', value: 'denimstreet' },
  { label: 'soft • pinterest', value: 'soft' },
  { label: 'under the radar', value: 'elite' },
] as const;

function buildApiUrl(preset: string, campus?: string | null) {
  const params = new URLSearchParams({ preset });
  if (campus) params.set('campus', campus);
  return `/api/new-finds?${params.toString()}`;
}

export default function FindsPage() {
  const searchParams = useSearchParams();
  const presetFromUrl = searchParams.get('preset') || 'default';
  const campus = searchParams.get('campus');

  const [activePreset, setActivePreset] = useState(presetFromUrl);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => setActivePreset(presetFromUrl), [presetFromUrl]);

  const fetchGrid = useCallback(
    async (preset: string, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await fetch(buildApiUrl(preset, campus));
        const data = await res.json();
        setItems((data?.items || []) as Product[]);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [campus]
  );

  useEffect(() => {
    fetchGrid(activePreset);
  }, [activePreset, fetchGrid]);

  const title = useMemo(() => {
    if (campus) return `new vintage finds at ${campus}`;
    return 'new vintage finds';
  }, [campus]);

  return (
    <div className="min-h-screen bg-white pb-16">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black">
            naya
          </Link>
          <button
            type="button"
            onClick={() => fetchGrid(activePreset, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-[10px] lowercase tracking-[0.1em] text-black/50 transition-all hover:border-black/20 hover:text-black disabled:opacity-40"
          >
            <svg className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-naya-sans text-[10px] lowercase tracking-[0.2em] text-black/35">live • just listed</p>
            <h1 className="font-naya-serif mt-2 text-3xl font-light text-black md:text-5xl">{title}.</h1>
            <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-black/45">
              everything currently shown in the feed — in a browseable grid.
            </p>
          </div>
          <Link
            href={campus ? `/campus/${encodeURIComponent(campus)}` : '/'}
            className="text-[10px] lowercase tracking-[0.15em] text-black/40 transition-colors hover:text-black"
          >
            back →
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {FILTER_PRESETS.map((p) => {
            const next = new URLSearchParams(searchParams.toString());
            next.set('preset', p.value);
            if (campus) next.set('campus', campus);
            const href = `/finds?${next.toString()}`;
            const active = activePreset === p.value;
            return (
              <Link
                key={p.value}
                href={href}
                className={`rounded-full border px-4 py-2 text-[11px] font-light lowercase transition-all ${
                  active ? 'border-black/30 bg-black text-white' : 'border-black/10 text-black/70 hover:border-black/25'
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-10">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-neutral-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-white p-10 text-center">
              <p className="text-sm text-black/60">No finds right now — refresh in a moment.</p>
            </div>
          ) : (
            <div className="columns-2 gap-4 sm:columns-3 lg:columns-5 [&>div]:break-inside-avoid [&>div]:mb-4">
              {items.map((p, idx) => (
                <div key={`${p.source}-${p.url}-${idx}`}>
                  <ProductCard product={p} onSelect={setSelected} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductDetailPanel product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

