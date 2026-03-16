'use client';

import { useEffect, useState } from 'react';
import { getCompareItems } from '@/lib/compare';
import ComparePanel from './ComparePanel';

interface CompareBarProps {
  onOpen?: () => void;
}

export default function CompareBar({ onOpen }: CompareBarProps) {
  const [items, setItems] = useState<ReturnType<typeof getCompareItems>>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    setItems(getCompareItems());
    const handler = () => setItems(getCompareItems());
    window.addEventListener('naya-compare-update', handler);
    return () => window.removeEventListener('naya-compare-update', handler);
  }, []);

  if (items.length === 0) return null;

  const handleClick = () => {
    setPanelOpen(true);
    onOpen?.();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-black shadow-lg transition-all hover:border-black/25 hover:shadow-xl"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        compare {items.length} item{items.length > 1 ? 's' : ''}
      </button>
      <ComparePanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
