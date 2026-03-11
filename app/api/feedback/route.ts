import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, message, email, page, userAgent } = body;

    if (!category) {
      return NextResponse.json({ error: 'Category is required.' }, { status: 400 });
    }

    const payload = {
      category,
      message: message || '',
      email: email || '',
      page: page || '',
      userAgent: userAgent || '',
      timestamp: new Date().toISOString(),
    };

    console.log(`[FEEDBACK] ${payload.category}: ${payload.message || '(no message)'} — ${payload.email || 'anon'} — ${payload.page}`);

    const webhook = (process.env.FEEDBACK_WEBHOOK || process.env.GOOGLE_SHEET_WEBHOOK || '').trim();
    if (webhook) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('[FEEDBACK] Webhook write failed:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
