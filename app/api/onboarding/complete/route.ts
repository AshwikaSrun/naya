import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { resolveUserId } from '@/lib/agent/userId';
import { parseSavedSearch } from '@/lib/agent/parseSavedSearch';
import { refreshUserSavedSearches } from '@/lib/agent/refreshUser';
import type { ParsedFilters, TasteProfile } from '@/lib/agent/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Body {
  saved_search?: string;
  enrich?: Partial<ParsedFilters>;
}

/** Build a marketplace query from taste profile when the user skipped the hunt field. */
function seedQueryFromProfile(profile: TasteProfile | null): string | null {
  if (!profile) return null;
  const brand = profile.preferred_brands?.[0];
  const style = profile.style_tags?.[0];
  const category = profile.preferred_categories?.[0];
  const era = profile.era_preference?.[0];
  const parts = [brand, era, style, category].filter(Boolean) as string[];
  if (!parts.length) return null;
  // Prefer brand+category / brand+style so scrapers get a concrete listing query.
  return parts.slice(0, 3).join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/complete
// Marks the profile onboarded, optionally turns the final "anything specific?"
// answer into a user_saved_search (reusing the existing parse path), then runs
// the synchronous first-pass scoring so the feed shows real agent_match rows.
// Always returns redirect:/for-you on success — onboarding never blocks access
// once the profile write succeeds.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    console.error('[onboarding/complete] no_user');
    return NextResponse.json({ ok: false, error: 'no_user' }, { status: 401 });
  }

  const db = getAgentDb();
  if (!db) {
    console.error('[onboarding/complete] db_not_configured');
    return NextResponse.json(
      { ok: false, error: 'db_not_configured', configured: false, redirect: '/for-you' },
      { status: 503 },
    );
  }

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Mark onboarded (upsert so a straight-to-complete user still gets a row).
  const now = new Date().toISOString();
  const { error: upErr } = await db
    .from('user_taste_profile')
    .upsert(
      { user_id: userId, onboarded: true, onboarded_at: now, updated_at: now },
      { onConflict: 'user_id' },
    );
  if (upErr) {
    console.error('[onboarding/complete] upsert:', upErr.message);
    return NextResponse.json(
      { ok: false, error: 'db_error', detail: upErr.message, redirect: '/for-you' },
      { status: 500 },
    );
  }

  // Keep the account tracking row in sync (best-effort; never blocks).
  await db
    .from('user_account')
    .upsert(
      { user_id: userId, onboarded: true, last_seen_at: now },
      { onConflict: 'user_id' },
    )
    .then(({ error }) => {
      if (error) console.error('[onboarding/complete] account sync:', error.message);
    });

  const { data: profileRow } = await db
    .from('user_taste_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  const profile = profileRow as TasteProfile | null;

  // Optional final saved search — or seed one from brands/styles so the first
  // pass has something concrete to scrape. Matches only come from saved searches.
  let savedSearchCreated = false;
  let queryText = (body.saved_search || '').trim();
  if (!queryText) {
    const seeded = seedQueryFromProfile(profile);
    if (seeded) {
      queryText = seeded;
      console.info('[onboarding/complete] seeded hunt query from profile:', seeded);
    }
  }

  if (queryText && queryText.length <= 200) {
    const parsed = parseSavedSearch(queryText, body.enrich);
    const { error: ssErr } = await db.from('user_saved_search').insert({
      user_id: userId,
      query_text: queryText,
      parsed_filters: parsed,
      is_active: true,
    });
    if (ssErr) console.error('[onboarding/complete] saved_search:', ssErr.message);
    else savedSearchCreated = true;
  }

  let matches = 0;
  if (savedSearchCreated) {
    try {
      const res = await refreshUserSavedSearches(db, userId);
      matches = res.matches;
      console.info('[onboarding/complete] first-pass', {
        userId,
        processed: res.processed,
        matches: res.matches,
      });
    } catch (err) {
      console.error('[onboarding/complete] first-pass run:', (err as Error).message);
    }
  } else {
    console.info('[onboarding/complete] skipped first-pass (no saved search)', { userId });
  }

  return NextResponse.json({
    ok: true,
    redirect: '/for-you',
    savedSearchCreated,
    matches,
    configured: true,
  });
}
