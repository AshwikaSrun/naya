'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import DealDiscoveryNotifications from '@/components/DealDiscoveryNotifications';

interface Product {
  title: string;
  price: number;
  image: string;
  url: string;
  source: 'ebay' | 'grailed' | 'depop' | 'poshmark' | 'boiler_vintage';
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
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-naya-serif text-2xl font-light lowercase tracking-[0.12em] text-black">naya</Link>
          <nav className="font-naya-sans hidden items-center gap-3 text-[10px] lowercase tracking-[0.15em] text-black/60 md:flex">
            <Link href="/deals" className="px-3 py-1.5 transition-colors hover:text-black">deals</Link>
            <Link href="/college" className="px-3 py-1.5 transition-colors hover:text-black">campus</Link>
            <Link href="/insights" className="px-3 py-1.5 transition-colors hover:text-black">insights</Link>
            <Link href="/app" className="px-3 py-1.5 transition-colors hover:text-black">concierge</Link>
            <Link href="/profile" className="px-3 py-1.5 text-black font-medium">profile</Link>
          </nav>
        </div>

        <header className="mb-12 text-center">
          <p className="font-naya-sans mb-4 text-[10px] uppercase tracking-[0.2em] text-black/30">
            profile
          </p>
          <h1 className="font-naya-serif mb-3 text-3xl font-light text-black md:text-5xl">
            your naya.
          </h1>
          <p className="font-naya-sans text-sm text-black/40">
            saved items and preferences
          </p>
        </header>

        <section className="mb-12 grid gap-6 rounded-2xl border border-black/8 bg-[#faf9f7] p-8 md:grid-cols-4">
          <div>
            <p className="font-naya-sans text-[9px] uppercase tracking-[0.18em] text-black/25">size</p>
            <select
              value={prefs.size}
              onChange={(event) => setPrefs((prev) => ({ ...prev, size: event.target.value }))}
              className="font-naya-sans mt-2 w-full border-b border-black/10 bg-transparent py-2 text-[12px] lowercase text-black focus:border-black focus:outline-none"
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
            <p className="font-naya-sans text-[9px] uppercase tracking-[0.18em] text-black/25">budget</p>
            <select
              value={prefs.budget}
              onChange={(event) => setPrefs((prev) => ({ ...prev, budget: event.target.value }))}
              className="font-naya-sans mt-2 w-full border-b border-black/10 bg-transparent py-2 text-[12px] lowercase text-black focus:border-black focus:outline-none"
            >
              <option value="$25">$25</option>
              <option value="$40">$40</option>
              <option value="$60">$60</option>
              <option value="$100">$100</option>
            </select>
          </div>
          <div>
            <p className="font-naya-sans text-[9px] uppercase tracking-[0.18em] text-black/25">style</p>
            <select
              value={prefs.style}
              onChange={(event) => setPrefs((prev) => ({ ...prev, style: event.target.value }))}
              className="font-naya-sans mt-2 w-full border-b border-black/10 bg-transparent py-2 text-[12px] lowercase text-black focus:border-black focus:outline-none"
            >
              <option value="casual">casual</option>
              <option value="minimal">minimal</option>
              <option value="vintage">vintage</option>
              <option value="streetwear">streetwear</option>
            </select>
          </div>
          <div>
            <p className="font-naya-sans text-[9px] uppercase tracking-[0.18em] text-black/25">alerts</p>
            <input
              type="email"
              value={prefs.alertEmail}
              onChange={(event) =>
                setPrefs((prev) => ({ ...prev, alertEmail: event.target.value }))
              }
              placeholder="your email"
              className="font-naya-sans mt-2 w-full border-b border-black/10 bg-transparent py-2 text-[12px] lowercase text-black placeholder:text-black/25 focus:border-black focus:outline-none"
            />
          </div>
        </section>

        <section className="mb-12">
          <p className="font-naya-sans mb-3 text-[10px] uppercase tracking-[0.2em] text-black/25">
            app notifications
          </p>
          <DealDiscoveryNotifications variant="profile" />
        </section>

        <div className="mb-6 text-center">
          <p className="font-naya-sans text-[10px] uppercase tracking-[0.2em] text-black/25">
            saved items
          </p>
        </div>

        {wishlist.length === 0 ? (
          <div className="font-naya-sans text-center text-sm text-black/30">
            no saved items yet — heart items while searching to save them here.
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
