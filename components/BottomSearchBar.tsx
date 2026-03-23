'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

interface BottomSearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
}

export default function BottomSearchBar({ onSearch, disabled }: BottomSearchBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSearch(input.trim());
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5 safe-bottom">
      <div className="w-full max-w-xl rounded-2xl border border-black/8 bg-white/95 p-3.5 shadow-[0_-4px_40px_rgba(0,0,0,0.08)] backdrop-blur-md">
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center rounded-full border border-black/8 bg-white px-4 py-2.5">
            <svg
              className="mr-3 h-4 w-4 shrink-0 text-black/25"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="search again..."
              disabled={disabled}
              className="font-naya-sans w-full bg-transparent text-sm font-light tracking-[0.02em] text-black placeholder:text-black/30 focus:outline-none"
            />
            <button
              type="submit"
              disabled={disabled || !input.trim()}
              aria-label="Search"
              className="ml-2 shrink-0 text-black/25 transition-opacity hover:text-black/50 disabled:opacity-20"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </form>
        <div className="font-naya-sans mt-2.5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => { if (input.trim()) onSearch(input.trim()); }}
            className="text-[10px] lowercase tracking-[0.12em] text-black/40 transition-colors hover:text-black"
          >
            shop
          </button>
          <span className="text-black/10">|</span>
          <Link
            href="/app"
            className="text-[10px] lowercase tracking-[0.12em] text-black/40 transition-colors hover:text-black"
          >
            concierge
          </Link>
          <span className="text-black/10">|</span>
          <button
            type="button"
            onClick={() => onSearch('trending vintage')}
            className="text-[10px] lowercase tracking-[0.12em] text-black/40 transition-colors hover:text-black"
          >
            trending
          </button>
        </div>
      </div>
    </div>
  );
}
