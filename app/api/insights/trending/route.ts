import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const campus = req.nextUrl.searchParams.get('campus');
  const limitParam = parseInt(req.nextUrl.searchParams.get('limit') || '10', 10);
  const limit = Math.min(Math.max(limitParam, 1), 50);

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ campus: campus || 'global', period: '7d', trending: [] });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('search_events')
      .select('query, result_count')
      .gte('created_at', sevenDaysAgo);

    if (campus) {
      query = query.eq('campus_slug', campus);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate: count searches per query, sum total results
    const agg: Record<string, { count: number; totalResults: number }> = {};
    for (const row of data || []) {
      const q = row.query;
      if (!agg[q]) agg[q] = { count: 0, totalResults: 0 };
      agg[q].count += 1;
      agg[q].totalResults += row.result_count || 0;
    }

    const sorted = Object.entries(agg)
      .map(([q, stats]) => ({
        query: q,
        label: q,
        searchCount: stats.count,
        avgResults: stats.count > 0 ? Math.round(stats.totalResults / stats.count) : 0,
      }))
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, limit);

    return NextResponse.json({
      campus: campus || 'global',
      period: '7d',
      trending: sorted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[trending]', message);
    return NextResponse.json({ error: 'Failed to fetch trending' }, { status: 500 });
  }
}
