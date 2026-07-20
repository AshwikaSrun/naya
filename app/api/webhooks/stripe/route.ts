import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getAgentDb } from '@/lib/agent/db';
import {
  PILOT_PLAN,
  PILOT_PRICE_CENTS,
  logFunnelEvent,
  refundEligibleUntilFrom,
} from '@/lib/subscription';

export const dynamic = 'force-dynamic';

/**
 * Stripe webhook — confirms checkout and syncs subscription lifecycle.
 * Configure endpoint: /api/webhooks/stripe
 * Events: checkout.session.completed, customer.subscription.deleted, invoice.payment_failed
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'missing_signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid_signature';
    console.error('[stripe webhook] verify:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const db = getAgentDb();
  if (!db) return NextResponse.json({ received: true, db: false });

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId =
        session.client_reference_id ||
        session.metadata?.user_id ||
        null;
      if (!userId) {
        console.error('[stripe webhook] checkout missing user_id');
        return NextResponse.json({ received: true });
      }

      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
      const subId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id || null;

      const started = new Date();
      const until = refundEligibleUntilFrom(started).toISOString();

      // Prefer update by stripe_subscription_id; else insert.
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
              stripe_customer_id: customerId,
              user_id: userId,
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
      } else {
        await db.from('subscription').insert({
          user_id: userId,
          status: 'active',
          plan: PILOT_PLAN,
          price_cents: PILOT_PRICE_CENTS,
          stripe_customer_id: customerId,
          started_at: started.toISOString(),
          refund_eligible_until: until,
        });
      }

      await logFunnelEvent('payment_completed', userId, {
        session_id: session.id,
        stripe_subscription_id: subId,
      });
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      await db
        .from('subscription')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id)
        .eq('status', 'active');
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | { id: string } | null;
      };
      const subId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id || null;
      if (subId) {
        await db
          .from('subscription')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subId)
          .eq('status', 'active');
      }
    }
  } catch (err) {
    console.error('[stripe webhook] handler:', err);
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
