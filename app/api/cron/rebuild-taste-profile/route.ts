import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { authorizeCron } from '@/lib/agent/cronAuth';
import type { TasteProfile } from '@/lib/agent/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const LOOKBACK_DAYS = 30;
const POSITIVE = new Set(['saved', 'purchased', 'clicked_through']);
const TOP_BRANDS = 8;
const TOP_CATEGORIES = 6;
const TOP_STYLES = 6;
// How much a fresh rollup pulls the profile toward newly observed behavior.
// < 1 keeps evolution gradual rather than swinging wildly (spec Part 3).
const BLEND = 0.5;

interface InteractionRow {
  user_id: string;
  interaction_type: string;
  brand: string | null;
  item_type: string | null;
  price: number | null;
  style_tags: string[] | null;
  era: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Job 2 — rebuild_taste_profile
// Roll up the last N days of positive interactions into user_taste_profile:
// count brand/category/style frequency, take top-K, and merge with the existing
// profile so taste evolves gradually instead of snapping to recent activity.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const db = getAgentDb();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await db
    .from('user_listing_interaction')
    .select('user_id, interaction_type, brand, item_type, price, style_tags, era')
    .gte('created_at', since)
    .in('interaction_type', [...POSITIVE])
    .limit(5000);

  if (error) {
    console.error('[cron/rebuild] select:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  if (!rows?.length) return NextResponse.json({ ok: true, users: 0 });

  // Bucket interactions per user.
  const byUser = new Map<string, InteractionRow[]>();
  for (const r of rows as InteractionRow[]) {
    const list = byUser.get(r.user_id) ?? [];
    list.push(r);
    byUser.set(r.user_id, list);
  }
  const userIds = [...byUser.keys()];

  const { data: existing } = await db
    .from('user_taste_profile')
    .select('*')
    .in('user_id', userIds);
  const existingMap = new Map<string, TasteProfile>();
  for (const p of (existing as TasteProfile[]) ?? []) existingMap.set(p.user_id, p);

  const updates: Record<string, unknown>[] = [];

  for (const [userId, interactions] of byUser) {
    const prior = existingMap.get(userId);

    const brandFreq = new Map<string, number>();
    const catFreq = new Map<string, number>();
    const styleFreq = new Map<string, number>();
    const eraFreq = new Map<string, number>();
    const prices: number[] = [];

    for (const it of interactions) {
      const w = it.interaction_type === 'purchased' ? 3 : it.interaction_type === 'saved' ? 2 : 1;
      if (it.brand) bump(brandFreq, it.brand.toLowerCase(), w);
      if (it.item_type) bump(catFreq, it.item_type.toLowerCase(), w);
      for (const t of it.style_tags ?? []) bump(styleFreq, t.toLowerCase(), w);
      if (it.era) bump(eraFreq, it.era.toLowerCase(), w);
      if (typeof it.price === 'number' && it.price > 0) prices.push(it.price);
    }

    // Merge: keep the existing preferences, then fold in newly frequent ones.
    // Requiring freq >= 2 for brand-new items keeps evolution gradual.
    const preferred_brands = mergeTopK(prior?.preferred_brands ?? [], brandFreq, TOP_BRANDS, 2);
    const preferred_categories = mergeTopK(prior?.preferred_categories ?? [], catFreq, TOP_CATEGORIES, 2);
    const style_tags = mergeTopK(prior?.style_tags ?? [], styleFreq, TOP_STYLES, 2);
    const era_preference = mergeTopK(prior?.era_preference ?? [], eraFreq, 4, 2);

    // Price ceiling: blend a high percentile of observed prices with prior.
    let price_ceiling = prior?.price_ceiling ?? null;
    if (prices.length >= 3) {
      const observed = percentile(prices, 0.9);
      price_ceiling =
        price_ceiling != null
          ? Math.round(price_ceiling * (1 - BLEND) + observed * BLEND)
          : Math.round(observed);
    }

    updates.push({
      user_id: userId,
      preferred_brands,
      preferred_categories,
      style_tags,
      era_preference,
      price_ceiling,
      updated_at: new Date().toISOString(),
    });
  }

  if (updates.length) {
    const { error: upErr } = await db
      .from('user_taste_profile')
      .upsert(updates, { onConflict: 'user_id' });
    if (upErr) console.error('[cron/rebuild] upsert:', upErr.message);
  }

  return NextResponse.json({ ok: true, users: updates.length });
}

function bump(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

/** Keep existing items, then append newly frequent ones (freq >= minFreq), cap K. */
function mergeTopK(existing: string[], freq: Map<string, number>, k: number, minFreq: number): string[] {
  const out = [...existing];
  const have = new Set(existing);
  const candidates = [...freq.entries()]
    .filter(([term, count]) => count >= minFreq && !have.has(term))
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term);
  for (const c of candidates) {
    if (out.length >= k) break;
    out.push(c);
  }
  return out.slice(0, k);
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}
