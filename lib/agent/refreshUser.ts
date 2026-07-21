import type { SupabaseClient } from '@supabase/supabase-js';
import { runAggregation } from '@/lib/agent/aggregation';
import { scoreListing } from '@/lib/agent/scoring';
import { listingIdFromUrl } from '@/lib/agent/listingId';
import { parseSavedSearch } from '@/lib/agent/parseSavedSearch';
import type { SavedSearch, TasteProfile } from '@/lib/agent/types';

// ─────────────────────────────────────────────────────────────────────────────
// Run one user's active saved searches through aggregation + scoring and upsert
// their matches. Shared by the on-demand "run agent now" route (immediate feed
// after onboarding) and available to any per-user path. The nightly cron uses
// its own batched query for efficiency across all users.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BRAND_WATCHES = 5;

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

/**
 * Ensure each preferred brand has an active saved search. Onboarding used to
 * seed only brand[0], which made the feed look like "one brand, a few items".
 * Called on every refresh so existing users pick this up without re-onboarding.
 */
async function ensureBrandWatches(
  db: SupabaseClient,
  userId: string,
  profile: TasteProfile,
): Promise<void> {
  const brands = (profile.preferred_brands ?? [])
    .map((b) => b.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_BRAND_WATCHES);
  if (!brands.length) return;

  const { data: existing } = await db
    .from('user_saved_search')
    .select('query_text')
    .eq('user_id', userId)
    .eq('is_active', true);

  const existingText = ((existing as { query_text: string }[] | null) ?? []).map((r) =>
    (r.query_text || '').toLowerCase(),
  );

  for (const brand of brands) {
    const covered = existingText.some((t) => t.includes(brand));
    if (covered) continue;
    const parsed = parseSavedSearch(brand);
    const { error } = await db.from('user_saved_search').insert({
      user_id: userId,
      query_text: brand,
      parsed_filters: { ...parsed, brands: [brand] },
      is_active: true,
    });
    if (error) console.error('[agent/refreshUser] brand watch:', error.message);
    else existingText.push(brand);
  }
}

export async function refreshUserSavedSearches(
  db: SupabaseClient,
  userId: string,
  opts: { threshold?: number; maxSearches?: number; limitPerSearch?: number } = {},
): Promise<{ processed: number; matches: number }> {
  // 0.45 clears brand hits that used to die at 0.6 after style-tag dilution.
  const threshold = opts.threshold ?? 0.45;
  const maxSearches = opts.maxSearches ?? 8;
  const limitPerSearch = opts.limitPerSearch ?? 40;

  const { data: profileRow } = await db
    .from('user_taste_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  const profile = (profileRow as TasteProfile) ?? defaultProfile(userId);

  await ensureBrandWatches(db, userId, profile);

  const { data: searches } = await db
    .from('user_saved_search')
    .select('id, user_id, query_text, parsed_filters, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_run_at', { ascending: true, nullsFirst: true })
    .limit(maxSearches);

  const activeSearches = (searches as SavedSearch[]) ?? [];
  if (!activeSearches.length) return { processed: 0, matches: 0 };

  const { data: dismissed } = await db
    .from('user_listing_interaction')
    .select('listing_id')
    .eq('user_id', userId)
    .eq('interaction_type', 'dismissed');
  const dismissedSet = new Set((dismissed as { listing_id: string }[] | null)?.map((r) => r.listing_id) ?? []);

  const upserts: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  let matches = 0;

  // Fan out brand watches in parallel — sequential 5× scrapes routinely hit the
  // serverless timeout and left the feed stuck on one brand.
  const batches = await Promise.all(
    activeSearches.map(async (search) => {
      const query = search.parsed_filters?.marketplaceQuery || search.query_text;
      const listings = await runAggregation(query, limitPerSearch);
      return { search, listings };
    }),
  );

  for (const { search, listings } of batches) {
    for (const listing of listings) {
      const listingId = listingIdFromUrl(listing.url);
      if (dismissedSet.has(listingId) || seen.has(listingId)) continue;

      const result = scoreListing(listing, profile, activeSearches);
      if (result.score < threshold) continue;

      seen.add(listingId);
      matches += 1;
      upserts.push({
        user_id: userId,
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
      if (error) console.error('[agent/refreshUser] upsert:', error.message);
    }
  }

  return { processed: activeSearches.length, matches };
}
