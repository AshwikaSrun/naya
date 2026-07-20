'use client';

import { useState } from 'react';
import Link from 'next/link';
import CommandSearchBar from './CommandSearchBar';
import Parallax from './Parallax';
import type { Product } from '@/lib/useNayaSearch';

type Props = {
  onSearch: (q: string) => void;
  searchValue: string;
  onSearchValueChange: (v: string) => void;
  trending?: Array<{ label: string; query: string }>;
  saved?: string[];
  recentlyViewed?: Product[];
  backgroundImage?: string;
};

type Mode = 'shop' | 'concierge' | 'image';

const MARKETPLACES = ['eBay', 'Grailed', 'Depop', 'Poshmark', 'and More'];

/**
 * Centered editorial hero — clean cream fold in the spirit of phia.com.
 * The conversational search bar is the single focal interaction; three modes
 * (shop / concierge / image) mirror how people actually look for vintage.
 */
export default function AgentHero({
  onSearch,
  searchValue,
  onSearchValueChange,
  trending = [],
  saved,
  recentlyViewed,
  backgroundImage = '/editorial/naya-hero.png',
}: Props) {
  const [mode, setMode] = useState<Mode>('shop');
  const topChips = trending.slice(0, 4);

  const placeholder =
    mode === 'concierge'
      ? 'ask naya anything, like "what should i wear to a fall wedding?"'
      : 'describe what you\u2019re looking for\u2026 "worn-in carhartt jacket under $80"';

  return (
    <section className="relative isolate w-full overflow-hidden bg-[#f7f4ee]">
      {/* soft warm glow to keep the fold from feeling flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[520px] w-[720px] -translate-x-1/2 rounded-full opacity-60 blur-[120px]"
        style={{ background: 'radial-gradient(closest-side, #efe7d8, transparent)' }}
      />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-6 pt-32 text-center md:pt-40">
        <div className="naya-enter naya-enter-1 mb-7 inline-flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/40 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-black" />
          </span>
          <p className="eyebrow text-black/40">
            live vintage index · updated hourly
          </p>
        </div>

        <h1 className="naya-enter naya-enter-2 font-naya-serif text-balance text-[clamp(3.25rem,9vw,7.5rem)] font-light leading-[0.95] tracking-[-0.04em] text-black">
          search smarter.{' '}
          <span className="italic font-light text-black/55">shop yours.</span>
        </h1>

        <p className="naya-enter naya-enter-3 font-naya-sans mt-8 max-w-xl text-[16px] leading-[1.6] text-black/55 md:text-lg">
          naya finds and learns what you actually want, across every resale site.
        </p>

        {/* Mode toggle */}
        <div className="naya-enter naya-enter-4 mt-9 flex flex-wrap items-center justify-center gap-2">
          {(
            [
              { id: 'shop', label: 'shop', icon: 'search' },
              { id: 'concierge', label: 'concierge', icon: 'chat' },
              { id: 'image', label: 'image search', icon: 'camera' },
            ] as Array<{ id: Mode; label: string; icon: string }>
          ).map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`font-naya-sans inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] lowercase tracking-[0.08em] transition-all duration-300 ${
                  active
                    ? 'bg-black text-white'
                    : 'border border-black/15 bg-transparent text-black/60 hover:border-black/35 hover:text-black'
                }`}
              >
                <ModeIcon name={m.icon} />
                {m.label}
                {m.id === 'image' && (
                  <span className={`ml-0.5 rounded-full px-1.5 py-px text-[8px] tracking-[0.12em] ${active ? 'bg-white/20 text-white/70' : 'bg-black/[0.06] text-black/45'}`}>
                    soon
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Prompt */}
        <div className="naya-enter naya-enter-4 mt-5 w-full max-w-2xl">
          {mode === 'image' ? (
            <div className="flex items-center justify-center gap-3 rounded-full border border-black/12 bg-white px-6 py-5">
              <ModeIcon name="camera" className="h-5 w-5 text-black/40" />
              <p className="font-naya-sans text-sm text-black/50">
                snap or upload a piece, naya finds it across the market. landing soon.
              </p>
            </div>
          ) : (
            <CommandSearchBar
              onSearch={(q) => (mode === 'concierge' ? gotoConcierge(q) : onSearch(q))}
              value={searchValue}
              onValueChange={onSearchValueChange}
              trending={trending}
              saved={saved}
              recentlyViewed={recentlyViewed}
              variant="light"
              placeholder={placeholder}
              className="!mx-auto !max-w-none"
            />
          )}
        </div>

        {topChips.length > 0 && (
          <div className="naya-enter naya-enter-5 mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="font-naya-sans self-center text-[10px] uppercase tracking-[0.24em] text-black/35">
              try
            </span>
            {topChips.map((t) => (
              <button
                key={t.query}
                type="button"
                onClick={() => onSearch(t.query)}
                className="font-naya-sans rounded-full border border-black/12 bg-white/70 px-3.5 py-1.5 text-[11px] lowercase tracking-[0.02em] text-black/65 transition-all duration-300 hover:-translate-y-0.5 hover:border-black/25 hover:text-black"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <Link
          href="/finds"
          className="group font-naya-sans mt-9 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-black/45 transition-colors hover:text-black"
        >
          browse live finds
          <span aria-hidden className="inline-block h-px w-8 bg-black/35 transition-all group-hover:w-14 group-hover:bg-black" />
        </Link>
      </div>

      {/* Hero centerpiece — framed editorial photo with a floating match card */}
      <div className="relative mx-auto mt-12 w-full max-w-2xl px-6 md:mt-16">
        <div className="relative overflow-hidden rounded-[24px] bg-black/5 shadow-[0_50px_130px_-45px_rgba(0,0,0,0.4)]">
          <div className="aspect-[4/5] w-full overflow-hidden">
            <Parallax speed={0.07} clamp={44} className="h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backgroundImage}
                alt="naya editorial"
                className="-mt-[7%] h-[114%] w-full object-cover object-[center_22%]"
              />
            </Parallax>
          </div>

          {/* Floating match card */}
          <div className="float-card absolute inset-x-0 bottom-6 z-20 mx-auto w-[min(88%,360px)] md:bottom-8">
            <Link
              href={'/?q=' + encodeURIComponent('90s leather bomber')}
              className="naya-lift block cursor-pointer"
            >
              <div className="flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/finds/float/thumbnail2.png" alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-naya-sans text-[10px] uppercase tracking-[0.16em] text-black/40">Depop</p>
                  <p className="font-naya-sans truncate text-[13px] font-medium text-black">90s leather bomber</p>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="font-naya-sans rounded-full bg-black px-2.5 py-1 text-[11px] font-medium text-white">
                    94% match
                  </span>
                  <p className="font-naya-sans mt-1 text-[10px] text-black/40">to your taste</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Trust / press strip */}
      <div className="naya-enter naya-enter-5 relative mt-20 border-t border-black/[0.06] py-8 md:mt-28">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-center sm:gap-10">
          <p className="font-naya-sans text-[9px] uppercase tracking-[0.28em] text-black/35">
            searching across
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-3">
            {MARKETPLACES.map((m) => (
              <span
                key={m}
                className="font-naya-serif text-lg font-light tracking-[0.02em] text-black/40 transition-colors hover:text-black/70"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function gotoConcierge(q: string) {
  if (typeof window === 'undefined') return;
  const url = q.trim() ? `/app?q=${encodeURIComponent(q.trim())}` : '/app';
  window.location.href = url;
}

function ModeIcon({ name, className = 'h-3.5 w-3.5' }: { name: string; className?: string }) {
  if (name === 'chat') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8m-8-4h5m-5 9.5L4 20V6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-1 1.5z" />
      </svg>
    );
  }
  if (name === 'camera') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h1.5l1-1.5h7l1 1.5H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <circle cx="12" cy="13" r="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
