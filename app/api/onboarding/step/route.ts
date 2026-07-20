import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { resolveUserId } from '@/lib/agent/userId';
import type { TasteProfile } from '@/lib/agent/types';

export const dynamic = 'force-dynamic';

function cleanStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(
    new Set(
      v.map((x) => String(x).toLowerCase().trim()).filter((s) => s.length > 0 && s.length < 60),
    ),
  ).slice(0, 40);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/step
// Autosave for a single onboarding screen. Upserts only the provided fields into
// user_taste_profile (does NOT flip `onboarded`), so a user can skip out at any
// point and keep whatever they answered. size_profile is merged key-by-key so
// each size category autosaves independently.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 401 });
  const db = getAgentDb();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if ('preferred_brands' in body) update.preferred_brands = cleanStrArray(body.preferred_brands);
  if ('preferred_categories' in body)
    update.preferred_categories = cleanStrArray(body.preferred_categories);
  if ('style_tags' in body) update.style_tags = cleanStrArray(body.style_tags);
  if ('era_preference' in body) update.era_preference = cleanStrArray(body.era_preference);

  if ('price_ceiling' in body) {
    const n = Number(body.price_ceiling);
    update.price_ceiling = Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }

  if ('size_profile' in body && body.size_profile && typeof body.size_profile === 'object') {
    // Merge with any previously saved sizes so per-field autosave accumulates.
    const { data: existing } = await db
      .from('user_taste_profile')
      .select('size_profile')
      .eq('user_id', userId)
      .maybeSingle();
    const merged: Record<string, string> = {
      ...(((existing as Pick<TasteProfile, 'size_profile'>)?.size_profile) ?? {}),
    };
    for (const [k, val] of Object.entries(body.size_profile as Record<string, unknown>)) {
      const key = String(k).toLowerCase().trim();
      const value = String(val ?? '').trim();
      if (!key) continue;
      if (value) merged[key] = value.slice(0, 20);
      else delete merged[key]; // empty value clears that size (e.g. "not sure")
    }
    update.size_profile = merged;
  }

  const { data, error } = await db
    .from('user_taste_profile')
    .upsert(update, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[onboarding/step] upsert:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, profile: data });
}
