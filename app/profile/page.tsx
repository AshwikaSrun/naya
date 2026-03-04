'use client';

import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';

interface Product {
  title: string;
  price: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark';
}

export default function ProfilePage() {
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [prefs, setPrefs] = useState({
    size: '',
    budget: '$40',
    style: 'casual',
    alertEmail: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedWishlist = window.localStorage.getItem('wishlistItems');
      const parsedWishlist = storedWishlist
        ? (JSON.parse(storedWishlist) as Product[])
        : [];
      setWishlist(parsedWishlist);
      const storedPrefs = window.localStorage.getItem('profilePrefs');
      if (storedPrefs) {
        setPrefs(JSON.parse(storedPrefs));
      } else {
        const alertEmail = window.localStorage.getItem('alertEmail') || '';
        setPrefs((prev) => ({ ...prev, alertEmail }));
      }
    } catch (error) {
      console.error('Failed to load profile data', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('profilePrefs', JSON.stringify(prefs));
  }, [prefs]);

  return (
    <div className="min-h-screen bg-night-bg">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <header className="mb-12 text-center">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-text-muted">
            profile
          </p>
          <h1 className="mb-3 text-4xl font-semibold uppercase tracking-[0.18em] text-text-primary md:text-5xl">
            NAYA EDITS
          </h1>
          <p className="text-[11px] uppercase tracking-[0.24em] text-text-secondary">
            saved + personalized
          </p>
        </header>

        <section className="mb-12 grid gap-6 border border-black/10 bg-white p-8 md:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Size</p>
            <select
              value={prefs.size}
              onChange={(event) => setPrefs((prev) => ({ ...prev, size: event.target.value }))}
              className="mt-2 w-full border-b border-black/20 bg-transparent py-2 text-[11px] uppercase tracking-[0.2em] text-text-primary focus:border-black focus:outline-none"
            >
              <option value="">any</option>
              <option value="xs">xs</option>
              <option value="s">s</option>
              <option value="m">m</option>
              <option value="l">l</option>
              <option value="xl">xl</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Budget</p>
            <select
              value={prefs.budget}
              onChange={(event) => setPrefs((prev) => ({ ...prev, budget: event.target.value }))}
              className="mt-2 w-full border-b border-black/20 bg-transparent py-2 text-[11px] uppercase tracking-[0.2em] text-text-primary focus:border-black focus:outline-none"
            >
              <option value="$25">$25</option>
              <option value="$40">$40</option>
              <option value="$60">$60</option>
              <option value="$100">$100</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Style</p>
            <select
              value={prefs.style}
              onChange={(event) => setPrefs((prev) => ({ ...prev, style: event.target.value }))}
              className="mt-2 w-full border-b border-black/20 bg-transparent py-2 text-[11px] uppercase tracking-[0.2em] text-text-primary focus:border-black focus:outline-none"
            >
              <option value="casual">casual</option>
              <option value="minimal">minimal</option>
              <option value="vintage">vintage</option>
              <option value="streetwear">streetwear</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Alerts</p>
            <input
              type="email"
              value={prefs.alertEmail}
              onChange={(event) =>
                setPrefs((prev) => ({ ...prev, alertEmail: event.target.value }))
              }
              placeholder="email"
              className="mt-2 w-full border-b border-black/20 bg-transparent py-2 text-[11px] uppercase tracking-[0.2em] text-text-primary focus:border-black focus:outline-none"
            />
          </div>
        </section>

        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-text-muted">
            saved items
          </p>
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center text-xs uppercase tracking-[0.2em] text-text-muted">
            no saved items yet
          </div>
        ) : (
          <div className="columns-2 gap-5 sm:columns-3 lg:columns-4">
            {wishlist.map((product, index) => (
              <div key={`${product.source}-${index}`} className="mb-5 break-inside-avoid">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
