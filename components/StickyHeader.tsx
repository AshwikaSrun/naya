'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import MobileNav from './MobileNav';
import CommandSearchBar from './CommandSearchBar';
import type { Product } from '@/lib/useNayaSearch';

type NavLink = { href: string; label: string };

type Props = {
  navLinks: NavLink[];
  cartCount: number;
  onCartClick: () => void;
  onSearch: (q: string) => void;
  searchValue: string;
  onSearchValueChange: (v: string) => void;
  trending?: Array<{ label: string; query: string }>;
  saved?: string[];
  recentlyViewed?: Product[];
  /** Right-side slot for e.g. campus dropdown. */
  rightSlot?: ReactNode;
  /** Start transparent over a dark hero. Defaults to true. */
  overHero?: boolean;
  /** Homepage link — defaults to "/". */
  homeHref?: string;
};

/**
 * Sticky top bar. Translucent over the hero, flips to a solid white bar once
 * the user scrolls past it, and hides on scroll-down / reveals on scroll-up.
 * Inline compact search bar fades in once the bar is solid.
 */
export default function StickyHeader({
  navLinks,
  cartCount,
  onCartClick,
  onSearch,
  searchValue,
  onSearchValueChange,
  trending,
  saved,
  recentlyViewed,
  rightSlot,
  overHero = true,
  homeHref = '/',
}: Props) {
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(!overHero);
  const lastY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const handle = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const past = y > 120;
        setSolid(!overHero || past);

        const delta = y - lastY.current;
        if (y > 240 && delta > 4) setHidden(true);
        else if (delta < -4 || y < 120) setHidden(false);
        lastY.current = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', handle, { passive: true });
    handle();
    return () => window.removeEventListener('scroll', handle);
  }, [overHero]);

  const textColor = solid ? 'text-black' : 'text-white';
  const mutedText = solid ? 'text-black/60' : 'text-white/70';
  const iconBtnHover = solid ? 'hover:bg-black/5' : 'hover:bg-white/10';
  const iconStroke = solid ? 'text-black/70' : 'text-white/80';
  const borderClass = solid ? 'border-b border-black/5' : 'border-b border-transparent';
  const bgClass = solid ? 'bg-white/92 backdrop-blur-md' : 'bg-transparent';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
    >
      <div className={`transition-colors duration-300 ${bgClass} ${borderClass}`}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3 md:gap-6 md:px-10 md:py-3.5">
          {/* Logo */}
          <Link
            href={homeHref}
            className={`font-naya-serif shrink-0 text-2xl font-light lowercase tracking-[0.15em] transition-colors md:text-3xl ${textColor}`}
          >
            naya
          </Link>

          {/* Inline compact search — fades in once solid */}
          <div
            className={`hidden min-w-0 flex-1 justify-center transition-opacity duration-300 md:flex ${solid ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <div className="w-full max-w-md">
              <CommandSearchBar
                size="compact"
                variant="light"
                onSearch={onSearch}
                value={searchValue}
                onValueChange={onSearchValueChange}
                trending={trending}
                saved={saved}
                recentlyViewed={recentlyViewed}
                placeholder="search vintage finds…"
              />
            </div>
          </div>

          {/* Nav links */}
          <nav
            className={`font-naya-sans hidden items-center gap-5 text-[10px] lowercase tracking-[0.15em] transition-colors lg:flex ${mutedText}`}
          >
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`transition-colors ${solid ? 'hover:text-black' : 'hover:text-white'}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right slot (e.g. campus badge/dropdown) */}
          {rightSlot}

          {/* Cart */}
          <button
            type="button"
            onClick={onCartClick}
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${iconBtnHover}`}
            aria-label="Open cart"
          >
            <svg className={`h-5 w-5 ${iconStroke}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {cartCount > 0 && (
              <span
                className={`absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${solid ? 'bg-black text-white' : 'bg-white text-black'}`}
              >
                {cartCount}
              </span>
            )}
          </button>

          <MobileNav color={solid ? 'dark' : 'light'} />
        </div>
      </div>
    </header>
  );
}
