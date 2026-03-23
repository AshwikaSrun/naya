'use client';

import { useState } from 'react';
import Link from 'next/link';

const LINKS = [
  { href: '/deals', label: 'deals' },
  { href: '/college', label: 'campus' },
  { href: '/editorial', label: 'editorial' },
  { href: '/brands', label: 'brands' },
  { href: '/app', label: 'concierge' },
  { href: '/profile', label: 'profile' },
];

export default function MobileNav({ color = 'dark' }: { color?: 'dark' | 'light' }) {
  const [open, setOpen] = useState(false);

  const iconColor = color === 'light' ? 'text-white/70' : 'text-black/50';
  const hoverBg = color === 'light' ? 'hover:bg-white/10' : 'hover:bg-black/5';

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${hoverBg}`}
        aria-label="Open menu"
      >
        <svg className={`h-5 w-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[200]" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <nav
            className="absolute right-0 top-0 flex h-full w-64 flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-6">
              <span className="font-naya-serif text-xl font-light lowercase tracking-[0.12em]">naya</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-1 px-4">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 font-naya-sans text-sm lowercase tracking-[0.08em] text-black/70 transition-colors hover:bg-black/[0.04] hover:text-black"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-auto border-t border-black/5 px-6 py-6">
              <p className="text-[10px] lowercase tracking-[0.12em] text-black/30">
                search second-hand, simplified
              </p>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
