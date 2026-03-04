'use client';

import { useState } from 'react';
import ProductCard from './ProductCard';
import ProductDetailPanel from './ProductDetailPanel';

interface Product {
  title: string;
  price: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark' | 'etsy' | 'google_shopping';
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
    etsy: Product[];
    google_shopping: Product[];
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

export default function ResultsGrid({ results, filters }: ResultsGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 15;

  const allProducts = [
    ...results.results.ebay.map((p) => ({ ...p, source: 'ebay' as const })),
    ...results.results.grailed.map((p) => ({ ...p, source: 'grailed' as const })),
    ...results.results.depop.map((p) => ({ ...p, source: 'depop' as const })),
    ...results.results.poshmark.map((p) => ({ ...p, source: 'poshmark' as const })),
    ...results.results.etsy.map((p) => ({ ...p, source: 'etsy' as const })),
    ...results.results.google_shopping.map((p) => ({ ...p, source: 'google_shopping' as const })),
  ];

  const minPrice = filters.minPrice ? Number(filters.minPrice) : null;
  const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null;
  const filteredProducts = allProducts.filter((product) => {
    if (minPrice !== null && product.price < minPrice) return false;
    if (maxPrice !== null && product.price > maxPrice) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
  const startIdx = (page - 1) * perPage;
  const pageProducts = filteredProducts.slice(startIdx, startIdx + perPage);

  if (filteredProducts.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-black/10 bg-white p-8 text-center">
        <p className="text-sm text-black/60">
          No results found for &quot;{results.query}&quot;
        </p>
        <p className="mt-2 text-xs text-black/40">
          Try different keywords or adjust filters
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-black/60">
            Showing {startIdx + 1}–{Math.min(startIdx + perPage, filteredProducts.length)} of {filteredProducts.length} results
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-sm text-black/60 transition-opacity hover:opacity-70 disabled:opacity-30"
            >
              ‹
            </button>
            <span className="text-xs text-black/50">{page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-sm text-black/60 transition-opacity hover:opacity-70 disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {pageProducts.map((product, index) => (
            <ProductCard
              key={`${product.source}-${index}`}
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
