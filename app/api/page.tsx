'use client';

import { useState } from 'react';
import SearchBar from '@/components/SearchBar';
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

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filters = { minPrice: '', maxPrice: '', size: '', condition: '' };
  const limit = 50;
  const allPlatforms = [
    'ebay',
    'grailed',
    'depop',
    'poshmark',
  ] as const;
  type Platform = (typeof allPlatforms)[number];
  const [platform, setPlatform] = useState<'all' | Platform>('all');

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setQuery(searchQuery);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: limit.toString(),
        platform: platform,
      });

      const response = await fetch(`/api/search?${params}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError('oops, something went wrong. try again?');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-night-bg">
      {/* Orange glow background effect */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-orange-glow opacity-10 blur-3xl"></div>
        <div className="absolute -right-1/4 -bottom-1/4 h-[500px] w-[500px] rounded-full bg-warm-amber opacity-10 blur-3xl"></div>
      </div>

      <div className="container relative mx-auto px-4 py-8 md:px-8 md:py-12">
        {/* Header */}
        <header className="mb-10 text-center md:mb-14">
          <h1 className="mb-3 text-6xl font-bold lowercase tracking-tight text-text-primary md:text-7xl">
            naya
          </h1>
          <p className="text-base lowercase text-text-secondary md:text-lg">
            the entire marketplace in one search
          </p>
          <p className="mt-2 text-xs lowercase text-text-muted md:text-sm">
            currently searching multiple marketplaces • more platforms coming soon
          </p>
        </header>

        {/* Search Section */}
        <div className="mb-12">
          <SearchBar onSearch={handleSearch} disabled={loading} />
          
          {/* Filters */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium lowercase text-text-secondary">platform:</span>
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value as 'all' | Platform)}
                disabled={loading}
                className="rounded-lg border-2 border-border-dark bg-night-card px-4 py-2 text-xs font-medium lowercase text-text-secondary transition-all focus:border-orange-glow focus:outline-none focus:ring-2 focus:ring-orange-glow/10"
              >
                <option value="all">all platforms</option>
                {allPlatforms.map((platformOption) => (
                  <option key={platformOption} value={platformOption}>
                    {platformOption}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mx-auto max-w-md rounded-xl border-2 border-border-dark bg-night-card p-8 text-center shadow-vibrant">
            <p className="text-sm font-medium lowercase text-text-secondary">{error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && results && (
          <ResultsGrid results={results} filters={filters} />
        )}

        {/* Empty State */}
        {!loading && !results && !error && (
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-block rounded-xl border-2 border-border-dark bg-night-card px-6 py-4 shadow-soft">
              <p className="text-sm font-medium lowercase text-text-secondary">
                search for fashion finds across multiple platforms
              </p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 text-left md:grid-cols-3">
              <div className="rounded-lg border-2 border-border-dark bg-night-card p-4 shadow-soft">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-glow">try searching</p>
                <p className="text-sm lowercase text-text-secondary">nike hoodies</p>
              </div>
              <div className="rounded-lg border-2 border-border-dark bg-night-card p-4 shadow-soft">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-glow">try searching</p>
                <p className="text-sm lowercase text-text-secondary">y2k jeans</p>
              </div>
              <div className="rounded-lg border-2 border-border-dark bg-night-card p-4 shadow-soft">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-glow">try searching</p>
                <p className="text-sm lowercase text-text-secondary">90s tees</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
