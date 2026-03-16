'use client';

import { useEffect, useState } from 'react';

interface PriceIndexData {
  medianPrice: number | null;
  count: number;
  trend30d: number | null;
  priceRange: { min: number; max: number } | null;
}

export default function PriceIndexBadge({ query }: { query: string }) {
  const [data, setData] = useState<PriceIndexData | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) return;

    const controller = new AbortController();
    fetch(`/api/insights/price-index?query=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.medianPrice !== null && d.count > 0) setData(d);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [query]);

  if (!data || data.medianPrice === null) return null;

  const trend = data.trend30d;
  const trendUp = trend !== null && trend > 0;
  const trendDown = trend !== null && trend < 0;

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-2 text-[12px] shadow-sm">
      <span className="text-black/40">price index</span>
      <span className="font-semibold text-black">${data.medianPrice.toFixed(0)}</span>
      {data.priceRange && (
        <span className="text-black/30">
          ${data.priceRange.min.toFixed(0)}–${data.priceRange.max.toFixed(0)}
        </span>
      )}
      {trend !== null && (
        <span className={`font-medium ${trendUp ? 'text-rose-500' : trendDown ? 'text-emerald-500' : 'text-black/40'}`}>
          {trendUp ? '+' : ''}{trend}%
          <span className="ml-0.5 text-[10px] text-black/30">30d</span>
        </span>
      )}
      <span className="text-black/20">{data.count} listings</span>
    </div>
  );
}
