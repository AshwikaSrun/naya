import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const endpoint = (body.endpoint as string)?.trim();
    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
    }

    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    if (error) {
      console.error('[push/unsubscribe]', error);
      return NextResponse.json({ error: 'Could not remove subscription.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
}
