import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BACKEND_URL = 'https://scraper-api-production-d197.up.railway.app';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')?.toLowerCase().trim();
  if (!query) {
    return NextResponse.json({ error: 'Provide ?query=' }, { status: 400 });
  }

  // 1) Try stored price data first (fast path)
  const stored = await getStoredPriceData(query);
  if (stored && stored.count >= 3) {
    return NextResponse.json({ ...stored, _source: 'stored' });
  }

  // 2) No stored data — do a live search
  const live = await doLiveSearch(query);
  if (!live || live.count === 0) {
    return NextResponse.json({
      query,
      medianPrice: null,
      count: 0,
      trend30d: null,
      priceRange: null,
      byPlatform: {},
      _source: 'none',
    });
  }

  return NextResponse.json({ ...live, _source: 'live' });
}

async function getStoredPriceData(query: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('price_observations')
      .select('price, source')
      .ilike('query', `%${query}%`)
      .gte('created_at', sevenDaysAgo)
      .gt('price', 0);

    if (error || !data || data.length === 0) return null;

    const prices = data.map((r: { price: number }) => r.price).sort((a: number, b: number) => a - b);
    const byPlatform = buildPlatformBreakdown(data);

    return {
      query,
      medianPrice: median(prices),
      count: prices.length,
      trend30d: null,
      priceRange: { min: prices[0], max: prices[prices.length - 1] },
      byPlatform,
    };
  } catch {
    return null;
  }
}

async function doLiveSearch(query: string) {
  const backendUrl = (process.env.SCRAPER_BACKEND_URL || BACKEND_URL).replace(/\/$/, '');
  const params = new URLSearchParams({ q: query, limit: '25', platform: 'all' });

  try {
    const res = await fetch(`${backendUrl}/search?${params}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) return null;
    const body = await res.json();

    const allItems: { price: number; source: string }[] = [];
    for (const [platform, items] of Object.entries(body.results || {})) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const p = typeof item.price === 'number' ? item.price : parseFloat(item.price);
        if (p > 0) {
          allItems.push({ price: p, source: platform });
        }
      }
    }

    if (allItems.length === 0) return null;

    const prices = allItems.map((i) => i.price).sort((a, b) => a - b);
    const byPlatform = buildPlatformBreakdown(allItems);

    return {
      query,
      medianPrice: median(prices),
      count: prices.length,
      trend30d: null,
      priceRange: { min: prices[0], max: prices[prices.length - 1] },
      byPlatform,
    };
  } catch {
    return null;
  }
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function buildPlatformBreakdown(items: { price: number; source: string }[]) {
  const groups: Record<string, number[]> = {};
  for (const item of items) {
    const src = item.source || 'unknown';
    if (!groups[src]) groups[src] = [];
    groups[src].push(item.price);
  }
  const result: Record<string, { median: number; count: number }> = {};
  for (const [src, prices] of Object.entries(groups)) {
    prices.sort((a, b) => a - b);
    result[src] = { median: median(prices), count: prices.length };
  }
  return result;
}
