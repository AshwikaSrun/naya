import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { resolveUserId } from '@/lib/agent/userId';
import { getTrendingFeed } from '@/lib/agent/trending';
import { hasPersonalizationAccess } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

const FEED_LIMIT = 60;

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 401 });
  const db = getAgentDb();
  if (!db) return NextResponse.json({ matches: [], fallback: false, paywalled: false });

  const entitled = await hasPersonalizationAccess(userId);

  // Soft gate: without an active pilot, serve trending and flag paywalled.
  if (!entitled) {
    const { data: dismissedRows } = await db
      .from('user_listing_interaction')
      .select('listing_id')
      .eq('user_id', userId)
      .eq('interaction_type', 'dismissed');
    const dismissed = new Set(
      (dismissedRows as { listing_id: string }[] | null)?.map((r) => r.listing_id) ?? [],
    );
    const trending = await getTrendingFeed(db, dismissed, 24);
    return NextResponse.json({ matches: trending, fallback: true, paywalled: true });
  }

  const { data, error } = await db
    .from('agent_match')
    .select(
      'id, listing_id, saved_search_id, match_score, match_reason, listing_url, listing_title, brand, item_type, price, original_price, image_url, source, user_feedback',
    )
    .eq('user_id', userId)
    .or('user_feedback.is.null,user_feedback.eq.liked')
    .order('match_score', { ascending: false })
    .limit(FEED_LIMIT);

  if (error) {
    console.error('[agent/feed] select:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  if (data && data.length > 0) {
    return NextResponse.json({ matches: data, fallback: false, paywalled: false });
  }

  const { data: dismissedRows } = await db
    .from('user_listing_interaction')
    .select('listing_id')
    .eq('user_id', userId)
    .eq('interaction_type', 'dismissed');
  const dismissed = new Set(
    (dismissedRows as { listing_id: string }[] | null)?.map((r) => r.listing_id) ?? [],
  );

  const trending = await getTrendingFeed(db, dismissed, 24);
  return NextResponse.json({ matches: trending, fallback: true, paywalled: false });
}
