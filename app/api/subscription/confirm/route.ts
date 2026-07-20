import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId } from '@/lib/agent/userId';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { getAgentDb } from '@/lib/agent/db';
import {
  PILOT_PLAN,
  PILOT_PRICE_CENTS,
  logFunnelEvent,
  refundEligibleUntilFrom,
} from '@/lib/subscription';

export const dynamic = 'force-dynamic';

/**
 * POST /api/subscription/confirm
 * After Checkout redirect, confirm the session and upsert the subscription row
 * (in case the webhook is delayed or not configured in local/dev).
 */
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  let sessionId = '';
  try {
    const body = await req.json();
    sessionId = String(body.sessionId || '');
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!sessionId) return NextResponse.json({ error: 'missing_session' }, { status: 400 });

  const stripe = getStripe();
  const db = getAgentDb();
  if (!stripe || !db) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ error: 'not_paid', status: session.status }, { status: 400 });
    }

    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
    const subId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id || null;

    const started = new Date();
    const until = refundEligibleUntilFrom(started).toISOString();

    if (subId) {
      const { data: existing } = await db
        .from('subscription')
        .select('id')
        .eq('stripe_subscription_id', subId)
        .maybeSingle();
      if (existing) {
        await db
          .from('subscription')
          .update({
            status: 'active',
            user_id: userId,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existing as { id: number }).id);
      } else {
        await db.from('subscription').insert({
          user_id: userId,
          status: 'active',
          plan: PILOT_PLAN,
          price_cents: PILOT_PRICE_CENTS,
          stripe_subscription_id: subId,
          stripe_customer_id: customerId,
          started_at: started.toISOString(),
          refund_eligible_until: until,
        });
      }
    }

    await logFunnelEvent('payment_completed', userId, {
      session_id: sessionId,
      source: 'confirm_endpoint',
    });

    return NextResponse.json({
      ok: true,
      refundEligibleUntil: until,
      redirect: '/onboarding',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'confirm_failed';
    console.error('[subscription/confirm]', message);
    return NextResponse.json({ error: 'confirm_failed', message }, { status: 500 });
  }
}
