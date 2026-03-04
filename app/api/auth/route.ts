import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = (body.code ?? '').trim().toLowerCase();

    if (!code) {
      return NextResponse.json({ error: 'Invite code is required.' }, { status: 400 });
    }

    const validCodes = (process.env.INVITE_CODES ?? '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    if (validCodes.length === 0) {
      return NextResponse.json(
        { error: 'No invite codes configured.' },
        { status: 500 }
      );
    }

    if (!validCodes.includes(code)) {
      return NextResponse.json({ error: 'Invalid invite code.' }, { status: 401 });
    }

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
