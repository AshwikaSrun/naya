'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import ProductDetailPanel from '@/components/ProductDetailPanel';
import LoadingSpinner from '@/components/LoadingSpinner';

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
  results: {
    ebay: Product[];
    grailed: Product[];
    depop: Product[];
    poshmark: Product[];
  };
}

const DEAL_CATEGORIES = [
  { label: 'Nike', query: 'Nike' },
  { label: "Levi's", query: "Levi's denim" },
  { label: 'Adidas', query: 'Adidas' },
  { label: 'Ralph Lauren', query: 'Ralph Lauren' },
  { label: 'Designer bags', query: 'designer handbag' },
  { label: 'Vintage tees', query: 'vintage graphic tee' },
  { label: 'Jordans', query: 'Jordan sneakers' },
  { label: 'Carhartt', query: 'Carhartt' },
];

const MIN_DISCOUNT = 30;

export default function DealsPage() {
  const [activeCategory, setActiveCategory] = useState(DEAL_CATEGORIES[0]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchDeals = async () => {
      try {
        const params = new URLSearchParams({
          q: activeCategory.query,
          limit: '50',
          platform: 'all',
        });
        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) throw new Error('fetch failed');
        const data: SearchResults = await res.json();

        if (cancelled) return;

        const all = [
          ...(data.results.ebay || []).map((p) => ({ ...p, source: 'ebay' as const })),
          ...(data.results.grailed || []).map((p) => ({ ...p, source: 'grailed' as const })),
          ...(data.results.depop || []).map((p) => ({ ...p, source: 'depop' as const })),
          ...(data.results.poshmark || []).map((p) => ({ ...p, source: 'poshmark' as const })),
        ];

        const deals = all
          .filter((p) => (p.discountPercent ?? 0) >= MIN_DISCOUNT)
          .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));

        setProducts(deals);
      } catch {
        setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDeals();
    return () => { cancelled = true; };
  }, [activeCategory]);

  const dealsCount = useMemo(() => products.length, [products]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black"
          >
            naya
          </Link>
          <nav className="font-naya-sans hidden items-center gap-3 text-[10px] lowercase tracking-[0.15em] text-black/60 md:flex">
            <Link href="/editorial" className="px-3 py-1.5 transition-colors hover:text-black">editorial</Link>
            <Link href="/brands" className="px-3 py-1.5 transition-colors hover:text-black">brands</Link>
            <Link href="/deals" className="px-3 py-1.5 text-black font-medium">deals</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-black/5 bg-gradient-to-b from-emerald-50/60 to-white px-6 py-12 text-center">
        <p className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-emerald-700/60">
          deals
        </p>
        <h1 className="font-naya-serif mt-3 text-3xl font-light text-black md:text-5xl">
          biggest discounts right now.
        </h1>
        <p className="mt-3 text-sm font-light text-black/50">
          items with {MIN_DISCOUNT}%+ off across all marketplaces
        </p>
      </section>

      {/* Category pills */}
      <div className="border-b border-black/5 px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          {DEAL_CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-4 py-2 text-[11px] tracking-wider transition-all ${
                activeCategory.label === cat.label
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-black/15 bg-white text-black/60 hover:border-emerald-600/40 hover:text-emerald-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <LoadingSpinner />
            <p className="text-sm text-black/50">Finding the best deals...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="mx-auto max-w-md rounded-xl border border-black/10 bg-white p-8 text-center">
            <p className="text-sm text-black/60">
              No deals found for &quot;{activeCategory.label}&quot; right now
            </p>
            <p className="mt-2 text-xs text-black/40">
              Try another category — deals refresh with every search
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-black/50">
              {dealsCount} deal{dealsCount !== 1 ? 's' : ''} found
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {products.map((product, i) => (
                <ProductCard
                  key={`${product.source}-${product.url}-${i}`}
                  product={product}
                  onSelect={setSelectedProduct}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <ProductDetailPanel
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
