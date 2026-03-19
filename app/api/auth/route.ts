import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const PURDUE_EMAIL_SUFFIX = '@purdue.edu';

function isPurdueEmail(value: string): boolean {
  return value.toLowerCase().endsWith(PURDUE_EMAIL_SUFFIX) && value.includes('@');
}

async function logAuthEvent(identifier: string, source: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from('auth_events').insert({ identifier, source }).then(({ error }) => {
    if (error) console.error('[AUTH] log failed:', error);
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = (body.code ?? '').trim().toLowerCase();

    if (!code) {
      return NextResponse.json({ error: 'Invite code is required.' }, { status: 400 });
    }

    // Purdue students: @purdue.edu emails get free access
    if (isPurdueEmail(code)) {
      await logAuthEvent(code, 'purdue');
      const response = NextResponse.json({ success: true });
      response.cookies.set('naya-token', `purdue:${code}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
      return response;
    }

    const validCodes = (process.env.INVITE_CODES ?? '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    if (!validCodes.includes(code)) {
      return NextResponse.json({ error: 'Invalid invite code.' }, { status: 401 });
    }

    await logAuthEvent(code, 'invite_code');
    const response = NextResponse.json({ success: true });
    response.cookies.set('naya-token', code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}
