import type { NextRequest } from 'next/server';

/**
 * Shared authorization for agent cron routes. Matches the existing
 * app/api/cron/purdue-deals convention: a Bearer token or ?secret= that equals
 * CRON_SECRET. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 */
export function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get('secret') === secret) return true;
  return false;
}
