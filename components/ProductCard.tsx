'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Product {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark';
}

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  const isDepop = product.source === 'depop';
  const preferredImage = isDepop
    ? product.image.replace(/\/P\d+(\.\w+)$/i, '/P1000$1')
    : product.image;
  const [imageSrc, setImageSrc] = useState(preferredImage);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    setImageSrc(preferredImage);
  }, [preferredImage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('wishlistItems');
      const parsed = stored ? (JSON.parse(stored) as Product[]) : [];
      setIsWishlisted(parsed.some((item) => item.url === product.url));
    } catch {}
  }, [product.url]);

  const updateWishlist = (next: boolean) => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('wishlistItems');
      const parsed = stored ? (JSON.parse(stored) as Product[]) : [];
      const updated = next
        ? [product, ...parsed.filter((i) => i.url !== product.url)]
        : parsed.filter((i) => i.url !== product.url);
      window.localStorage.setItem('wishlistItems', JSON.stringify(updated));
      setIsWishlisted(next);
    } catch {}
  };

  const handleRecentlyViewed = () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('recentlyViewed');
      const parsed = stored ? (JSON.parse(stored) as Product[]) : [];
      const next = [product, ...parsed.filter((i) => i.url !== product.url)].slice(0, 6);
      window.localStorage.setItem('recentlyViewed', JSON.stringify(next));
    } catch {}
  };

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white"
      onClick={() => {
        handleRecentlyViewed();
        onSelect?.(product);
      }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
        <Image
          src={imageSrc}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          unoptimized
          onError={() => {
            if (imageSrc !== product.image) setImageSrc(product.image);
          }}
        />

        {/* Heart button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            updateWishlist(!isWishlisted);
          }}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save'}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black/60 shadow-sm transition-all hover:bg-white"
        >
          <svg
            className="h-4 w-4"
            fill={isWishlisted ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.682l-7.682-7.318a4.5 4.5 0 010-6.364z"
            />
          </svg>
        </button>

        {/* Discount badge */}
        {product.discountPercent && product.discountPercent > 0 && (
          <div className="absolute left-3 top-3 z-10 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm">
            -{product.discountPercent}%
          </div>
        )}

        {/* Source badge */}
        <div className="absolute bottom-3 left-3 z-10 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-black shadow-sm">
          {product.source}
        </div>

        {/* Price badge */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 shadow-sm">
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-[10px] text-black/40 line-through">
              ${product.originalPrice.toFixed(0)}
            </span>
          )}
          <span className="text-[12px] font-semibold text-black">
            ${product.price.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
