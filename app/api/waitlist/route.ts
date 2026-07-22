import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { WAITLIST_COOKIE, isPurdueEmail } from '@/lib/access';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

async function persistToSupabase(email: string, source: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (!supabase) return false;

  const withSource = await supabase
    .from('waitlist_signups')
    .upsert({ email, source }, { onConflict: 'email' });

  if (!withSource.error) return true;

  console.warn('[WAITLIST] Upsert with source failed, trying insert:', withSource.error.message);

  const insertOnly = await supabase.from('waitlist_signups').insert({ email });
  if (!insertOnly.error) return true;
  if (insertOnly.error.code === '23505' || /duplicate|unique/i.test(insertOnly.error.message)) {
    return true;
  }

  const insertSource = await supabase.from('waitlist_signups').insert({ email, source });
  if (!insertSource.error) return true;
  if (insertSource.error.code === '23505' || /duplicate|unique/i.test(insertSource.error.message)) {
    return true;
  }

  console.error('[WAITLIST] Supabase write failed:', insertSource.error);
  return false;
}

async function persistToSheet(email: string, source: string): Promise<boolean> {
  const sheetWebhook = process.env.GOOGLE_SHEET_WEBHOOK?.trim();
  if (!sheetWebhook) return false;

  try {
    const res = await fetch(sheetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source }),
    });
    if (!res.ok) {
      console.error('[WAITLIST] Google Sheet write failed:', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (sheetErr) {
    console.error('[WAITLIST] Google Sheet write failed:', sheetErr);
    return false;
  }
}

/**
 * Waitlist signup: log email + set site-access cookie.
 * Unlocks onboarding. Trial search unlocks only after /api/onboarding/complete.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email ?? '').trim().toLowerCase();
    const source = String(body.source ?? 'signup').trim().slice(0, 80) || 'signup';

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    console.log(`[WAITLIST] New signup: ${email} (source: ${source}) at ${new Date().toISOString()}`);

    const [supabaseOk, sheetOk] = await Promise.all([
      persistToSupabase(email, source),
      persistToSheet(email, source),
    ]);

    if (!supabaseOk && !sheetOk) {
      console.error('[WAITLIST] No persistence backend succeeded (Supabase + Sheet).');
      return NextResponse.json(
        { error: 'Could not save your email. Please try again.' },
        { status: 500 },
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "you're on the list. let's set up your profile, then try a few searches.",
      access: true,
      purdue: isPurdueEmail(email),
      loggedTo: {
        supabase: supabaseOk,
        sheet: sheetOk,
      },
    });

    response.cookies.set(WAITLIST_COOKIE, email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
