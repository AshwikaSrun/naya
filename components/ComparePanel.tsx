'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getCompareItems, removeFromCompare, clearCompare, type CompareProduct } from '@/lib/compare';

interface ComparePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ComparePanel({ open, onClose }: ComparePanelProps) {
  const [items, setItems] = useState<CompareProduct[]>([]);

  useEffect(() => {
    if (open) setItems(getCompareItems());
  }, [open]);

  useEffect(() => {
    const handler = () => setItems(getCompareItems());
    window.addEventListener('naya-compare-update', handler);
    return () => window.removeEventListener('naya-compare-update', handler);
  }, []);

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

  if (!open) return null;

  const cheapest = items.length ? items.reduce((a, b) => (a.price < b.price ? a : b)) : null;

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-4xl flex-col overflow-y-auto bg-[#f7f5f2]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-6 py-4">
          <h2 className="font-naya-serif text-lg font-medium lowercase tracking-[0.08em]">
            compare listings
          </h2>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCompare}
                className="text-[11px] uppercase tracking-[0.2em] text-black/40 transition-colors hover:text-black/70"
              >
                clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:opacity-80"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm text-black/50">Add items to compare across platforms</p>
              <p className="mt-1 text-[11px] text-black/40">Same piece, different prices — find the best deal</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div key={item.url} className="rounded-2xl border border-black/10 bg-white overflow-hidden">
                  <div className="relative aspect-[3/4] bg-neutral-100">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => removeFromCompare(item.url)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black/60 shadow-sm hover:bg-white"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {cheapest && item.url === cheapest.url && (
                      <span className="absolute left-2 top-2 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">
                        best price
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-black/40">{item.source}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-black">{item.title}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-lg font-bold text-black">${item.price.toFixed(2)}</span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-xs text-black/40 line-through">
                          ${item.originalPrice.toFixed(0)}
                        </span>
                      )}
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block w-full rounded-xl bg-black py-2.5 text-center text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                    >
                      view on {item.source}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
