import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { getAgentDb } from '@/lib/agent/db';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/clerk
// Guaranteed server-side signup capture. Clerk sends a Svix-signed webhook on
// user.created / updated / deleted; we verify it (CLERK_WEBHOOK_SIGNING_SECRET)
// and keep user_account in sync. This is the source of truth for "how many
// users" — the client-side recorder is just a fast-path best-effort supplement.
//
// Setup: in the Clerk Dashboard → Webhooks, add an endpoint pointing to
// {SITE}/api/webhooks/clerk, subscribe to user.created/updated/deleted, and put
// the signing secret in CLERK_WEBHOOK_SIGNING_SECRET.
// ─────────────────────────────────────────────────────────────────────────────

interface ClerkUserData {
  id: string;
  email_addresses?: { id: string; email_address: string }[];
  primary_email_address_id?: string | null;
}

function primaryEmail(data: ClerkUserData): string | null {
  const list = data.email_addresses ?? [];
  const primary = list.find((e) => e.id === data.primary_email_address_id) ?? list[0];
  return primary?.email_address ?? null;
}

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error('[webhooks/clerk] verification failed:', (err as Error).message);
    return new NextResponse('invalid signature', { status: 400 });
  }

  const db = getAgentDb();
  if (!db) return NextResponse.json({ ok: true, stored: false });

  const now = new Date().toISOString();

  if (evt.type === 'user.created') {
    const data = evt.data as unknown as ClerkUserData;
    const email = primaryEmail(data);

    const { data: existing } = await db
      .from('user_account')
      .select('user_id')
      .eq('user_id', data.id)
      .maybeSingle();

    const { error } = await db.from('user_account').upsert(
      { user_id: data.id, email, source: 'clerk_webhook', last_seen_at: now },
      { onConflict: 'user_id' },
    );
    if (error) console.error('[webhooks/clerk] upsert:', error.message);

    // Only log a signup event the first time we see this user, so counts stay clean.
    if (!existing) {
      await db
        .from('auth_events')
        .insert({ identifier: email || data.id, source: 'signup:clerk_webhook' })
        .then(({ error: e }) => {
          if (e) console.error('[webhooks/clerk] auth_event:', e.message);
        });
    }
  } else if (evt.type === 'user.updated') {
    const data = evt.data as unknown as ClerkUserData;
    await db
      .from('user_account')
      .update({ email: primaryEmail(data), last_seen_at: now })
      .eq('user_id', data.id);
  } else if (evt.type === 'user.deleted') {
    const id = (evt.data as { id?: string }).id;
    if (id) await db.from('user_account').delete().eq('user_id', id);
  }

  return NextResponse.json({ ok: true });
}
