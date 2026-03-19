import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function countRows(
  supabase: ReturnType<typeof getSupabase>,
  table: string,
  since?: string,
) {
  if (!supabase) return 0;
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  if (since) q = q.gte('created_at', since);
  const { count } = await q;
  return count ?? 0;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Analytics not configured.' }, { status: 503 });
  }

  const range = request.nextUrl.searchParams.get('range') || '30d';
  let since: string | undefined;
  if (range === '24h') since = daysAgo(1);
  else if (range === '7d') since = daysAgo(7);
  else if (range === '30d') since = daysAgo(30);

  try {
    const [installs, searches, clickThroughs] = await Promise.all([
      countRows(supabase, 'app_installs', since),
      countRows(supabase, 'search_events', since),
      countRows(supabase, 'redirect_events', since),
    ]);

    // Top searched queries
    let topQueriesQuery = supabase
      .from('search_events')
      .select('query');
    if (since) topQueriesQuery = topQueriesQuery.gte('created_at', since);
    const { data: queryRows } = await topQueriesQuery.order('created_at', { ascending: false }).limit(500);

    const queryCounts: Record<string, number> = {};
    for (const row of queryRows || []) {
      const q = (row.query || '').toLowerCase().trim();
      if (q) queryCounts[q] = (queryCounts[q] || 0) + 1;
    }
    const topQueries = Object.entries(queryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Click-through breakdown by source
    let sourceQuery = supabase
      .from('redirect_events')
      .select('source');
    if (since) sourceQuery = sourceQuery.gte('created_at', since);
    const { data: sourceRows } = await sourceQuery.limit(2000);

    const sourceCounts: Record<string, number> = {};
    for (const row of sourceRows || []) {
      const s = (row.source || 'unknown').toLowerCase();
      sourceCounts[s] = (sourceCounts[s] || 0) + 1;
    }
    const clicksBySource = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count }));

    // Conversion rate: clicks / searches
    const conversionRate = searches > 0
      ? Math.round((clickThroughs / searches) * 10000) / 100
      : 0;

    return NextResponse.json({
      range,
      installs,
      searches,
      clickThroughs,
      conversionRate,
      topQueries,
      clicksBySource,
    });
  } catch (err) {
    console.error('[analytics] query error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics.' }, { status: 500 });
  }
}
