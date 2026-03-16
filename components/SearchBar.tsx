'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export interface SearchSuggestion {
  label: string;
  query: string;
}

const DEFAULT_SUGGESTIONS: SearchSuggestion[] = [
  { label: 'vintage carhartt flat lay', query: 'vintage carhartt jacket' },
  { label: 'y2k aesthetic', query: 'y2k zip hoodie' },
  { label: 'baggy denim minimal', query: 'baggy levi 550' },
  { label: 'nike vintage clean', query: 'vintage nike crewneck' },
];

interface SearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  showTabs?: boolean;
  suggestions?: SearchSuggestion[];
}

export default function SearchBar({
  onSearch,
  disabled,
  value,
  onValueChange,
  showTabs = false,
  suggestions = DEFAULT_SUGGESTIONS,
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
            placeholder="vintage carhartt flat lay, y2k aesthetic, baggy denim..."
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

      {showTabs && suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s.query}
              type="button"
              onClick={() => onSearch(s.query)}
              disabled={disabled}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[10px] lowercase tracking-[0.1em] text-white/70 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

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
