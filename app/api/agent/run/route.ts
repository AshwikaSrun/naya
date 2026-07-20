import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { resolveUserId } from '@/lib/agent/userId';
import { refreshUserSavedSearches } from '@/lib/agent/refreshUser';
import { hasPersonalizationAccess } from '@/lib/subscription';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// On-demand agent run for the current user. Gated behind personalization pilot.
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 401 });

  if (!(await hasPersonalizationAccess(userId))) {
    return NextResponse.json({ error: 'paywalled', paywalled: true }, { status: 402 });
  }

  const db = getAgentDb();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  try {
    const { processed, matches } = await refreshUserSavedSearches(db, userId);
    return NextResponse.json({ ok: true, processed, matches });
  } catch (err) {
    console.error('[agent/run] failed:', (err as Error).message);
    return NextResponse.json({ error: 'run_failed' }, { status: 500 });
  }
}
