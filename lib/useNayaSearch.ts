'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Product {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark';
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
  };
}

const ACTIVE_PLATFORMS = ['ebay', 'grailed', 'depop', 'poshmark'] as const;
type Platform = (typeof ACTIVE_PLATFORMS)[number];

export const SEARCH_LIMIT = 50;

export type PlatformStatus = Record<Platform, 'idle' | 'loading' | 'done' | 'error'>;

const initialPlatformStatus: PlatformStatus = {
  ebay: 'idle', grailed: 'idle', depop: 'idle', poshmark: 'idle',
};

export function useNayaSearch(defaultTrending: string[], campusSlug?: string) {
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>(initialPlatformStatus);
  const didHydrateSearch = useRef(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const limit = 50;
  const [platform] = useState<'all' | Platform>('all');

  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [savedSearches, setSavedSearches] = useState<string[]>([]);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isPurdue, setIsPurdue] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [showLimitGate, setShowLimitGate] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const pendingSearchRef = useRef<{ query: string; platform?: 'all' | Platform } | null>(null);

  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);

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

  // Load trending
  const loadTrending = useCallback(() => {
    if (typeof window === 'undefined') return;
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
        .map(([q]) => q);
      setTrendingSearches(sorted.length > 0 ? sorted : defaultTrending);
    } catch {
      setTrendingSearches(defaultTrending);
    }
  }, [trendingKey, defaultTrending]);

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

  // Load auth state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('naya-user-email');
    if (stored) {
      setUserEmail(stored);
      setIsPurdue(stored.endsWith('@purdue.edu'));
    }
    const count = parseInt(window.localStorage.getItem('naya-search-count') || '0', 10);
    setSearchCount(count);
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

  const runSearch = async (
    searchQuery: string,
    platformOverride?: 'all' | Platform
  ) => {
    // Abort any in-flight search
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const abort = new AbortController();
    searchAbortRef.current = abort;

    setLoading(true);
    setError(null);
    setQuery(searchQuery);
    setSearchInput(searchQuery);

    const targetPlatform = platformOverride ?? platform;

    // Single-platform search — keep the old simple path
    if (targetPlatform !== 'all') {
      try {
        setPlatformStatus({ ...initialPlatformStatus, [targetPlatform]: 'loading' });
        const params = new URLSearchParams({ q: searchQuery, limit: limit.toString(), platform: targetPlatform });
        const response = await fetch(`/api/search?${params}`, { signal: abort.signal });
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setResults(data);
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

    // Parallel streaming: fire all 4 platforms independently, merge as each resolves
    const emptyResults: SearchResults = {
      query: searchQuery,
      limit,
      platform: 'all',
      results: { ebay: [], grailed: [], depop: [], poshmark: [] },
    };
    setResults(emptyResults);
    setPlatformStatus({ ebay: 'loading', grailed: 'loading', depop: 'loading', poshmark: 'loading' });

    let doneCount = 0;
    let anySuccess = false;

    const fetchPlatform = async (p: Platform) => {
      try {
        const params = new URLSearchParams({ q: searchQuery, limit: limit.toString(), platform: p });
        const response = await fetch(`/api/search?${params}`, { signal: abort.signal });
        if (!response.ok) throw new Error(`${p} failed`);
        const data = await response.json();
        const platformItems: Product[] = data.results?.[p] || [];

        // Merge this platform's results into state
        setResults((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            results: { ...prev.results, [p]: platformItems },
          };
        });
        setPlatformStatus((prev) => ({ ...prev, [p]: 'done' }));
        anySuccess = true;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setPlatformStatus((prev) => ({ ...prev, [p]: 'error' }));
        }
      } finally {
        doneCount++;
        if (doneCount === ACTIVE_PLATFORMS.length && !abort.signal.aborted) {
          setLoading(false);
          if (!anySuccess) setError('oops, something went wrong. try again?');
        }
      }
    };

    ACTIVE_PLATFORMS.forEach((p) => fetchPlatform(p));
    trackSearch(searchQuery);
  };

  const trackSearch = (searchQuery: string) => {
    const newCount = searchCount + 1;
    setSearchCount(newCount);
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('naya-search-count', String(newCount));

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

  const handleSearch = (
    searchQuery: string,
    platformOverride?: 'all' | Platform
  ) => {
    if (!searchQuery.trim()) return;

    if (!userEmail && typeof window !== 'undefined' && !window.localStorage.getItem('naya-user-email')) {
      pendingSearchRef.current = { query: searchQuery, platform: platformOverride };
      setShowEmailGate(true);
      return;
    }

    const currentIsPurdue = isPurdue || (typeof window !== 'undefined' && (window.localStorage.getItem('naya-user-email') || '').endsWith('@purdue.edu'));
    if (!currentIsPurdue) {
      const currentCount = typeof window !== 'undefined'
        ? parseInt(window.localStorage.getItem('naya-search-count') || '0', 10)
        : searchCount;
      if (currentCount >= SEARCH_LIMIT) {
        pendingSearchRef.current = { query: searchQuery, platform: platformOverride };
        setShowLimitGate(true);
        return;
      }
    }

    runSearch(searchQuery, platformOverride);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setEmailError('please enter a valid email.');
      return;
    }

    setEmailLoading(true);
    setEmailError(null);

    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Still let them through even if recording fails
    }

    window.localStorage.setItem('naya-user-email', email);
    setUserEmail(email);
    const purdueUser = email.endsWith('@purdue.edu');
    setIsPurdue(purdueUser);
    if (purdueUser) {
      window.localStorage.setItem('naya-search-count', '0');
      setSearchCount(0);
    }
    setShowEmailGate(false);
    setShowLimitGate(false);
    setEmailLoading(false);

    const pending = pendingSearchRef.current;
    pendingSearchRef.current = null;
    if (pending) {
      runSearch(pending.query, pending.platform);
    }
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
  };

  return {
    // search
    query,
    searchInput,
    setSearchInput,
    results,
    loading,
    error,
    handleSearch,
    clearResults,
    handleShareSearch,
    shareCopied,
    // auth
    userEmail,
    isPurdue,
    searchCount,
    showEmailGate,
    setShowEmailGate,
    showLimitGate,
    setShowLimitGate,
    emailInput,
    setEmailInput,
    emailError,
    emailLoading,
    handleEmailSubmit,
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
    filters: { minPrice: '', maxPrice: '', size: '', condition: '' },
  } as const;
}
