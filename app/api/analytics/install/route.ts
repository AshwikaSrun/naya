import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const platform = body.platform || 'pwa';
    const userAgent = request.headers.get('user-agent') || null;
    const referrer = request.headers.get('referer') || null;

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Analytics not configured.' }, { status: 503 });
    }

    const { error } = await supabase.from('app_installs').insert({
      platform,
      user_agent: userAgent,
      referrer,
    });

    if (error) {
      console.error('[install] insert failed:', error);
      return NextResponse.json({ error: 'Failed to log install.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
