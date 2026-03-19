'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { addToCart, isInCart } from './CartPanel';
import { getDepopImageUrl } from '@/lib/depopImage';

interface Product {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark' | 'boiler_vintage';
}

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  const preferredImage = product.source === 'depop'
    ? getDepopImageUrl(product.image, 600)
    : product.image;
  const [imageSrc, setImageSrc] = useState(preferredImage);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [inCart, setInCart] = useState(false);

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
    setInCart(isInCart(product.url));
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
      className="group cursor-pointer"
      onClick={() => {
        handleRecentlyViewed();
        onSelect?.(product);
      }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-100">
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

        {/* Heart — only visible on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            updateWishlist(!isWishlisted);
          }}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save'}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black/60 shadow-sm transition-all hover:bg-white ${
            isWishlisted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
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
          <div className={`absolute left-3 top-3 z-10 rounded-md px-2 py-0.5 text-[10px] font-semibold text-white ${
            product.discountPercent >= 50 ? 'bg-red-500' : 'bg-black/70'
          }`}>
            {product.discountPercent}% off
          </div>
        )}
      </div>

      {/* Info below image — Pinterest style */}
      <div className="px-1 pt-2 pb-1">
        <p className="text-[11px] font-medium capitalize text-black/40">{product.source}</p>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-black/80">
          {product.title}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[14px] font-semibold text-black">
            ${product.price.toFixed(2)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-[11px] text-black/35 line-through">
              ${product.originalPrice.toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
