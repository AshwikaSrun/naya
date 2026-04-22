'use client';

import Link from 'next/link';
import CommandSearchBar from '@/components/CommandSearchBar';
import type { Product } from '@/lib/useNayaSearch';

interface BottomSearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
  trending?: Array<{ label: string; query: string }>;
  saved?: string[];
  recentlyViewed?: Product[];
}

export default function BottomSearchBar({
  onSearch,
  disabled,
  trending,
  saved,
  recentlyViewed,
}: BottomSearchBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5 safe-bottom">
      <div className="w-full max-w-xl rounded-2xl border border-black/8 bg-white/95 p-3.5 shadow-[0_-4px_40px_rgba(0,0,0,0.08)] backdrop-blur-md">
        <CommandSearchBar
          onSearch={onSearch}
          disabled={disabled}
          variant="light"
          trending={trending}
          saved={saved}
          recentlyViewed={recentlyViewed}
        />
        <div className="font-naya-sans mt-2.5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => onSearch('vintage finds')}
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
