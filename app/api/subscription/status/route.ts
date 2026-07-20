import { NextRequest, NextResponse } from 'next/server';
import { resolveUserId } from '@/lib/agent/userId';
import {
  daysLeftInRefundWindow,
  getActiveSubscription,
  isRefundEligible,
  PILOT_PRICE_CENTS,
  PILOT_PLAN,
} from '@/lib/subscription';
import { stripeConfigured } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * GET /api/subscription/status
 * Used by PaywallModal, UnlockStyleBanner, RefundEligibleBanner.
 */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({
      signedIn: false,
      active: false,
      stripeConfigured: stripeConfigured(),
      plan: PILOT_PLAN,
      priceCents: PILOT_PRICE_CENTS,
    });
  }

  const sub = await getActiveSubscription(userId);
  if (!sub) {
    return NextResponse.json({
      signedIn: true,
      active: false,
      stripeConfigured: stripeConfigured(),
      plan: PILOT_PLAN,
      priceCents: PILOT_PRICE_CENTS,
    });
  }

  return NextResponse.json({
    signedIn: true,
    active: true,
    stripeConfigured: stripeConfigured(),
    plan: sub.plan,
    priceCents: sub.price_cents,
    startedAt: sub.started_at,
    refundEligibleUntil: sub.refund_eligible_until,
    refundEligible: isRefundEligible(sub),
    daysLeft: daysLeftInRefundWindow(sub),
    status: sub.status,
  });
}
