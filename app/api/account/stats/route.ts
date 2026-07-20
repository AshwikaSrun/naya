import { NextRequest, NextResponse } from 'next/server';
import { getAgentDb } from '@/lib/agent/db';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/account/stats?secret=…
// Lightweight signup dashboard: total users, how many completed onboarding, and
// signups in the last 24h / 7d. Guarded by ANALYTICS_SECRET (query or header) so
// counts aren't public. Uses head:true count queries (no rows transferred).
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const secret = process.env.ANALYTICS_SECRET?.trim();
  if (secret) {
    const provided =
      req.nextUrl.searchParams.get('secret') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      '';
    if (provided !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const db = getAgentDb();
  if (!db) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [total, onboarded, last24h, last7d, savedSearches, matches] = await Promise.all([
    db.from('user_account').select('*', { count: 'exact', head: true }),
    db.from('user_taste_profile').select('*', { count: 'exact', head: true }).eq('onboarded', true),
    db.from('user_account').select('*', { count: 'exact', head: true }).gte('created_at', dayAgo),
    db.from('user_account').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    db.from('user_saved_search').select('*', { count: 'exact', head: true }).eq('is_active', true),
    db.from('agent_match').select('*', { count: 'exact', head: true }),
  ]);

  const totalUsers = total.count ?? 0;
  const onboardedUsers = onboarded.count ?? 0;

  return NextResponse.json({
    ok: true,
    total_users: totalUsers,
    onboarded_users: onboardedUsers,
    onboarding_rate: totalUsers ? Math.round((onboardedUsers / totalUsers) * 100) : 0,
    signups_last_24h: last24h.count ?? 0,
    signups_last_7d: last7d.count ?? 0,
    active_saved_searches: savedSearches.count ?? 0,
    total_matches: matches.count ?? 0,
  });
}
