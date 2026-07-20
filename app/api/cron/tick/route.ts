import { NextRequest, NextResponse } from 'next/server';
import { authorizeCron } from '@/lib/agent/cronAuth';

export const dynamic = 'force-dynamic';
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
 * Hobby plan: one cron slot. Each invocation runs exactly ONE job (rotated),
 * so a tick stays as fast as the individual routes — never all four in a row.
 *
 * ?job=purdue_deals|refresh_saved_searches|rebuild_taste_profile|deliver_matches
 * forces a specific job (for manual runs).
 */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const forced = req.nextUrl.searchParams.get('job');
  const forcedJob = JOBS.find((j) => j.key === forced);
  const slot = Math.floor(Date.now() / (6 * 60 * 60 * 1000)) % JOBS.length;
  const job = forcedJob ?? JOBS[slot];

  const secret = process.env.CRON_SECRET!.trim();
  const origin = appOrigin(req);

  try {
    const res = await fetch(`${origin}${job.path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = { ok: false, error: 'non_json_response' };
    }
    return NextResponse.json(
      { ok: res.ok, ran: job.key, status: res.status, body },
      { status: res.ok ? 200 : 502 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        ran: job.key,
        error: err instanceof Error ? err.message : 'fetch_failed',
      },
      { status: 500 },
    );
  }
}
