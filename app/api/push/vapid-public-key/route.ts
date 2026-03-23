import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Public key only — safe for the browser (PushManager.subscribe). */
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: 'Push is not configured.' }, { status: 503 });
  }
  return NextResponse.json({ publicKey: key });
}
