import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';
import { authorizeCron } from '@/lib/agent/cronAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const PER_DELIVERY_CAP = 10;

interface MatchRow {
  id: number;
  user_id: string;
  listing_id: string;
  match_score: number;
  match_reason: string | null;
  listing_url: string;
  listing_title: string | null;
  image_url: string | null;
  price: number | null;
  source: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Job 3 — deliver_matches
// Batch un-delivered matches per user (cap ~10/window), dedupe against dismissed
// listings, hand the batch to the notification channel, then stamp delivered_at.
//
// Channel is pluggable and best-effort: if AGENT_DIGEST_WEBHOOK is set we POST
// the batch there (email/push handled downstream); otherwise we simply mark them
// delivered so the "For you" feed works with the user visiting manually first
// (email is explicitly the last thing to wire up per the build order).
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const db = getAgentDb();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const { data: rows, error } = await db
    .from('agent_match')
    .select('id, user_id, listing_id, match_score, match_reason, listing_url, listing_title, image_url, price, source')
    .is('delivered_at', null)
    .is('user_feedback', null)
    .order('match_score', { ascending: false })
    .limit(2000);

  if (error) {
    console.error('[cron/deliver] select:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  if (!rows?.length) return NextResponse.json({ ok: true, users: 0, delivered: 0 });

  const userIds = [...new Set((rows as MatchRow[]).map((r) => r.user_id))];

  // Skip anything the user already dismissed.
  const { data: dismissed } = await db
    .from('user_listing_interaction')
    .select('user_id, listing_id')
    .in('user_id', userIds)
    .eq('interaction_type', 'dismissed');
  const dismissedByUser = new Map<string, Set<string>>();
  for (const r of (dismissed as { user_id: string; listing_id: string }[]) ?? []) {
    const set = dismissedByUser.get(r.user_id) ?? new Set<string>();
    set.add(r.listing_id);
    dismissedByUser.set(r.user_id, set);
  }

  // Batch per user, capped and score-ordered.
  const byUser = new Map<string, MatchRow[]>();
  for (const row of rows as MatchRow[]) {
    if (dismissedByUser.get(row.user_id)?.has(row.listing_id)) continue;
    const list = byUser.get(row.user_id) ?? [];
    if (list.length < PER_DELIVERY_CAP) list.push(row);
    byUser.set(row.user_id, list);
  }

  const webhook = process.env.AGENT_DIGEST_WEBHOOK?.trim();
  let usersDelivered = 0;
  let matchesDelivered = 0;
  const now = new Date().toISOString();

  for (const [userId, matches] of byUser) {
    if (!matches.length) continue;

    if (webhook) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, matches }),
          signal: AbortSignal.timeout(10000),
        });
      } catch (err) {
        console.error(`[cron/deliver] webhook failed for ${userId}: ${(err as Error).message}`);
      }
    }

    const ids = matches.map((m) => m.id);
    const { error: upErr } = await db.from('agent_match').update({ delivered_at: now }).in('id', ids);
    if (upErr) {
      console.error('[cron/deliver] mark delivered:', upErr.message);
      continue;
    }
    usersDelivered += 1;
    matchesDelivered += matches.length;
  }

  return NextResponse.json({
    ok: true,
    users: usersDelivered,
    delivered: matchesDelivered,
    channel: webhook ? 'webhook' : 'feed_only',
  });
}
