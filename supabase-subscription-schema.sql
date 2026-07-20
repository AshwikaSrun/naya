-- ─────────────────────────────────────────────────────────────────────────────
-- Naya Personalization Pilot — billing tables
-- Run in the Supabase SQL Editor after supabase-agent-schema.sql.
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type subscription_status as enum
    ('active', 'refunded', 'canceled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type signup_funnel_event_type as enum (
    'popup_viewed',
    'value_screen_viewed',
    'pricing_screen_viewed',
    'payment_started',
    'payment_completed',
    'refund_requested',
    'onboarding_completed_after_paywall'
  );
exception when duplicate_object then null; end $$;

create table if not exists subscription (
  id bigint generated always as identity primary key,
  user_id text not null,
  status subscription_status not null default 'active',
  plan text not null default 'personalization_pilot_monthly',
  price_cents int not null default 899,
  stripe_subscription_id text,
  stripe_customer_id text,
  started_at timestamptz not null default now(),
  refund_eligible_until timestamptz not null,
  refunded_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_user_id_idx on subscription (user_id);
create index if not exists subscription_status_idx on subscription (status);
create unique index if not exists subscription_stripe_sub_uidx
  on subscription (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists signup_funnel_event (
  id bigint generated always as identity primary key,
  user_id text,
  event_type signup_funnel_event_type not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signup_funnel_event_user_id_idx on signup_funnel_event (user_id);
create index if not exists signup_funnel_event_type_idx on signup_funnel_event (event_type);
create index if not exists signup_funnel_event_created_at_idx on signup_funnel_event (created_at desc);
