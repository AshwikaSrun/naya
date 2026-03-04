'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

interface SearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  showTabs?: boolean;
}

export default function SearchBar({
  onSearch,
  disabled,
  value,
  onValueChange,
  showTabs = false,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const input = value ?? internalValue;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSearch(input.trim());
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center rounded-full border border-white/20 bg-white/10 px-5 py-3 backdrop-blur-md md:py-3.5">
          <svg
            className="mr-3 h-4 w-4 shrink-0 text-white/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              const nextValue = e.target.value;
              if (onValueChange) {
                onValueChange(nextValue);
                return;
              }
              setInternalValue(nextValue);
            }}
            placeholder="search for vintage levi's, ralph lauren..."
            disabled={disabled}
            className="font-naya-sans w-full bg-transparent text-sm font-light tracking-[0.02em] text-white placeholder:text-white/35 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            aria-label="Search"
            className="ml-2 shrink-0 text-white/40 transition-opacity hover:text-white/70 disabled:opacity-20"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </form>

      {showTabs && (
        <div className="font-naya-sans mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => { if (input.trim()) onSearch(input.trim()); }}
            className="text-[10px] lowercase tracking-[0.12em] text-white/50 transition-colors hover:text-white"
          >
            shop
          </button>
          <span className="text-white/15">|</span>
          <Link
            href="/app"
            className="text-[10px] lowercase tracking-[0.12em] text-white/50 transition-colors hover:text-white"
          >
            concierge
          </Link>
          <span className="text-white/15">|</span>
          <button
            type="button"
            onClick={() => alert('Image Search coming soon!')}
            className="text-[10px] lowercase tracking-[0.12em] text-white/50 transition-colors hover:text-white"
          >
            image search
          </button>
        </div>
      )}
    </div>
  );
}
