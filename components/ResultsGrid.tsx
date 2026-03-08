'use client';

import { useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import ProductDetailPanel from './ProductDetailPanel';

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

interface ResultsGridProps {
  results: SearchResults;
  filters: {
    minPrice: string;
    maxPrice: string;
    size: string;
    condition: string;
  };
}

type SourceFilter = 'all' | 'ebay' | 'grailed' | 'depop' | 'poshmark';

const PLATFORM_LABELS: Record<SourceFilter, string> = {
  all: 'all',
  ebay: 'ebay',
  grailed: 'grailed',
  depop: 'depop',
  poshmark: 'poshmark',
};

function interleave(arrays: Product[][]): Product[] {
  const result: Product[] = [];
  const maxLen = Math.max(...arrays.map((a) => a.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const arr of arrays) {
      if (i < arr.length) result.push(arr[i]);
    }
  }
  return result;
}

export default function ResultsGrid({ results, filters }: ResultsGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortBy, setSortBy] = useState<'mixed' | 'price-low' | 'price-high'>('mixed');
  const perPage = 15;

  const platformArrays = useMemo(() => ({
    ebay: (results.results.ebay || []).map((p) => ({ ...p, source: 'ebay' as const })),
    grailed: (results.results.grailed || []).map((p) => ({ ...p, source: 'grailed' as const })),
    depop: (results.results.depop || []).map((p) => ({ ...p, source: 'depop' as const })),
    poshmark: (results.results.poshmark || []).map((p) => ({ ...p, source: 'poshmark' as const })),
  }), [results]);

  const platformCounts = useMemo(() => ({
    all: Object.values(platformArrays).reduce((s, a) => s + a.length, 0),
    ebay: platformArrays.ebay.length,
    grailed: platformArrays.grailed.length,
    depop: platformArrays.depop.length,
    poshmark: platformArrays.poshmark.length,
  }), [platformArrays]);

  const filteredProducts = useMemo(() => {
    let products: Product[];

    if (sourceFilter === 'all') {
      products = interleave([
        platformArrays.ebay,
        platformArrays.grailed,
        platformArrays.depop,
        platformArrays.poshmark,
      ]);
    } else {
      products = platformArrays[sourceFilter];
    }

    const minPrice = filters.minPrice ? Number(filters.minPrice) : null;
    const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null;
    if (minPrice !== null || maxPrice !== null) {
      products = products.filter((p) => {
        if (minPrice !== null && p.price < minPrice) return false;
        if (maxPrice !== null && p.price > maxPrice) return false;
        return true;
      });
    }

    if (sortBy === 'price-low') {
      products = [...products].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      products = [...products].sort((a, b) => b.price - a.price);
    }

    return products;
  }, [platformArrays, sourceFilter, filters, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
  const saferPage = Math.min(page, totalPages);
  const startIdx = (saferPage - 1) * perPage;
  const pageProducts = filteredProducts.slice(startIdx, startIdx + perPage);

  if (filteredProducts.length === 0) {
    return (
      <div className="space-y-4">
        <FilterBar
          sourceFilter={sourceFilter}
          setSourceFilter={(f) => { setSourceFilter(f); setPage(1); }}
          sortBy={sortBy}
          setSortBy={(s) => { setSortBy(s); setPage(1); }}
          counts={platformCounts}
        />
        <div className="mx-auto max-w-md rounded-xl border border-black/10 bg-white p-8 text-center">
          <p className="text-sm text-black/60">
            No results found for &quot;{results.query}&quot;
          </p>
          <p className="mt-2 text-xs text-black/40">
            Try different keywords or adjust filters
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <FilterBar
          sourceFilter={sourceFilter}
          setSourceFilter={(f) => { setSourceFilter(f); setPage(1); }}
          sortBy={sortBy}
          setSortBy={(s) => { setSortBy(s); setPage(1); }}
          counts={platformCounts}
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-black/60">
            Showing {startIdx + 1}–{Math.min(startIdx + perPage, filteredProducts.length)} of {filteredProducts.length} results
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={saferPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-sm text-black/60 transition-opacity hover:opacity-70 disabled:opacity-30"
            >
              ‹
            </button>
            <span className="text-xs text-black/50">{saferPage} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={saferPage === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-sm text-black/60 transition-opacity hover:opacity-70 disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {pageProducts.map((product, index) => (
            <ProductCard
              key={`${product.source}-${product.url}-${index}`}
              product={product}
              onSelect={setSelectedProduct}
            />
          ))}
        </div>
      </div>

      <ProductDetailPanel
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  );
}

function FilterBar({
  sourceFilter,
  setSourceFilter,
  sortBy,
  setSortBy,
  counts,
}: {
  sourceFilter: SourceFilter;
  setSourceFilter: (f: SourceFilter) => void;
  sortBy: 'mixed' | 'price-low' | 'price-high';
  setSortBy: (s: 'mixed' | 'price-low' | 'price-high') => void;
  counts: Record<SourceFilter, number>;
}) {
  const platforms: SourceFilter[] = ['all', 'ebay', 'grailed', 'depop', 'poshmark'];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {platforms.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setSourceFilter(p)}
            className={`rounded-full border px-3 py-1.5 text-[11px] lowercase tracking-wider transition-all ${
              sourceFilter === p
                ? 'border-black bg-black text-white'
                : 'border-black/15 bg-white text-black/60 hover:border-black/30 hover:text-black'
            }`}
          >
            {PLATFORM_LABELS[p]}
            <span className="ml-1.5 opacity-50">{counts[p]}</span>
          </button>
        ))}
      </div>

      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as 'mixed' | 'price-low' | 'price-high')}
        className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-[11px] lowercase tracking-wider text-black/60 outline-none"
      >
        <option value="mixed">mixed</option>
        <option value="price-low">price: low to high</option>
        <option value="price-high">price: high to low</option>
      </select>
    </div>
  );
}
