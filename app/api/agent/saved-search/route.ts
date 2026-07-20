import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { resolveUserId } from '@/lib/agent/userId';
import { parseSavedSearch } from '@/lib/agent/parseSavedSearch';
import type { ParsedFilters } from '@/lib/agent/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 401 });
  const db = getAgentDb();
  if (!db) return NextResponse.json({ savedSearches: [] });

  const { data, error } = await db
    .from('user_saved_search')
    .select('id, query_text, parsed_filters, is_active, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[agent/saved-search] select:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  return NextResponse.json({ savedSearches: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 401 });

  const { hasPersonalizationAccess } = await import('@/lib/subscription');
  if (!(await hasPersonalizationAccess(userId))) {
    return NextResponse.json({ error: 'paywalled', paywalled: true }, { status: 402 });
  }

  const db = getAgentDb();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  let body: { query_text?: string; enrich?: Partial<ParsedFilters> } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const queryText = (body.query_text || '').trim();
  if (!queryText) return NextResponse.json({ error: 'missing_query' }, { status: 400 });
  if (queryText.length > 200) return NextResponse.json({ error: 'query_too_long' }, { status: 400 });

  const parsed = parseSavedSearch(queryText, body.enrich);

  const { data, error } = await db
    .from('user_saved_search')
    .insert({ user_id: userId, query_text: queryText, parsed_filters: parsed, is_active: true })
    .select('id, query_text, parsed_filters, is_active, created_at')
    .maybeSingle();

  if (error) {
    console.error('[agent/saved-search] insert:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, savedSearch: data });
}

export async function DELETE(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 401 });
  const db = getAgentDb();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const { error } = await db
    .from('user_saved_search')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[agent/saved-search] delete:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
