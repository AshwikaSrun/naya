import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { resolveUserId } from '@/lib/agent/userId';
import type { TasteProfile } from '@/lib/agent/types';

export const dynamic = 'force-dynamic';

const EMPTY_PROFILE = (userId: string): TasteProfile => ({
  user_id: userId,
  preferred_brands: [],
  preferred_categories: [],
  size_profile: {},
  price_ceiling: null,
  style_tags: [],
  era_preference: [],
  onboarded: false,
});

function cleanStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(
    new Set(
      v
        .map((x) => String(x).toLowerCase().trim())
        .filter((s) => s.length > 0 && s.length < 60),
    ),
  ).slice(0, 40);
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 401 });

  const db = getAgentDb();
  if (!db) return NextResponse.json({ profile: EMPTY_PROFILE(userId), configured: false });

  const { data, error } = await db
    .from('user_taste_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[agent/profile] select:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  return NextResponse.json({ profile: data ?? EMPTY_PROFILE(userId), configured: true });
}

export async function PUT(req: NextRequest) {
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

  // Only accept known fields; ignore anything else the client sends.
  const update: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    onboarded: true,
  };
  if ('preferred_brands' in body) update.preferred_brands = cleanStrArray(body.preferred_brands);
  if ('preferred_categories' in body)
    update.preferred_categories = cleanStrArray(body.preferred_categories);
  if ('style_tags' in body) update.style_tags = cleanStrArray(body.style_tags);
  if ('era_preference' in body) update.era_preference = cleanStrArray(body.era_preference);
  if ('size_profile' in body && body.size_profile && typeof body.size_profile === 'object') {
    const sp: Record<string, string> = {};
    for (const [k, val] of Object.entries(body.size_profile as Record<string, unknown>)) {
      const key = String(k).toLowerCase().trim();
      const value = String(val).trim();
      if (key && value) sp[key] = value.slice(0, 20);
    }
    update.size_profile = sp;
  }
  if ('price_ceiling' in body) {
    const n = Number(body.price_ceiling);
    update.price_ceiling = Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }

  const { data, error } = await db
    .from('user_taste_profile')
    .upsert(update, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[agent/profile] upsert:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, profile: data });
}
