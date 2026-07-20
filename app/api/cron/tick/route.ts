import { NextRequest, NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/agent/cronAuth';

export const dynamic = 'force-dynamic';
/** Combined tick may scrape + score; keep the Vercel ceiling. */
export const maxDuration = 300;

const JOBS = [
  { key: 'purdue_deals', path: '/api/cron/purdue-deals' },
  { key: 'refresh_saved_searches', path: '/api/cron/refresh-saved-searches' },
  { key: 'rebuild_taste_profile', path: '/api/cron/rebuild-taste-profile' },
  { key: 'deliver_matches', path: '/api/cron/deliver-matches' },
] as const;

function appOrigin(req: NextRequest): string {
  const fromEnv = process.env.VERCEL_URL?.trim();
  if (fromEnv) return `https://${fromEnv.replace(/^https?:\/\//, '')}`;
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (app) return app.replace(/\/$/, '');
  return req.nextUrl.origin;
}

/**
 * GET /api/cron/tick
 * Single Hobby-plan cron entry: runs all four job routes in sequence with the
 * same CRON_SECRET. Individual routes stay callable for manual / Pro setups.
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const secret = process.env.CRON_SECRET!.trim();
  const origin = appOrigin(req);
  const headers = { Authorization: `Bearer ${secret}` };

  const results: Record<string, { status: number; body: unknown }> = {};

  for (const job of JOBS) {
    try {
      const res = await fetch(`${origin}${job.path}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = { ok: false, error: 'non_json_response' };
      }
      results[job.key] = { status: res.status, body };
    } catch (err) {
      results[job.key] = {
        status: 500,
        body: { ok: false, error: err instanceof Error ? err.message : 'fetch_failed' },
      };
    }
  }

  const failed = Object.values(results).some((r) => r.status >= 400);
  return NextResponse.json({ ok: !failed, results }, { status: failed ? 207 : 200 });
}
