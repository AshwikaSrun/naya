import type { SupabaseClient } from '@supabase/supabase-js';
import { inferVibesFromTitle } from '@/lib/agent/vibes';
import { extractBrand, extractCategory } from '@/lib/agent/parse';
import type { TasteProfile } from '@/lib/agent/types';

/**
 * Incrementally nudge a user's taste profile from a single save.
 * Runs inline on feedback so the profile updates without waiting for the cron.
 */

const MAX_BRANDS = 8;
const MAX_STYLES = 6;
const MAX_CATEGORIES = 6;

export interface SaveSignal {
  listing_title?: string | null;
  brand?: string | null;
  item_type?: string | null;
  price?: number | null;
  style_tags?: string[];
  era?: string | null;
}

function mergeUnique(existing: string[], incoming: string[], max: number): string[] {
  const out = [...existing];
  const have = new Set(existing.map((x) => x.toLowerCase()));
  for (const raw of incoming) {
    const v = raw.toLowerCase().trim();
    if (!v || have.has(v)) continue;
    out.push(v);
    have.add(v);
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}

export async function applySaveToTasteProfile(
  db: SupabaseClient,
  userId: string,
  signal: SaveSignal,
): Promise<TasteProfile | null> {
  const title = signal.listing_title || '';
  const brand =
    (signal.brand || extractBrand(title) || '').toLowerCase().trim() || null;
  const category =
    (signal.item_type || extractCategory(title) || '').toLowerCase().trim() || null;
  const vibes = [
    ...(signal.style_tags ?? []),
    ...inferVibesFromTitle(title),
  ].map((v) => v.toLowerCase().trim()).filter(Boolean);

  const { data: existing } = await db
    .from('user_taste_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const prior = (existing as TasteProfile | null) ?? {
    user_id: userId,
    preferred_brands: [],
    preferred_categories: [],
    size_profile: {},
    price_ceiling: null,
    style_tags: [],
    era_preference: [],
    onboarded: true,
  };

  const preferred_brands = brand
    ? mergeUnique(prior.preferred_brands ?? [], [brand], MAX_BRANDS)
    : prior.preferred_brands ?? [];
  const preferred_categories = category
    ? mergeUnique(prior.preferred_categories ?? [], [category], MAX_CATEGORIES)
    : prior.preferred_categories ?? [];
  const style_tags = mergeUnique(prior.style_tags ?? [], vibes, MAX_STYLES);
  const era_preference = signal.era
    ? mergeUnique(prior.era_preference ?? [], [signal.era.toLowerCase()], 4)
    : prior.era_preference ?? [];

  let price_ceiling = prior.price_ceiling ?? null;
  if (typeof signal.price === 'number' && signal.price > 0) {
    // Soft raise: if they save above ceiling, ease it up toward that price.
    if (price_ceiling == null) price_ceiling = Math.round(signal.price * 1.15);
    else if (signal.price > price_ceiling) {
      price_ceiling = Math.round(price_ceiling * 0.7 + signal.price * 1.1 * 0.3);
    }
  }

  const update = {
    user_id: userId,
    preferred_brands,
    preferred_categories,
    style_tags,
    era_preference,
    price_ceiling,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from('user_taste_profile')
    .upsert(update, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[agent/taste] applySave:', error.message);
    return null;
  }
  return data as TasteProfile;
}
