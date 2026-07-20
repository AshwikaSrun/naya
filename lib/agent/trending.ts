import type { SupabaseClient } from '@supabase/supabase-js';
import { listingIdFromUrl } from '@/lib/agent/listingId';

// ─────────────────────────────────────────────────────────────────────────────
// Generic "trending / popular across all users" feed, used by the For-you feed
// as a cold-start fallback until a user's profile produces real agent_match
// rows. Popularity is derived from existing analytics: how often a listing's
// query shows up in search_events, over recent price_observations inventory.
// Shaped to look like an AgentMatch so the feed UI can render it uniformly.
// ─────────────────────────────────────────────────────────────────────────────

export interface TrendingMatch {
  id: number;
  listing_id: string;
  match_score: number;
  match_reason: string | null;
  listing_url: string;
  listing_title: string | null;
  brand: string | null;
  item_type: string | null;
  price: number | null;
  original_price: number | null;
  image_url: string | null;
  source: string | null;
  user_feedback: null;
  trending: true;
}

interface ObsRow {
  id: number;
  query: string | null;
  item_title: string | null;
  brand: string | null;
  item_type: string | null;
  price: number | null;
  original_price: number | null;
  source: string | null;
  image_url: string | null;
  listing_url: string | null;
}

export async function getTrendingFeed(
  db: SupabaseClient,
  dismissed: Set<string>,
  limit = 24,
): Promise<TrendingMatch[]> {
  // Query popularity from recent searches.
  const { data: events } = await db
    .from('search_events')
    .select('query')
    .order('created_at', { ascending: false })
    .limit(3000);
  const queryPopularity = new Map<string, number>();
  for (const e of (events as { query: string | null }[]) ?? []) {
    const q = (e.query || '').toLowerCase().trim();
    if (q) queryPopularity.set(q, (queryPopularity.get(q) ?? 0) + 1);
  }

  // Recent inventory to rank.
  const { data: obs, error } = await db
    .from('price_observations')
    .select('id, query, item_title, brand, item_type, price, original_price, source, image_url, listing_url')
    .not('image_url', 'is', null)
    .not('listing_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1200);

  if (error || !obs?.length) return [];

  // Best (most popular) observation per unique listing.
  const best = new Map<string, { row: ObsRow; score: number }>();
  for (const row of obs as ObsRow[]) {
    if (!row.listing_url || row.price == null) continue;
    const listingId = listingIdFromUrl(row.listing_url);
    if (dismissed.has(listingId)) continue;
    const q = (row.query || '').toLowerCase().trim();
    const score = (queryPopularity.get(q) ?? 0) + 1; // +1 so recency alone still ranks
    const prev = best.get(listingId);
    if (!prev || score > prev.score) best.set(listingId, { row, score });
  }

  const ranked = [...best.entries()]
    .map(([listingId, { row, score }]) => ({ listingId, row, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const maxScore = ranked.length ? ranked[0].score : 1;

  return ranked.map(({ listingId, row, score }) => ({
    id: row.id,
    listing_id: listingId,
    // Map popularity into a soft 0.55–0.9 band so the card reads sensibly.
    match_score: 0.55 + 0.35 * (score / maxScore),
    match_reason: row.brand ? `popular ${row.brand} on naya right now` : 'popular on naya right now',
    listing_url: row.listing_url as string,
    listing_title: row.item_title,
    brand: row.brand,
    item_type: row.item_type,
    price: row.price,
    original_price: row.original_price,
    image_url: row.image_url,
    source: row.source,
    user_feedback: null,
    trending: true as const,
  }));
}
