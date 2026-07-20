import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId } from '@/lib/agent/userId';
import { getAgentDb } from '@/lib/agent/db';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import {
  getActiveSubscription,
  isRefundEligible,
  logFunnelEvent,
  type SubscriptionRow,
} from '@/lib/subscription';

export const dynamic = 'force-dynamic';

/**
 * POST /api/subscription/refund
 * Self-serve full refund within the 30-day pilot window. No approval step.
 */
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const sub = await getActiveSubscription(userId);
  if (!sub) return NextResponse.json({ error: 'no_active_subscription' }, { status: 404 });
  if (!isRefundEligible(sub)) {
    return NextResponse.json({ error: 'refund_window_closed' }, { status: 400 });
  }

  await logFunnelEvent('refund_requested', userId, { subscription_id: sub.id });

  if (!stripeConfigured()) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }
  const stripe = getStripe();
  const db = getAgentDb();
  if (!stripe || !db) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  try {
    if (sub.stripe_subscription_id) {
      // Cancel at period end is not enough — pilot promise is a full refund.
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      const latestInvoiceRef = stripeSub.latest_invoice;
      const latestInvoice =
        typeof latestInvoiceRef === 'string'
          ? await stripe.invoices.retrieve(latestInvoiceRef)
          : latestInvoiceRef;

      const paymentIntent =
        latestInvoice && typeof latestInvoice !== 'string'
          ? (latestInvoice as { payment_intent?: string | { id: string } | null }).payment_intent
          : null;
      const paymentIntentId =
        typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id || null;

      if (paymentIntentId) {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
      } else if (latestInvoice && typeof latestInvoice !== 'string' && latestInvoice.id) {
        await stripe.refunds.create({ invoice: latestInvoice.id });
      }

      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    }

    const now = new Date().toISOString();
    const { error } = await db
      .from('subscription')
      .update({
        status: 'refunded',
        refunded_at: now,
        canceled_at: now,
        updated_at: now,
      })
      .eq('id', sub.id);

    if (error) {
      console.error('[subscription/refund] db:', error.message);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: 'refunded' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'refund_failed';
    console.error('[subscription/refund]', message);
    return NextResponse.json({ error: 'refund_failed', message }, { status: 500 });
  }
}

/** GET helper shape for account UI — not used here but keeps types nearby. */
export type RefundResponse = { ok: true; status: 'refunded' } | { error: string };
export type { SubscriptionRow };
