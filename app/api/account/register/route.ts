import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { resolveUserId } from '@/lib/agent/userId';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/account/register
// Records a user account so we can count signups + tie them to onboarding and
// agent activity. Idempotent: first sight inserts (and logs a signup event),
// repeat calls just bump last_seen_at. Works for Clerk users and anon ids alike.
// Body: { email?, source? }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 401 });

  const db = getAgentDb();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  let email: string | null = null;
  let source = 'unknown';
  try {
    const body = await req.json();
    if (typeof body.email === 'string' && body.email.trim()) email = body.email.trim().slice(0, 200);
    if (typeof body.source === 'string' && body.source.trim()) source = body.source.trim().slice(0, 40);
  } catch {
    // no body / bad json — fine, defaults apply
  }

  const now = new Date().toISOString();

  const { data: existing } = await db
    .from('user_account')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await db.from('user_account').insert({
      user_id: userId,
      email,
      source,
      created_at: now,
      last_seen_at: now,
    });
    if (error) {
      // Unique-violation race → treat as returning user, not an error.
      if ((error as { code?: string }).code !== '23505') {
        console.error('[account/register] insert:', error.message);
        return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
      }
    } else {
      // Event-level log for funnel analytics (reuses existing auth_events table).
      await db
        .from('auth_events')
        .insert({ identifier: email || userId, source: `signup:${source}` })
        .then(({ error: e }) => {
          if (e) console.error('[account/register] auth_event:', e.message);
        });
      return NextResponse.json({ ok: true, created: true });
    }
  }

  // Returning user: refresh last_seen_at, backfill email if we now have one.
  const patch: Record<string, unknown> = { last_seen_at: now };
  if (email) patch.email = email;
  await db.from('user_account').update(patch).eq('user_id', userId);

  return NextResponse.json({ ok: true, created: false });
}
