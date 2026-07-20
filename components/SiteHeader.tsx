'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import MobileNav from './MobileNav';
import NayaAuth from './auth/NayaAuth';

type NavLink = { href: string; label: string; hidden?: boolean };

const DEFAULT_LINKS: NavLink[] = [
  { href: '/finds', label: 'shop' },
  { href: '/app', label: 'concierge' },
  { href: '/editorial', label: 'newsletter' },
  // Kept but hidden for now (re-enable by flipping hidden).
  { href: '/pricing', label: 'pricing', hidden: true },
];

/**
 * Lightweight sticky header for marketing sub-pages (pricing, newsletter,
 * guides). No command search — just wordmark + beta, nav, and auth. Transparent
 * over a dark hero, flips solid on scroll.
 */
export default function SiteHeader({
  navLinks = DEFAULT_LINKS,
  overHero = false,
  active,
}: {
  navLinks?: NavLink[];
  overHero?: boolean;
  active?: string;
}) {
  const [solid, setSolid] = useState(!overHero);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const handle = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        setSolid(!overHero || y > 80);
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
  const mutedText = solid ? 'text-black/60' : 'text-white/75';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div
        className={`transition-colors duration-300 ${
          solid ? 'border-b border-black/5 bg-white/92 backdrop-blur-md' : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 md:gap-6 md:px-10 md:py-3.5">
          <Link href="/" className={`flex shrink-0 items-center gap-2 ${textColor}`}>
            <span className="font-naya-serif text-2xl font-light lowercase tracking-[0.15em] md:text-3xl">naya</span>
            <span
              className={`font-naya-sans translate-y-[-0.35em] rounded-full px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] ${
                solid ? 'bg-black/[0.06] text-black/55' : 'bg-white/15 text-white/75'
              }`}
            >
              beta
            </span>
          </Link>

          <nav className={`font-naya-sans hidden items-center gap-6 text-[11px] lowercase tracking-[0.15em] md:flex ${mutedText}`}>
            {navLinks.filter((l) => !l.hidden).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`transition-colors ${
                  active === l.href
                    ? solid
                      ? 'text-black'
                      : 'text-white'
                    : solid
                      ? 'hover:text-black'
                      : 'hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <NayaAuth tone={solid ? 'dark' : 'light'} />
            </div>
            <MobileNav color={solid ? 'dark' : 'light'} />
          </div>
        </div>
      </div>
    </header>
  );
}
