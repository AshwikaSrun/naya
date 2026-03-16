'use client';

import { useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import ProductDetailPanel from './ProductDetailPanel';
import PriceIndexBadge from './PriceIndexBadge';
import GetNayaBanner from './GetNayaBanner';

interface Product {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
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

export interface RelatedSearch {
  label: string;
  query: string;
}

const DEFAULT_RELATED: RelatedSearch[] = [
  { label: 'vintage carhartt jacket flat lay', query: 'vintage carhartt jacket' },
  { label: 'vintage nike crewneck clean', query: 'vintage nike crewneck' },
  { label: 'baggy levi 550 minimal', query: 'baggy levi 550' },
  { label: 'y2k zip hoodie', query: 'y2k zip hoodie' },
  { label: 'vintage streetwear aesthetic', query: 'vintage streetwear' },
];

interface ResultsGridProps {
  results: SearchResults;
  filters: {
    minPrice: string;
    maxPrice: string;
    size: string;
    condition: string;
  };
  onSearch?: (query: string) => void;
  relatedSearches?: RelatedSearch[];
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

export default function ResultsGrid({ results, filters, onSearch, relatedSearches = DEFAULT_RELATED }: ResultsGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortBy, setSortBy] = useState<'mixed' | 'price-low' | 'price-high' | 'discount'>('mixed');
  const [minDiscount, setMinDiscount] = useState<number>(0);
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

    if (minDiscount > 0) {
      products = products.filter((p) => (p.discountPercent ?? 0) >= minDiscount);
    }

    if (sortBy === 'price-low') {
      products = [...products].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      products = [...products].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'discount') {
      products = [...products].sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
    }

    return products;
  }, [platformArrays, sourceFilter, filters, sortBy, minDiscount]);

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
          setSortBy={(s) => { setSortBy(s); setPage(1); if (s !== 'discount') setMinDiscount(0); }}
          counts={platformCounts}
          minDiscount={minDiscount}
          setMinDiscount={(d) => { setMinDiscount(d); setPage(1); }}
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
          setSortBy={(s) => { setSortBy(s); setPage(1); if (s !== 'discount') setMinDiscount(0); }}
          counts={platformCounts}
          minDiscount={minDiscount}
          setMinDiscount={(d) => { setMinDiscount(d); setPage(1); }}
        />

        <PriceIndexBadge query={results.query} />

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

        <div className="columns-2 gap-4 sm:columns-3 lg:columns-5 [&>div]:break-inside-avoid [&>div]:mb-4">
          {pageProducts.map((product, index) => (
            <div key={`${product.source}-${product.url}-${index}`}>
              <ProductCard
                product={product}
                onSelect={setSelectedProduct}
              />
            </div>
          ))}
        </div>

        <div className="mt-8">
          <GetNayaBanner variant="inline" />
        </div>

        {onSearch && relatedSearches.length > 0 && (
          <div className="mt-12 border-t border-black/5 pt-8">
            <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-black/40">related searches</p>
            <div className="flex flex-wrap gap-2">
              {relatedSearches.map((r) => (
                <button
                  key={r.query}
                  type="button"
                  onClick={() => onSearch(r.query)}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-[11px] lowercase tracking-[0.08em] text-black/60 transition-colors hover:border-black/20 hover:text-black"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ProductDetailPanel
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </>
  );
}

const SORT_OPTIONS: { value: 'mixed' | 'price-low' | 'price-high' | 'discount'; label: string; icon?: true }[] = [
  { value: 'mixed', label: 'best match' },
  { value: 'price-low', label: 'lowest price' },
  { value: 'price-high', label: 'highest price' },
  { value: 'discount', label: 'best deal', icon: true },
];

const DISCOUNT_TIERS = [0, 20, 40, 60] as const;

function FilterBar({
  sourceFilter,
  setSourceFilter,
  sortBy,
  setSortBy,
  counts,
  minDiscount,
  setMinDiscount,
}: {
  sourceFilter: SourceFilter;
  setSourceFilter: (f: SourceFilter) => void;
  sortBy: 'mixed' | 'price-low' | 'price-high' | 'discount';
  setSortBy: (s: 'mixed' | 'price-low' | 'price-high' | 'discount') => void;
  counts: Record<SourceFilter, number>;
  minDiscount: number;
  setMinDiscount: (d: number) => void;
}) {
  const platforms: SourceFilter[] = ['all', 'ebay', 'grailed', 'depop', 'poshmark'];

  return (
    <div className="space-y-3">
      {/* Platform filters */}
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

      {/* Sort pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.15em] text-black/30">sort:</span>
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortBy === opt.value;
          const isDeal = opt.value === 'discount';
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] lowercase tracking-wider transition-all ${
                isActive
                  ? isDeal
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-black bg-black text-white'
                  : isDeal
                    ? 'border-emerald-600/30 bg-emerald-50 text-emerald-700 hover:border-emerald-600/50'
                    : 'border-black/15 bg-white text-black/60 hover:border-black/30 hover:text-black'
              }`}
            >
              {opt.icon && (
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
              )}
              {opt.label}
            </button>
          );
        })}

        {/* Discount tiers — show inline when "best deal" is active */}
        {sortBy === 'discount' && (
          <>
            <span className="ml-1 text-[10px] text-black/20">|</span>
            {DISCOUNT_TIERS.filter((t) => t > 0).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setMinDiscount(minDiscount === tier ? 0 : tier)}
                className={`rounded-full border px-2.5 py-1 text-[10px] tracking-wider transition-all ${
                  minDiscount === tier
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-emerald-600/20 bg-white text-emerald-700/60 hover:border-emerald-600/40'
                }`}
              >
                {tier}%+ off
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
