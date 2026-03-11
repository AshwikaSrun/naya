'use client';

import { useState } from 'react';
import ProductCard from './ProductCard';
import ProductDetailPanel from './ProductDetailPanel';

interface Product {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark';
}

interface CampusProductGridProps {
  products: Product[];
  columns?: 4 | 5 | 6;
}

export default function CampusProductGrid({ products, columns = 6 }: CampusProductGridProps) {
  const [selected, setSelected] = useState<Product | null>(null);

  if (products.length === 0) return null;

  return (
    <>
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${columns === 4 ? 'lg:grid-cols-4' : columns === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-6'}`}>
        {products.map((product, i) => (
          <ProductCard key={`${product.source}-${product.url}-${i}`} product={product} onSelect={setSelected} />
        ))}
      </div>
      <ProductDetailPanel product={selected} onClose={() => setSelected(null)} />
    </>
  );
}
