import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, source, title, price } = body;

    if (!url) {
      return NextResponse.json({ error: 'url is required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Analytics not configured.' }, { status: 503 });
    }

    const { error } = await supabase.from('redirect_events').insert({
      destination_url: url,
      source: (source && String(source).trim()) || 'unknown',
      title: title || null,
      price: price != null ? parseFloat(price) : null,
    });

    if (error) {
      console.error('[click-through] insert failed:', error);
      return NextResponse.json({ error: 'Failed to log.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
