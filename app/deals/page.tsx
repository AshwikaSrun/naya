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
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark' | 'boiler_vintage';
}

interface SearchResults {
  results: {
    ebay: Product[];
    grailed: Product[];
    depop: Product[];
    poshmark: Product[];
  };
}

const ALL_DEALS_QUERIES = ['vintage fashion', 'designer', 'streetwear'];

const DEAL_CATEGORIES = [
  { label: 'All deals', query: '', isBroad: true },
  { label: 'Nike', query: 'Nike' },
  { label: "Levi's", query: "Levi's denim" },
  { label: 'Adidas', query: 'Adidas' },
  { label: 'Ralph Lauren', query: 'Ralph Lauren' },
  { label: 'Designer bags', query: 'designer handbag' },
  { label: 'Vintage tees', query: 'vintage graphic tee' },
  { label: 'Jordans', query: 'Jordan sneakers' },
  { label: 'Carhartt', query: 'Carhartt' },
  { label: 'Vintage denim', query: 'vintage denim' },
  { label: 'Outerwear', query: 'vintage outerwear' },
  { label: 'Accessories', query: 'vintage accessories' },
];

const MIN_DISCOUNT = 30;

/** Filter to Pinterest-style curated, aesthetic items — exclude junk, prefer fashion-forward */
function isPinteresty(p: Product): boolean {
  const t = (p.title || '').toLowerCase();
  if (t.length < 12) return false;
  if (/\b(bulk|lot\s+of|wholesale|bundle\s+deal|clearance\s+lot)\b/.test(t)) return false;
  if (/^\d{6,}/.test(t) || /\b[A-Z]{3,}\d{4,}\b/.test(t)) return false; // sku-style
  const fashionKeywords = ['vintage', 'leather', 'denim', 'silk', 'wool', 'linen', 'streetwear', 'y2k', 'minimal', 'cargo', 'coat', 'jacket', 'blazer', 'dress', 'bag', 'handbag', 'sneaker', 'boot', 'tee', 'graphic', 'designer', 'nike', 'adidas', 'jordan', 'levi', 'ralph', 'carhartt', 'champion', 'north face', 'patagonia'];
  const hasFashion = fashionKeywords.some((k) => t.includes(k));
  const fromCurated = ['depop', 'grailed'].includes(p.source);
  return hasFashion || fromCurated;
}

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
        const queries = activeCategory.isBroad ? ALL_DEALS_QUERIES : [activeCategory.query];
        const batches = await Promise.all(
          queries.map(async (q) => {
            const params = new URLSearchParams({ q, limit: '25', platform: 'all' });
            const res = await fetch(`/api/search?${params}`);
            if (!res.ok) return [];
            const data: SearchResults = await res.json();
            return [
              ...(data.results.ebay || []).map((p) => ({ ...p, source: 'ebay' as const })),
              ...(data.results.grailed || []).map((p) => ({ ...p, source: 'grailed' as const })),
              ...(data.results.depop || []).map((p) => ({ ...p, source: 'depop' as const })),
              ...(data.results.poshmark || []).map((p) => ({ ...p, source: 'poshmark' as const })),
            ];
          }),
        );

        if (cancelled) return;

        const seen = new Set<string>();
        const all = batches.flat().filter((p) => {
          const key = `${p.source}:${p.url}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const deals = all
          .filter((p) => (p.discountPercent ?? 0) >= MIN_DISCOUNT)
          .filter(isPinteresty)
          .sort((a, b) => {
            const discA = b.discountPercent ?? 0;
            const discB = a.discountPercent ?? 0;
            if (discA !== discB) return discA - discB;
            const curated = ['depop', 'grailed'];
            const aCurated = curated.includes(a.source) ? 1 : 0;
            const bCurated = curated.includes(b.source) ? 1 : 0;
            return bCurated - aCurated;
          });

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
            <Link href="/deals" className="px-3 py-1.5 text-black font-medium">deals</Link>
            <Link href="/college" className="px-3 py-1.5 transition-colors hover:text-black">campus</Link>
            <Link href="/insights" className="px-3 py-1.5 transition-colors hover:text-black">insights</Link>
            <Link href="/app" className="px-3 py-1.5 transition-colors hover:text-black">concierge</Link>
            <Link href="/profile" className="px-3 py-1.5 transition-colors hover:text-black">profile</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-black/5 px-6 py-12 text-center">
        <p className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/30">
          deals
        </p>
        <h1 className="font-naya-serif mt-3 text-3xl font-light text-black md:text-5xl">
          biggest discounts right now.
        </h1>
        <p className="font-naya-sans mt-3 text-sm font-light text-black/40">
          {MIN_DISCOUNT}%+ off across ebay, grailed, depop & poshmark
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
              className={`font-naya-sans rounded-full border px-4 py-2 text-[11px] lowercase tracking-[0.06em] transition-all ${
                activeCategory.label === cat.label
                  ? 'border-black bg-black text-white'
                  : 'border-black/10 bg-white text-black/50 hover:border-black/25 hover:text-black'
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
