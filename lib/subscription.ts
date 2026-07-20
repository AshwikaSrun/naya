import type { SupabaseClient } from '@supabase/supabase-js';
import { getAgentDb } from '@/lib/agent/db';

export const PILOT_PRICE_CENTS = 899;
export const PILOT_PLAN = 'personalization_pilot_monthly';
export const PILOT_REFUND_DAYS = 30;

export type SubscriptionStatus = 'active' | 'refunded' | 'canceled' | 'expired';

export type FunnelEventType =
  | 'popup_viewed'
  | 'value_screen_viewed'
  | 'pricing_screen_viewed'
  | 'payment_started'
  | 'payment_completed'
  | 'refund_requested'
  | 'onboarding_completed_after_paywall';

export type SubscriptionRow = {
  id: number;
  user_id: string;
  status: SubscriptionStatus;
  plan: string;
  price_cents: number;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  started_at: string;
  refund_eligible_until: string;
  refunded_at: string | null;
  canceled_at: string | null;
};

export function refundEligibleUntilFrom(start: Date = new Date()): Date {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + PILOT_REFUND_DAYS);
  return d;
}

/** Active personalization access: status=active and not past a canceled/expired state. */
export async function getActiveSubscription(
  userId: string,
  db: SupabaseClient | null = getAgentDb(),
): Promise<SubscriptionRow | null> {
  if (!db) return null;
  const { data, error } = await db
    .from('subscription')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[subscription] getActive:', error.message);
    return null;
  }
  return (data as SubscriptionRow | null) ?? null;
}

export async function hasPersonalizationAccess(userId: string): Promise<boolean> {
  // Fail open until Stripe is wired in the environment so local/dev and
  // pre-launch deploys are not accidentally locked out of the agent.
  if (!process.env.STRIPE_SECRET_KEY) return true;

  const sub = await getActiveSubscription(userId);
  return !!sub;
}

export async function logFunnelEvent(
  eventType: FunnelEventType,
  userId: string | null,
  meta: Record<string, unknown> = {},
  db: SupabaseClient | null = getAgentDb(),
): Promise<void> {
  if (!db) return;
  const { error } = await db.from('signup_funnel_event').insert({
    user_id: userId,
    event_type: eventType,
    meta,
  });
  if (error) console.error('[funnel]', eventType, error.message);
}

export function daysLeftInRefundWindow(sub: SubscriptionRow, now = new Date()): number {
  const until = new Date(sub.refund_eligible_until).getTime();
  const ms = until - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function isRefundEligible(sub: SubscriptionRow, now = new Date()): boolean {
  return sub.status === 'active' && new Date(sub.refund_eligible_until).getTime() > now.getTime();
}
