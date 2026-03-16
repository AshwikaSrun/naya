import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const brand = req.nextUrl.searchParams.get('brand')?.toLowerCase().trim();
  const itemType = req.nextUrl.searchParams.get('item')?.toLowerCase().trim();
  const query = req.nextUrl.searchParams.get('query')?.toLowerCase().trim();

  if (!brand && !query) {
    return NextResponse.json({ error: 'Provide ?brand= or ?query=' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ medianPrice: null, count: 0, trend30d: null, priceRange: null, byPlatform: {} });
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtySevenDaysAgo = new Date(now.getTime() - 37 * 24 * 60 * 60 * 1000);

    let recentQuery = supabase
      .from('price_observations')
      .select('price, original_price, source')
      .gte('created_at', sevenDaysAgo.toISOString())
      .gt('price', 0);

    let olderQuery = supabase
      .from('price_observations')
      .select('price')
      .gte('created_at', thirtySevenDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString())
      .gt('price', 0);

    if (brand) {
      recentQuery = recentQuery.eq('brand', brand);
      olderQuery = olderQuery.eq('brand', brand);
    }
    if (itemType) {
      recentQuery = recentQuery.eq('item_type', itemType);
      olderQuery = olderQuery.eq('item_type', itemType);
    }
    if (query && !brand) {
      recentQuery = recentQuery.ilike('query', `%${query}%`);
      olderQuery = olderQuery.ilike('query', `%${query}%`);
    }

    const [recentRes, olderRes] = await Promise.all([recentQuery, olderQuery]);

    if (recentRes.error) throw recentRes.error;
    if (olderRes.error) throw olderRes.error;

    const recentPrices = (recentRes.data || []).map((r) => r.price).sort((a: number, b: number) => a - b);
    const olderPrices = (olderRes.data || []).map((r) => r.price).sort((a: number, b: number) => a - b);

    if (recentPrices.length === 0) {
      return NextResponse.json({
        brand: brand || null,
        itemType: itemType || null,
        medianPrice: null,
        count: 0,
        trend30d: null,
        priceRange: null,
        byPlatform: {},
      });
    }

    const median = (arr: number[]) => {
      if (arr.length === 0) return null;
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
    };

    const currentMedian = median(recentPrices)!;
    const oldMedian = median(olderPrices);
    const trend30d = oldMedian && oldMedian > 0
      ? Math.round(((currentMedian - oldMedian) / oldMedian) * 100)
      : null;

    // Breakdown by platform
    const byPlatform: Record<string, { median: number; count: number }> = {};
    const platformGroups: Record<string, number[]> = {};
    for (const row of recentRes.data || []) {
      const src = row.source || 'unknown';
      if (!platformGroups[src]) platformGroups[src] = [];
      platformGroups[src].push(row.price);
    }
    for (const [src, prices] of Object.entries(platformGroups)) {
      prices.sort((a, b) => a - b);
      byPlatform[src] = { median: median(prices)!, count: prices.length };
    }

    return NextResponse.json({
      brand: brand || null,
      itemType: itemType || null,
      medianPrice: Math.round(currentMedian * 100) / 100,
      count: recentPrices.length,
      trend30d,
      priceRange: {
        min: recentPrices[0],
        max: recentPrices[recentPrices.length - 1],
      },
      byPlatform,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[price-index]', message);
    return NextResponse.json({ error: 'Failed to fetch price index' }, { status: 500 });
  }
}
