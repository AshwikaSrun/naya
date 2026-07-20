import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId } from '@/lib/agent/userId';
import { logFunnelEvent, type FunnelEventType } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

const ALLOWED: FunnelEventType[] = [
  'popup_viewed',
  'value_screen_viewed',
  'pricing_screen_viewed',
  'payment_started',
  'payment_completed',
  'refund_requested',
  'onboarding_completed_after_paywall',
];

/**
 * POST /api/subscription/funnel
 * Client-side funnel event logger for paywall screens.
 */
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  let body: { eventType?: string; meta?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const eventType = body.eventType as FunnelEventType | undefined;
  if (!eventType || !ALLOWED.includes(eventType)) {
    return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
  }

  await logFunnelEvent(eventType, userId, body.meta || {});
  return NextResponse.json({ ok: true });
}
