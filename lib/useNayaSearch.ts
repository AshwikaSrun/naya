'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrendingItem } from '@/lib/campuses';
import { parseSearchIntent } from '@/lib/searchIntent';
import { fetchRemoteIntent, understoodChips, type RemoteIntent } from '@/lib/remoteIntent';
import {
  EMAIL_STORAGE_KEY,
  SEARCH_COUNT_KEY,
  TRIAL_SEARCH_LIMIT,
  UNLIMITED_STORAGE_KEY,
  hasUnlimitedClientAccess,
  isPurdueEmail,
} from '@/lib/access';

export { TRIAL_SEARCH_LIMIT };

export interface Product {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark' | 'boiler_vintage';
}

export interface SearchResults {
  query: string;
  limit: number;
  platform: string;
  results: {
    ebay: Product[];
    grailed: Product[];
    depop: Product[];
    poshmark: Product[];
    boiler_vintage?: Product[];
  };
}

const ACTIVE_PLATFORMS = ['ebay', 'grailed', 'depop', 'poshmark'] as const;
type Platform = (typeof ACTIVE_PLATFORMS)[number];

const CAMPUS_PLATFORMS: Record<string, readonly string[]> = {
  purdue: ['boiler_vintage'],
};

const FAST_LIMIT = 25;
const FULL_LIMIT = 50;
const PLATFORM_TIMEOUT_MS = 30000;
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 min

function getSearchCache(key: string): SearchResults | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`naya-sc-${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { data: SearchResults; ts: number };
    if (Date.now() - entry.ts > CLIENT_CACHE_TTL) {
      window.sessionStorage.removeItem(`naya-sc-${key}`);
      return null;
    }
    return entry.data;
  } catch { return null; }
}

function setSearchCache(key: string, data: SearchResults): void {
  if (typeof window === 'undefined') return;
  const total = Object.values(data.results).reduce((s, arr) => s + arr.length, 0);
  if (total === 0) return;
  try {
    window.sessionStorage.setItem(`naya-sc-${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

export type PlatformStatus = Record<Platform, 'idle' | 'loading' | 'done' | 'error'>;

const initialPlatformStatus: PlatformStatus = {
  ebay: 'idle', grailed: 'idle', depop: 'idle', poshmark: 'idle',
};

export function useNayaSearch(defaultTrending: TrendingItem[], campusSlug?: string) {
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [understood, setUnderstood] = useState<string[]>([]);
  const [searchIntent, setSearchIntent] = useState<RemoteIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>(initialPlatformStatus);
  const didHydrateSearch = useRef(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const backfillAbortRef = useRef<AbortController | null>(null);
  const intentAbortRef = useRef<AbortController | null>(null);
  const limit = FULL_LIMIT;
  const [platform] = useState<'all' | Platform>('all');

  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [savedSearches, setSavedSearches] = useState<string[]>([]);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isPurdue, setIsPurdue] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [showTrialGate, setShowTrialGate] = useState(false);
  const pendingSearchRef = useRef<{ query: string; platform?: 'all' | Platform } | null>(null);

  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState<TrendingItem[]>([]);

  const trendingKey = campusSlug ? `naya-trending-${campusSlug}` : 'naya-trending';

  // Cart sync
  useEffect(() => {
    // Dynamic import to avoid SSR issues with CartPanel helpers
    import('@/components/CartPanel').then(({ getCartCount }) => {
      setCartCount(getCartCount());
      const onCartUpdate = () => setCartCount(getCartCount());
      window.addEventListener('naya-cart-update', onCartUpdate);
      return () => window.removeEventListener('naya-cart-update', onCartUpdate);
    });
  }, []);

  // Load trending — try API first, fall back to localStorage
  const loadTrending = useCallback(() => {
    if (typeof window === 'undefined') return;

    const apiUrl = campusSlug
      ? `/api/insights/trending?campus=${encodeURIComponent(campusSlug)}&limit=5`
      : '/api/insights/trending?limit=5';

    fetch(apiUrl)
      .then((r) => r.json())
      .then((d) => {
        if (d?.trending && d.trending.length > 0) {
          setTrendingSearches(d.trending.map((t: { query: string; label?: string }) => ({
            label: t.label || t.query,
            query: t.query,
          })));
          return;
        }
        loadTrendingFromLocal();
      })
      .catch(() => loadTrendingFromLocal());

    function loadTrendingFromLocal() {
      try {
        const raw = JSON.parse(window.localStorage.getItem(trendingKey) || '[]');
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const recent = raw.filter((e: { timestamp: number }) => e.timestamp > cutoff);
        const counts: Record<string, number> = {};
        for (const entry of recent) {
          const q = (entry.query as string).toLowerCase().trim();
          counts[q] = (counts[q] || 0) + 1;
        }
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([q]) => ({ label: q, query: q }));
        setTrendingSearches(sorted.length > 0 ? sorted : defaultTrending);
      } catch {
        setTrendingSearches(defaultTrending);
      }
    }
  }, [trendingKey, defaultTrending, campusSlug]);

  useEffect(() => { loadTrending(); }, [loadTrending]);

  // Load recently viewed
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('recentlyViewed');
      setRecentlyViewed(stored ? (JSON.parse(stored) as Product[]) : []);
    } catch { /* empty */ }
  }, []);

  // Load saved searches
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const s = window.localStorage.getItem('savedSearches');
      setSavedSearches(s ? (JSON.parse(s) as string[]) : []);
    } catch { /* empty */ }
  }, []);

  // Load waitlist / trial state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(EMAIL_STORAGE_KEY);
    if (stored) {
      setUserEmail(stored);
      setIsPurdue(isPurdueEmail(stored));
    } else if (window.localStorage.getItem(UNLIMITED_STORAGE_KEY) === '1') {
      setIsPurdue(false);
    }
    const count = parseInt(window.localStorage.getItem(SEARCH_COUNT_KEY) || '0', 10);
    setSearchCount(Number.isFinite(count) ? count : 0);
  }, []);

  // URL search hydration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (didHydrateSearch.current) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (!q) return;
    const pParam = params.get('platform');
    const pVal = pParam ? (pParam.toLowerCase() as 'all' | Platform) : 'all';
    const allowed = new Set<string>(['all', ...ACTIVE_PLATFORMS]);
    didHydrateSearch.current = true;
    handleSearch(q, allowed.has(pVal) ? (pVal as 'all' | Platform) : 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState<{ minPrice: string; maxPrice: string; size: string; condition: string }>({
    minPrice: '',
    maxPrice: '',
    size: '',
    condition: '',
  });

  const runSearch = async (
    searchQuery: string,
    platformOverride?: 'all' | Platform
  ) => {
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const abort = new AbortController();
    searchAbortRef.current = abort;

    setLoading(true);
    setError(null);
    setQuery(searchQuery);
    setSearchInput(searchQuery);

    // Keep URL in sync (shareable searches)
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('q', searchQuery);
        window.history.replaceState({}, '', url.toString());
      } catch { /* ignore */ }
    }

    const targetPlatform = platformOverride ?? platform;
    const cacheKey = `${searchQuery.toLowerCase().trim()}|${targetPlatform}`;

    // Instant cache hit — show immediately, then refresh in background
    const cached = getSearchCache(cacheKey);
    if (cached) {
      setResults(cached);
      setPlatformStatus(
        targetPlatform === 'all'
          ? { ebay: 'done', grailed: 'done', depop: 'done', poshmark: 'done' }
          : { ...initialPlatformStatus, [targetPlatform]: 'done' }
      );
      setLoading(false);
      trackSearch(searchQuery);
      return;
    }

    // Single-platform search
    if (targetPlatform !== 'all') {
      try {
        setPlatformStatus({ ...initialPlatformStatus, [targetPlatform]: 'loading' });
        const params = new URLSearchParams({ q: searchQuery, limit: limit.toString(), platform: targetPlatform });
        if (campusSlug) params.set('campus', campusSlug);
        const response = await fetch(`/api/search?${params}`, {
          signal: abort.signal,
        });
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setResults(data);
        setSearchCache(cacheKey, data);
        setPlatformStatus((prev) => ({ ...prev, [targetPlatform]: 'done' }));
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('oops, something went wrong. try again?');
          setResults(null);
        }
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
      trackSearch(searchQuery);
      return;
    }

    // Build effective platform list (include campus-specific platforms)
    const extraPlatforms = (campusSlug ? CAMPUS_PLATFORMS[campusSlug] || [] : []) as string[];
    const effectivePlatforms = [...ACTIVE_PLATFORMS, ...extraPlatforms];
    const totalPlatformCount = effectivePlatforms.length;

    // Phase 1: Fast fetch (25 per platform) — gets results on screen quickly
    const emptyResults: SearchResults = {
      query: searchQuery,
      limit: FAST_LIMIT,
      platform: 'all',
      results: { ebay: [], grailed: [], depop: [], poshmark: [] },
    };
    setResults(emptyResults);
    const initialStatus: Record<string, 'loading' | 'done' | 'error'> = {};
    for (const p of effectivePlatforms) initialStatus[p] = 'loading';
    setPlatformStatus(initialStatus as typeof platformStatus);

    let doneCount = 0;
    let anySuccess = false;

    const fetchPlatform = async (p: string, fetchLimit: number, signal: AbortSignal) => {
      const params = new URLSearchParams({ q: searchQuery, limit: fetchLimit.toString(), platform: p });
      if (campusSlug) params.set('campus', campusSlug);
      const response = await Promise.race([
        fetch(`/api/search?${params}`, { signal }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${p} timed out`)), PLATFORM_TIMEOUT_MS)
        ),
      ]);
      if (!response.ok) throw new Error(`${p} failed`);
      const data = await response.json();
      return (data.results?.[p] || []) as Product[];
    };

    const fastFetch = async (p: string) => {
      try {
        const platformItems = await fetchPlatform(p, FAST_LIMIT, abort.signal);
        setResults((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, results: { ...prev.results, [p]: platformItems } };
          setSearchCache(cacheKey, updated);
          return updated;
        });
        setPlatformStatus((prev) => ({ ...prev, [p]: 'done' }));
        anySuccess = true;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setPlatformStatus((prev) => ({ ...prev, [p]: 'error' }));
        }
      } finally {
        doneCount++;
        if (doneCount === totalPlatformCount && !abort.signal.aborted) {
          setLoading(false);
          if (!anySuccess) setError('oops, something went wrong. try again?');
          else backfillResults(searchQuery, cacheKey, abort);
        }
      }
    };

    effectivePlatforms.forEach((p) => fastFetch(p));
    trackSearch(searchQuery);
  };

  // Phase 2: Backfill to full 50 per platform silently in the background
  const backfillResults = (searchQuery: string, cacheKey: string, primaryAbort: AbortController) => {
    if (backfillAbortRef.current) backfillAbortRef.current.abort();
    const backfillAbort = new AbortController();
    backfillAbortRef.current = backfillAbort;

    const mergeIfNotAborted = (abort: AbortController) => (p: Platform, items: Product[]) => {
      if (abort.signal.aborted || primaryAbort.signal.aborted) return;
      setResults((prev) => {
        if (!prev) return prev;
        const existing = prev.results[p] || [];
        if (items.length <= existing.length) return prev;
        const updated = { ...prev, results: { ...prev.results, [p]: items } };
        setSearchCache(cacheKey, updated);
        return updated;
      });
    };

    const merge = mergeIfNotAborted(backfillAbort);

    ACTIVE_PLATFORMS.forEach(async (p) => {
      try {
        const params = new URLSearchParams({ q: searchQuery, limit: FULL_LIMIT.toString(), platform: p });
        const response = await fetch(`/api/search?${params}`, { signal: backfillAbort.signal });
        if (!response.ok) return;
        const data = await response.json();
        const items: Product[] = data.results?.[p] || [];
        merge(p, items);
      } catch {
        // Backfill failures are silent
      }
    });
  };

  const trackSearch = (searchQuery: string) => {
    const newCount = searchCount + 1;
    setSearchCount(newCount);
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SEARCH_COUNT_KEY, String(newCount));

    const next = [
      searchQuery,
      ...savedSearches.filter((v) => v.toLowerCase() !== searchQuery.toLowerCase()),
    ].slice(0, 8);
    setSavedSearches(next);
    window.localStorage.setItem('savedSearches', JSON.stringify(next));

    const globalTrending = JSON.parse(window.localStorage.getItem('naya-trending') || '[]');
    globalTrending.push({ query: searchQuery.toLowerCase().trim(), timestamp: Date.now() });
    window.localStorage.setItem('naya-trending', JSON.stringify(globalTrending.slice(-200)));

    if (campusSlug) {
      const campusTrending = JSON.parse(window.localStorage.getItem(trendingKey) || '[]');
      campusTrending.push({ query: searchQuery.toLowerCase().trim(), timestamp: Date.now() });
      window.localStorage.setItem(trendingKey, JSON.stringify(campusTrending.slice(-200)));
    }
    loadTrending();
  };

  const trialSearchesLeft = hasUnlimitedClientAccess()
    ? null
    : Math.max(0, TRIAL_SEARCH_LIMIT - searchCount);

  const handleSearch = (
    searchQuery: string,
    platformOverride?: 'all' | Platform
  ) => {
    if (!searchQuery.trim()) return;

    // Waitlist trial: 5 searches. Purdue / invite are unlimited.
    if (!hasUnlimitedClientAccess()) {
      const currentCount =
        typeof window !== 'undefined'
          ? parseInt(window.localStorage.getItem(SEARCH_COUNT_KEY) || '0', 10)
          : searchCount;
      if (currentCount >= TRIAL_SEARCH_LIMIT) {
        pendingSearchRef.current = { query: searchQuery, platform: platformOverride };
        setShowTrialGate(true);
        return;
      }
    }

    // 1) Instant deterministic parse — gets results on screen with zero added
    //    latency, and works even if the NLP route is down or has no key.
    const intent = parseSearchIntent(searchQuery);
    setFilters((prev) => ({
      ...prev,
      minPrice: intent.filters.minPrice !== undefined ? String(intent.filters.minPrice) : prev.minPrice,
      maxPrice: intent.filters.maxPrice !== undefined ? String(intent.filters.maxPrice) : prev.maxPrice,
      size: intent.filters.sizes?.length ? intent.filters.sizes[0] : prev.size,
      condition: intent.filters.condition ?? prev.condition,
    }));
    const baseQuery = intent.cleanedQuery || searchQuery;
    // Seed a ranking intent from the deterministic parse so "best match" can
    // re-rank immediately, even before (or without) the LLM.
    const seededIntent: RemoteIntent = {
      marketplaceQuery: baseQuery,
      ...(intent.filters.minPrice !== undefined ? { priceMin: intent.filters.minPrice } : {}),
      ...(intent.filters.maxPrice !== undefined ? { priceMax: intent.filters.maxPrice } : {}),
      ...(intent.filters.brands?.length ? { brands: intent.filters.brands } : {}),
      ...(intent.filters.colors?.length ? { colors: intent.filters.colors } : {}),
      ...(intent.filters.categories?.length ? { categories: intent.filters.categories } : {}),
      ...(intent.filters.materials?.length ? { materials: intent.filters.materials } : {}),
      ...(intent.filters.era ? { era: intent.filters.era } : {}),
      ...(intent.filters.fits?.length ? { fits: intent.filters.fits } : {}),
      ...(intent.filters.gender ? { gender: intent.filters.gender } : {}),
      ...(intent.filters.sizes?.length ? { sizes: intent.filters.sizes } : {}),
      ...(intent.filters.condition ? { condition: intent.filters.condition } : {}),
      ...(intent.filters.tags?.length ? { vibe: intent.filters.tags } : {}),
      ...(intent.filters.exclude?.length ? { exclude: intent.filters.exclude } : {}),
    };
    // Show what we understood instantly from the deterministic parse; the LLM
    // may enrich this a moment later.
    setUnderstood(understoodChips(seededIntent));
    setSearchIntent(seededIntent);
    runSearch(baseQuery, platformOverride);

    // 2) Background NLP refinement (Gemini). Never blocks the first results.
    //    On success it tightens filters from the full sentence and, if it
    //    produces a materially better marketplace query, re-runs the search.
    if (intentAbortRef.current) intentAbortRef.current.abort();
    const abort = new AbortController();
    intentAbortRef.current = abort;
    fetchRemoteIntent(searchQuery, abort.signal).then((remote) => {
      if (!remote || abort.signal.aborted) return;
      setFilters((prev) => ({
        ...prev,
        ...(remote.priceMin !== undefined ? { minPrice: String(remote.priceMin) } : {}),
        ...(remote.priceMax !== undefined ? { maxPrice: String(remote.priceMax) } : {}),
        ...(remote.sizes && remote.sizes.length ? { size: remote.sizes[0] } : {}),
        ...(remote.condition && remote.condition !== 'any' ? { condition: remote.condition } : {}),
      }));
      setUnderstood(understoodChips(remote));
      setSearchIntent(remote);
      const better = (remote.marketplaceQuery || '').trim();
      if (better && better.toLowerCase() !== baseQuery.trim().toLowerCase()) {
        runSearch(better, platformOverride);
      }
    });
  };

  const handleShareSearch = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(query)}`;
    const shareData = {
      title: `${query} — naya finds`,
      text: 'check out these finds on naya',
      url: shareUrl,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* empty */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { /* empty */ }
  };

  const clearResults = () => {
    setResults(null);
    setQuery('');
    setUnderstood([]);
    setSearchIntent(null);
  };

  return {
    // search
    query,
    searchInput,
    setSearchInput,
    results,
    understood,
    searchIntent,
    loading,
    error,
    handleSearch,
    clearResults,
    handleShareSearch,
    shareCopied,
    // auth / trial
    userEmail,
    isPurdue,
    searchCount,
    trialSearchesLeft,
    showTrialGate,
    setShowTrialGate,
    pendingSearchRef,
    // cart
    cartOpen,
    setCartOpen,
    cartCount,
    // trending
    trendingSearches,
    // misc
    savedSearches,
    recentlyViewed,
    activePlatforms: ACTIVE_PLATFORMS,
    platformStatus,
    filters,
    setFilters,
  } as const;
}
