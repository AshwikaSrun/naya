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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/complete
// Marks the profile onboarded, optionally turns the final "anything specific?"
// answer into a user_saved_search (reusing the existing parse path), then runs
// the synchronous first-pass scoring (the same /api/agent/run logic) so the feed
// shows real agent_match rows immediately when there's enough signal. Always
// returns redirect:/for-you — onboarding never blocks app access.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 401 });
  const db = getAgentDb();
  if (!db) return NextResponse.json({ ok: true, redirect: '/for-you', configured: false });

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
  if (upErr) console.error('[onboarding/complete] upsert:', upErr.message);

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

  // Optional final saved search.
  let savedSearchCreated = false;
  const queryText = (body.saved_search || '').trim();
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

  // Enough signal to score a first pass? refreshUserSavedSearches only produces
  // matches when there are active saved searches to aggregate; run it if so.
  let matches = 0;
  const { data: profileRow } = await db
    .from('user_taste_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  const profile = profileRow as TasteProfile | null;
  const hasProfileSignal =
    !!profile &&
    ((profile.preferred_brands?.length ?? 0) > 0 ||
      (profile.preferred_categories?.length ?? 0) > 0 ||
      (profile.style_tags?.length ?? 0) > 0);

  if (savedSearchCreated || hasProfileSignal) {
    try {
      const res = await refreshUserSavedSearches(db, userId);
      matches = res.matches;
    } catch (err) {
      console.error('[onboarding/complete] first-pass run:', (err as Error).message);
    }
  }

  return NextResponse.json({ ok: true, redirect: '/for-you', savedSearchCreated, matches });
}
