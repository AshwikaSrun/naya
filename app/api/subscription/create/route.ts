import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId } from '@/lib/agent/userId';
import { getStripe, stripeConfigured, appBaseUrl } from '@/lib/stripe';
import { PILOT_PLAN, PILOT_PRICE_CENTS, logFunnelEvent } from '@/lib/subscription';
import { getAgentDb } from '@/lib/agent/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/subscription/create
 * Opens Stripe Checkout for the $8.99/mo personalization pilot.
 * Subscription row is written on webhook (checkout.session.completed).
 */
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: 'stripe_not_configured', message: 'Stripe keys are not set on this environment.' },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_unavailable' }, { status: 503 });

  await logFunnelEvent('payment_started', userId, { plan: PILOT_PLAN });

  const db = getAgentDb();
  let customerId: string | undefined;
  if (db) {
    const { data: prior } = await db
      .from('subscription')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_customer_id', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    customerId = (prior as { stripe_customer_id: string | null } | null)?.stripe_customer_id || undefined;
  }

  const base = appBaseUrl();
  const priceId = process.env.STRIPE_PRICE_ID;

  const lineItems = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: 'usd',
            unit_amount: PILOT_PRICE_CENTS,
            recurring: { interval: 'month' as const },
            product_data: {
              name: 'Naya Personalization Pilot',
              description:
                'Personalized For you feed, saved-search matching, and taste-scored finds. Fully refundable within 30 days.',
            },
          },
          quantity: 1,
        },
      ];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      metadata: { user_id: userId, plan: PILOT_PLAN },
      subscription_data: {
        metadata: { user_id: userId, plan: PILOT_PLAN },
      },
      line_items: lineItems,
      success_url: `${base}/onboarding?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/for-you?paywall=1`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'checkout_failed';
    console.error('[subscription/create]', message);
    return NextResponse.json({ error: 'checkout_failed', message }, { status: 500 });
  }
}
