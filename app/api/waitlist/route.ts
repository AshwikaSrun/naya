import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email ?? '').trim().toLowerCase();
    const source = (body.source ?? 'signup').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    console.log(`[EMAIL] New signup: ${email} (source: ${source}) at ${new Date().toISOString()}`);

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from('waitlist_signups')
        .upsert({ email, source }, { onConflict: 'email' });
      if (error) console.error('[EMAIL] Supabase upsert failed:', error);
    }

    const sheetWebhook = process.env.GOOGLE_SHEET_WEBHOOK?.trim();
    if (sheetWebhook) {
      try {
        await fetch(sheetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source }),
        });
      } catch (sheetErr) {
        console.error('[EMAIL] Google Sheet write failed:', sheetErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "you're in. welcome to naya.",
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
