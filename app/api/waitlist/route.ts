import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email ?? '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    console.log(`[WAITLIST] New signup: ${email} at ${new Date().toISOString()}`);

    const sheetWebhook = process.env.GOOGLE_SHEET_WEBHOOK?.trim();
    if (sheetWebhook) {
      try {
        await fetch(sheetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      } catch (sheetErr) {
        console.error('[WAITLIST] Google Sheet write failed:', sheetErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "you're on the list. we'll be in touch.",
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
