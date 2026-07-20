import type { NextRequest } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// Resolve the acting user id for an agent request.
//
// Identity model in this repo: Clerk when configured, otherwise a stable
// anonymous id the client persists in localStorage (see lib/agent/client.ts).
// We prefer the server-verified Clerk id; if Clerk isn't enabled we trust the
// client-supplied `x-naya-uid` header. RLS is disabled on the agent tables, so
// this is intentionally lightweight for the MVP — tighten before it holds PII.
// ─────────────────────────────────────────────────────────────────────────────

const CLERK_ENABLED =
  !!process.env.CLERK_SECRET_KEY && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export async function resolveUserId(req: NextRequest): Promise<string | null> {
  if (CLERK_ENABLED) {
    try {
      const { auth } = await import('@clerk/nextjs/server');
      const { userId } = await auth();
      if (userId) return userId;
    } catch {
      // Fall through to the anonymous header below.
    }
  }
  const header = req.headers.get('x-naya-uid');
  if (header && header.trim()) return header.trim().slice(0, 80);

  const q = req.nextUrl.searchParams.get('uid');
  if (q && q.trim()) return q.trim().slice(0, 80);

  return null;
}
