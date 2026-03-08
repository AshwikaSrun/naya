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

interface CartPanelProps {
  open: boolean;
  onClose: () => void;
}

function getCart(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem('naya-cart');
    return stored ? (JSON.parse(stored) as Product[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: Product[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('naya-cart', JSON.stringify(items));
  window.dispatchEvent(new Event('naya-cart-update'));
}

export function addToCart(product: Product) {
  const cart = getCart();
  if (cart.some((i) => i.url === product.url)) return;
  saveCart([product, ...cart]);
}

export function removeFromCart(url: string) {
  const cart = getCart();
  saveCart(cart.filter((i) => i.url !== url));
}

export function isInCart(url: string): boolean {
  return getCart().some((i) => i.url === url);
}

export function getCartCount(): number {
  return getCart().length;
}

export default function CartPanel({ open, onClose }: CartPanelProps) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    if (open) setItems(getCart());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleRemove = (url: string) => {
    removeFromCart(url);
    setItems((prev) => prev.filter((i) => i.url !== url));
  };

  const total = items.reduce((sum, i) => sum + i.price, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
          <div>
            <h2 className="font-naya-serif text-xl font-light text-black">your cart</h2>
            <p className="font-naya-sans mt-0.5 text-[10px] lowercase tracking-[0.1em] text-black/40">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-black/60 transition-colors hover:bg-black/10"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <svg className="h-12 w-12 text-black/10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p className="font-naya-sans mt-4 text-sm text-black/40">your cart is empty</p>
              <p className="font-naya-sans mt-1 text-[11px] text-black/25">items you add will show up here</p>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {items.map((item) => (
                <div key={item.url} className="flex gap-4 px-6 py-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <p className="line-clamp-2 text-sm font-medium text-black">{item.title}</p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-black/40">{item.source}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-black">${item.price.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.url)}
                        className="text-[10px] lowercase tracking-[0.1em] text-black/30 transition-colors hover:text-red-500"
                      >
                        remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-black/5 px-6 py-5">
            <div className="flex items-center justify-between">
              <span className="font-naya-sans text-sm text-black/50">total</span>
              <span className="text-lg font-semibold text-black">${total.toFixed(2)}</span>
            </div>
            <p className="font-naya-sans mt-1 text-[10px] text-black/30">
              items link to their original marketplace
            </p>
            <div className="mt-4 space-y-2">
              {items.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl bg-black px-5 py-3 text-sm text-white transition-opacity hover:opacity-90"
                >
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="ml-3 shrink-0 text-[10px] uppercase tracking-wider text-white/50">
                    {item.source} →
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
