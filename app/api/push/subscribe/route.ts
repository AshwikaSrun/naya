import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type PushKeys = { p256dh: string; auth: string };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sub = body.subscription as { endpoint?: string; keys?: PushKeys } | undefined;
    const alertType = (body.alertType as string) || 'purdue_deals';

    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription payload.' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        alert_type: alertType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('[push/subscribe]', error);
      return NextResponse.json({ error: 'Could not save subscription.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
}
