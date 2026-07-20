import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { authorizeCron } from '@/lib/agent/cronAuth';
import { runAggregation } from '@/lib/agent/aggregation';
import { scoreListing } from '@/lib/agent/scoring';
import { listingIdFromUrl } from '@/lib/agent/listingId';
import type { SavedSearch, TasteProfile } from '@/lib/agent/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DEFAULT_THRESHOLD = 0.6;
// Keep a single invocation bounded — scraping is the slow part.
const MAX_SEARCHES_PER_RUN = 25;

function defaultProfile(userId: string): TasteProfile {
  return {
    user_id: userId,
    preferred_brands: [],
    preferred_categories: [],
    size_profile: {},
    price_ceiling: null,
    style_tags: [],
    era_preference: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Job 1 — refresh_saved_searches
// For each active saved search, re-run the aggregation query, score new results
// against the owner's taste profile, and upsert matches scoring above the
// threshold into agent_match. Runs on Naya's Playwright/aggregation cadence.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const db = getAgentDb();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const threshold = clampThreshold(req.nextUrl.searchParams.get('threshold'));

  const { data: searches, error: searchErr } = await db
    .from('user_saved_search')
    .select('id, user_id, query_text, parsed_filters, is_active')
    .eq('is_active', true)
    .order('last_run_at', { ascending: true, nullsFirst: true })
    .limit(MAX_SEARCHES_PER_RUN);

  if (searchErr) {
    console.error('[cron/refresh] searches:', searchErr.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  if (!searches?.length) return NextResponse.json({ ok: true, processed: 0, matches: 0 });

  // Group active searches by user (used both to iterate and as scoring context).
  const byUser = new Map<string, SavedSearch[]>();
  for (const s of searches as SavedSearch[]) {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }
  const userIds = [...byUser.keys()];

  // Load profiles for the users involved.
  const { data: profiles } = await db
    .from('user_taste_profile')
    .select('*')
    .in('user_id', userIds);
  const profileMap = new Map<string, TasteProfile>();
  for (const p of (profiles as TasteProfile[]) ?? []) profileMap.set(p.user_id, p);

  // Load each user's full active-search set for richer scoring context.
  const { data: allActive } = await db
    .from('user_saved_search')
    .select('id, user_id, query_text, parsed_filters, is_active')
    .in('user_id', userIds)
    .eq('is_active', true);
  const activeByUser = new Map<string, SavedSearch[]>();
  for (const s of (allActive as SavedSearch[]) ?? []) {
    const list = activeByUser.get(s.user_id) ?? [];
    list.push(s);
    activeByUser.set(s.user_id, list);
  }

  // Listings a user already dismissed — never resurface them.
  const { data: dismissed } = await db
    .from('user_listing_interaction')
    .select('user_id, listing_id')
    .in('user_id', userIds)
    .eq('interaction_type', 'dismissed');
  const dismissedByUser = new Map<string, Set<string>>();
  for (const row of (dismissed as { user_id: string; listing_id: string }[]) ?? []) {
    const set = dismissedByUser.get(row.user_id) ?? new Set<string>();
    set.add(row.listing_id);
    dismissedByUser.set(row.user_id, set);
  }

  let processed = 0;
  let matchCount = 0;
  const upserts: Record<string, unknown>[] = [];
  const seen = new Set<string>(); // user_id|listing_id within this run

  for (const search of searches as SavedSearch[]) {
    processed += 1;
    const profile = profileMap.get(search.user_id) ?? defaultProfile(search.user_id);
    const userSearches = activeByUser.get(search.user_id) ?? [search];
    const dismissedSet = dismissedByUser.get(search.user_id) ?? new Set<string>();

    const query = search.parsed_filters?.marketplaceQuery || search.query_text;
    const listings = await runAggregation(query, 30);

    for (const listing of listings) {
      const listingId = listingIdFromUrl(listing.url);
      if (dismissedSet.has(listingId)) continue;
      const dedupeKey = `${search.user_id}|${listingId}`;
      if (seen.has(dedupeKey)) continue;

      const result = scoreListing(listing, profile, userSearches);
      if (result.score < threshold) continue;

      seen.add(dedupeKey);
      matchCount += 1;
      // Note: omit user_feedback + delivered_at so upserts preserve prior state.
      upserts.push({
        user_id: search.user_id,
        listing_id: listingId,
        saved_search_id: search.id,
        match_score: result.score,
        match_reason: result.reason,
        listing_url: listing.url,
        listing_title: listing.title,
        brand: listing.brand ?? null,
        item_type: listing.item_type ?? null,
        price: listing.price,
        original_price: listing.originalPrice ?? null,
        image_url: listing.image ?? null,
        source: listing.source ?? null,
      });
    }

    await db.from('user_saved_search').update({ last_run_at: new Date().toISOString() }).eq('id', search.id);
  }

  if (upserts.length) {
    for (let i = 0; i < upserts.length; i += 100) {
      const chunk = upserts.slice(i, i + 100);
      const { error } = await db.from('agent_match').upsert(chunk, { onConflict: 'user_id,listing_id' });
      if (error) console.error('[cron/refresh] upsert:', error.message);
    }
  }

  return NextResponse.json({ ok: true, processed, matches: matchCount, threshold });
}

function clampThreshold(v: string | null): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1) return DEFAULT_THRESHOLD;
  return n;
}
