'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { addToCart, isInCart } from './CartPanel';
import { getDepopImageUrl, DEPOP_WIDTH_CARD } from '@/lib/depopImage';

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
    ? getDepopImageUrl(product.image, DEPOP_WIDTH_CARD)
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

  // Pull a brand-ish token from the title (first word) so we can show
  // an editorial-looking kicker without a brand field on the product.
  const brandGuess = (() => {
    const first = (product.title || '').trim().split(/\s+/)[0];
    if (!first) return '';
    // Skip filler words so we get "Carhartt" not "Vintage"
    const skip = new Set(['vintage', 'new', 'y2k', 'rare', 'nwt', 'euc', 'the', 'a', 'an']);
    if (skip.has(first.toLowerCase())) {
      const second = (product.title || '').trim().split(/\s+/)[1] || first;
      return second;
    }
    return first;
  })();

  return (
    <div
      className="group cursor-pointer"
      onClick={() => {
        handleRecentlyViewed();
        onSelect?.(product);
      }}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-black/[0.04]">
        <Image
          src={imageSrc}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          unoptimized
          onError={() => {
            if (imageSrc !== product.image) setImageSrc(product.image);
          }}
        />

        {/* Hover darkening wash — reveals source badge subtly */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Save heart */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            updateWishlist(!isWishlisted);
          }}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save'}
          className={`absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-black shadow-sm backdrop-blur-sm transition-all hover:bg-white ${
            isWishlisted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <svg
            className="h-3.5 w-3.5"
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

        {/* Discount badge — top-left, monochrome */}
        {product.discountPercent && product.discountPercent > 0 && (
          <div
            className="font-naya-sans absolute left-2.5 top-2.5 z-10 rounded-sm bg-black px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white"
          >
            −{product.discountPercent}%
          </div>
        )}

        {/* Cart pulse if already added */}
        {inCart && (
          <div className="font-naya-sans absolute bottom-2.5 left-2.5 rounded-sm bg-white/95 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-black">
            in cart
          </div>
        )}

        {/* Source badge — only on hover, bottom-right */}
        <span
          className="font-naya-sans absolute bottom-2.5 right-2.5 rounded-sm bg-white/95 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-black opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100"
        >
          {product.source}
        </span>
      </div>

      {/* Info below image — editorial, price-forward */}
      <div className="px-0.5 pt-3 pb-1">
        <p className="font-naya-sans text-[10px] font-medium uppercase tracking-[0.18em] text-black/55">
          {brandGuess}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-naya-sans text-[15px] font-semibold tracking-[-0.01em] text-black">
            ${product.price.toFixed(0)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="font-naya-sans text-[11px] text-black/35 line-through">
              ${product.originalPrice.toFixed(0)}
            </span>
          )}
        </div>
        <p className="font-naya-sans mt-1 line-clamp-1 text-[12px] leading-snug text-black/55">
          {product.title}
        </p>
      </div>
    </div>
  );
}
