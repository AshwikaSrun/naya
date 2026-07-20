'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { parseSearchIntent } from '@/lib/searchIntent';
import type { Product } from '@/lib/useNayaSearch';

type SuggestionType = 'query' | 'recent' | 'product' | 'intent';

type Suggestion = {
  id: string;
  type: SuggestionType;
  label: string;
  query: string;
  sublabel?: string;
  thumbnail?: string;
  sourceBadge?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildId(parts: Array<string | number | undefined | null>) {
  return parts.filter(Boolean).join('|');
}

export default function CommandSearchBar(props: {
  onSearch: (query: string) => void;
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  trending?: Array<{ label: string; query: string }>;
  saved?: string[];
  recentlyViewed?: Product[];
  variant?: 'dark' | 'light';
  size?: 'default' | 'compact';
  placeholder?: string;
  className?: string;
}) {
  const {
    onSearch,
    disabled,
    value,
    onValueChange,
    trending = [],
    saved = [],
    recentlyViewed = [],
    variant = 'dark',
    size = 'default',
    placeholder,
    className,
  } = props;

  const [internalValue, setInternalValue] = useState('');
  const input = value ?? internalValue;

  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [remoteProducts, setRemoteProducts] = useState<Product[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const intent = useMemo(() => parseSearchIntent(input), [input]);
  const hasIntent =
    !!intent.filters.maxPrice ||
    !!intent.filters.minPrice ||
    (intent.filters.colors?.length ?? 0) > 0 ||
    (intent.filters.brands?.length ?? 0) > 0 ||
    (intent.filters.categories?.length ?? 0) > 0 ||
    (intent.filters.materials?.length ?? 0) > 0 ||
    !!intent.filters.era ||
    !!intent.filters.gender ||
    (intent.filters.fits?.length ?? 0) > 0 ||
    (intent.filters.exclude?.length ?? 0) > 0 ||
    (intent.filters.modelNumbers?.length ?? 0) > 0;

  const baseSuggestions: Suggestion[] = useMemo(() => {
    const out: Suggestion[] = [];
    const trimmed = input.trim();

    if (trimmed.length === 0) {
      // Recents (queries)
      for (const q of saved.slice(0, 5)) {
        out.push({
          id: buildId(['saved', q]),
          type: 'recent',
          label: q,
          query: q,
          sublabel: 'recent',
        });
      }

      // Trending
      for (const t of trending.slice(0, 6)) {
        out.push({
          id: buildId(['trend', t.query]),
          type: 'query',
          label: t.label,
          query: t.query,
          sublabel: 'trending',
        });
      }

      // Recently viewed (products)
      for (const p of recentlyViewed.slice(0, 4)) {
        out.push({
          id: buildId(['rv', p.source, p.url]),
          type: 'product',
          label: p.title,
          query: p.title,
          sublabel: 'recently viewed',
          thumbnail: p.image,
          sourceBadge: p.source,
        });
      }

      return out;
    }

    // Intent preview row (what we understood)
    if (hasIntent) {
      const bits: string[] = [];
      if (intent.filters.maxPrice) bits.push(`under $${intent.filters.maxPrice}`);
      if (intent.filters.minPrice) bits.push(`over $${intent.filters.minPrice}`);
      if (intent.filters.brands?.length) bits.push(intent.filters.brands.join(', '));
      if (intent.filters.gender) bits.push(intent.filters.gender);
      if (intent.filters.colors?.length) bits.push(intent.filters.colors.join(', '));
      if (intent.filters.materials?.length) bits.push(intent.filters.materials.join(', '));
      if (intent.filters.categories?.length) bits.push(intent.filters.categories.join(', '));
      if (intent.filters.fits?.length) bits.push(intent.filters.fits.join(', '));
      if (intent.filters.era) bits.push(intent.filters.era);
      if (intent.filters.exclude?.length) bits.push(`no ${intent.filters.exclude.join(', ')}`);
      if (intent.filters.modelNumbers?.length) bits.push(`model ${intent.filters.modelNumbers.join(', ')}`);
      out.push({
        id: buildId(['intent', intent.cleanedQuery]),
        type: 'intent',
        label: intent.cleanedQuery || trimmed,
        query: intent.cleanedQuery || trimmed,
        sublabel: bits.join(' • ') || 'smart filters',
      });
    }

    // Query actions
    out.push({
      id: buildId(['q', trimmed]),
      type: 'query',
      label: trimmed,
      query: trimmed,
      sublabel: 'search',
    });

    // Saved that match prefix
    const lowered = trimmed.toLowerCase();
    const matchingSaved = saved
      .filter((q) => q.toLowerCase().includes(lowered))
      .slice(0, 4);
    for (const q of matchingSaved) {
      out.push({
        id: buildId(['match', q]),
        type: 'recent',
        label: q,
        query: q,
        sublabel: 'recent',
      });
    }

    // Trending that match prefix
    const matchingTrending = trending
      .filter((t) => t.query.toLowerCase().includes(lowered) || t.label.toLowerCase().includes(lowered))
      .slice(0, 4);
    for (const t of matchingTrending) {
      out.push({
        id: buildId(['trendMatch', t.query]),
        type: 'query',
        label: t.label,
        query: t.query,
        sublabel: 'trending',
      });
    }

    return out;
  }, [input, saved, trending, recentlyViewed, hasIntent, intent]);

  const suggestions: Suggestion[] = useMemo(() => {
    const trimmed = input.trim();
    if (trimmed.length < 2) return baseSuggestions;

    // Append remote product previews (thumbnails)
    const previews = remoteProducts.slice(0, 5).map((p) => ({
      id: buildId(['p', p.source, p.url]),
      type: 'product' as const,
      label: p.title,
      query: p.title,
      sublabel: `$${p.price.toFixed(0)} • ${p.source}`,
      thumbnail: p.image,
      sourceBadge: p.source,
    }));

    // De-dupe by query label
    const seen = new Set<string>();
    const out: Suggestion[] = [];
    for (const s of [...baseSuggestions, ...previews]) {
      const key = `${s.type}|${s.query.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out;
  }, [baseSuggestions, remoteProducts, input]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    // Live "visual suggestions": light request, debounced.
    const trimmed = input.trim();
    if (!open || trimmed.length < 2) {
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setRemoteProducts([]);
      setRemoteLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const abort = new AbortController();
      abortRef.current = abort;
      setRemoteLoading(true);

      try {
        // Keep it cheap: eBay-only preview results for thumbnails.
        const params = new URLSearchParams({
          q: intent.cleanedQuery || trimmed,
          platform: 'ebay',
          limit: '6',
        });
        const r = await fetch(`/api/search?${params}`, { signal: abort.signal });
        if (!r.ok) throw new Error('suggest failed');
        const data = await r.json();
        const items = (data?.results?.ebay || []) as Product[];
        if (!abort.signal.aborted) setRemoteProducts(items);
      } catch {
        if (!abort.signal.aborted) setRemoteProducts([]);
      } finally {
        if (!abort.signal.aborted) setRemoteLoading(false);
      }
    }, 180);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, open, intent.cleanedQuery]);

  useEffect(() => {
    // keep highlight sane
    setActiveIdx((i) => clamp(i, 0, Math.max(0, suggestions.length - 1)));
  }, [suggestions.length]);

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || disabled) return;
    setOpen(false);
    onSearch(trimmed);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const pick = suggestions[activeIdx];
    submit(pick?.query || input);
  };

  const isDark = variant === 'dark';
  const shell =
    isDark
      ? 'border border-white/20 bg-white/10 text-white placeholder:text-white/35'
      : 'border border-black/10 bg-white text-black placeholder:text-black/35';
  const icon = isDark ? 'text-white/40' : 'text-black/25';
  const panel = isDark ? 'border-white/15 bg-[#0f0f10]/95 text-white' : 'border-black/10 bg-white text-black';
  const rowHover = isDark ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]';
  const activeRow = isDark ? 'bg-white/7' : 'bg-black/[0.04]';
  const muted = isDark ? 'text-white/45' : 'text-black/45';

  const isCompact = size === 'compact';
  const containerWidth = isCompact ? 'w-full' : 'w-full max-w-xl md:max-w-2xl lg:max-w-3xl';
  const shellPad = isCompact
    ? 'px-4 py-2'
    : 'px-5 py-3 md:px-6 md:py-4 lg:px-7 lg:py-5';
  const iconSize = isCompact ? 'h-4 w-4' : 'h-4 w-4 md:h-5 md:w-5';
  const inputSize = isCompact ? 'text-sm' : 'text-sm md:text-base lg:text-lg';

  return (
    <div ref={rootRef} className={`relative mx-auto ${containerWidth} ${className || ''}`}>
      <form onSubmit={onSubmit}>
        <div className={`relative flex items-center rounded-full ${shellPad} backdrop-blur-md ${shell}`}>
          <svg className={`mr-3 shrink-0 ${iconSize} ${icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <input
            type="text"
            value={input}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              const next = e.target.value;
              if (onValueChange) onValueChange(next);
              else setInternalValue(next);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) setOpen(true);
              if (!open) return;
              if (e.key === 'Escape') {
                setOpen(false);
                (e.currentTarget as HTMLInputElement).blur();
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx((i) => clamp(i + 1, 0, suggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx((i) => clamp(i - 1, 0, suggestions.length - 1));
              }
            }}
            placeholder={placeholder ?? (isDark ? 'search vintage finds…' : 'search again...')}
            disabled={disabled}
            className={`font-naya-sans w-full bg-transparent font-light tracking-[0.02em] focus:outline-none disabled:opacity-50 ${inputSize} ${isDark ? 'text-white' : 'text-black'}`}
          />

          <button
            type="submit"
            disabled={disabled || !input.trim()}
            aria-label="Search"
            className={`ml-2 shrink-0 transition-opacity disabled:opacity-20 ${icon} ${isDark ? 'hover:text-white/70' : 'hover:text-black/50'}`}
          >
            <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <div className={`absolute left-0 right-0 z-50 mt-3 overflow-hidden rounded-2xl border shadow-2xl ${panel}`}>
          <div className="max-h-[22rem] overflow-auto py-1">
            {remoteLoading && input.trim().length >= 2 && (
              <div className={`px-4 py-2 text-[11px] ${muted}`}>fetching previews…</div>
            )}

            {suggestions.map((s, idx) => {
              const active = idx === activeIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => submit(s.query)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${rowHover} ${active ? activeRow : ''}`}
                >
                  {s.thumbnail ? (
                    <img
                      src={s.thumbnail}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                      <svg className={`h-4 w-4 ${icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-sm ${isDark ? 'text-white' : 'text-black'}`}>
                        {s.label}
                      </span>
                      {s.sourceBadge && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] tracking-[0.12em] ${isDark ? 'bg-white/7 text-white/60' : 'bg-black/[0.04] text-black/50'}`}>
                          {s.sourceBadge}
                        </span>
                      )}
                    </div>
                    {s.sublabel && (
                      <div className={`mt-0.5 truncate text-[11px] ${muted}`}>
                        {s.sublabel}
                      </div>
                    )}
                  </div>

                  <div className={`text-[10px] tracking-[0.15em] ${muted}`}>{s.type === 'intent' ? 'smart' : '↵'}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

