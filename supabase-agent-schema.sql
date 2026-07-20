-- ─────────────────────────────────────────────────────────────────────────────
-- Naya Personalized Shopping Agent — data model
-- Run this in the Supabase SQL Editor (after supabase-schema.sql).
--
-- Notes on conventions for this repo:
--   * There is no `users` table (identity comes from Clerk) and no persistent
--     `listings` table (listings are ephemeral scrape results). So:
--       - user_id is TEXT = the Clerk user id, or a stable anonymous id the
--         client persists in localStorage before sign-in.
--       - a listing is referenced by listing_id (a stable hash of its URL) plus
--         denormalized snapshot columns so the "For you" feed can render a match
--         without re-scraping.
--   * RLS is disabled to match the rest of the schema (service key writes,
--     anon key reads). Re-enable + add policies before this is multi-tenant PII.
-- ─────────────────────────────────────────────────────────────────────────────

-- One taste profile per user (upserted by the rebuild job + onboarding).
create table if not exists user_taste_profile (
  user_id text primary key,
  preferred_brands text[] not null default '{}',
  preferred_categories text[] not null default '{}',
  size_profile jsonb not null default '{}'::jsonb,   -- {"tops":"M","denim":"29x30","shoes":"8.5"}
  price_ceiling numeric(10,2),
  style_tags text[] not null default '{}',           -- y2k, workwear, minimalist, grunge
  era_preference text[] not null default '{}',       -- 90s, 2000s
  onboarded boolean not null default false,
  onboarded_at timestamptz,                          -- set when the signup onboarding flow completes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If the table already existed from an earlier run, add the completion timestamp.
alter table user_taste_profile add column if not exists onboarded_at timestamptz;

-- Standing natural-language searches the agent re-runs in the background.
create table if not exists user_saved_search (
  id bigint generated always as identity primary key,
  user_id text not null,
  query_text text not null,                          -- raw NL query
  parsed_filters jsonb not null default '{}'::jsonb, -- structured filters from the NLP parser
  is_active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

-- Implicit + explicit engagement signals. Rolled up into user_taste_profile.
do $$ begin
  create type listing_interaction_type as enum
    ('viewed', 'saved', 'dismissed', 'clicked_through', 'purchased');
exception when duplicate_object then null; end $$;

create table if not exists user_listing_interaction (
  id bigint generated always as identity primary key,
  user_id text not null,
  listing_id text not null,                          -- stable hash of listing_url
  interaction_type listing_interaction_type not null,
  dwell_time_ms int,
  -- Denormalized listing snapshot so the rollup job has features to count
  -- without a listings table.
  listing_url text,
  listing_title text,
  brand text,
  item_type text,
  price numeric(10,2),
  image_url text,
  source text,
  style_tags text[] not null default '{}',
  era text,
  created_at timestamptz not null default now()
);

-- Agent-generated, scored matches. This is what the "For you" feed reads.
do $$ begin
  create type match_feedback as enum ('liked', 'dismissed');
exception when duplicate_object then null; end $$;

create table if not exists agent_match (
  id bigint generated always as identity primary key,
  user_id text not null,
  listing_id text not null,                          -- stable hash of listing_url
  saved_search_id bigint references user_saved_search (id) on delete set null,
  match_score double precision not null,
  match_reason text,
  -- Denormalized listing snapshot for rendering the feed card.
  listing_url text not null,
  listing_title text,
  brand text,
  item_type text,
  price numeric(10,2),
  original_price numeric(10,2),
  image_url text,
  source text,
  delivered_at timestamptz,                          -- null until pushed to the user
  user_feedback match_feedback,                      -- null | liked | dismissed
  created_at timestamptz not null default now(),
  -- One live match per listing per user; the refresh job upserts on this.
  unique (user_id, listing_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_saved_search_user_active
  on user_saved_search (user_id, is_active);

create index if not exists idx_interaction_user_created
  on user_listing_interaction (user_id, created_at);
create index if not exists idx_interaction_type
  on user_listing_interaction (user_id, interaction_type);

create index if not exists idx_agent_match_user_score
  on agent_match (user_id, match_score desc);
create index if not exists idx_agent_match_undelivered
  on agent_match (user_id, delivered_at);
create index if not exists idx_agent_match_feedback
  on agent_match (user_id, user_feedback);

-- One row per user account, so we can count signups and correlate them with
-- onboarding + agent activity. user_id is the Clerk id when signed in, else the
-- stable anon id. `source` records where the signup happened (signup_page,
-- clerk_modal, pricing, anon, …). Upserted idempotently on first sight.
create table if not exists user_account (
  user_id text primary key,
  email text,
  source text,
  onboarded boolean not null default false,
  signup_count int not null default 1,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_user_account_created on user_account (created_at);
create index if not exists idx_user_account_email on user_account (email);

-- ── RLS (disabled to match existing tables) ─────────────────────────────────
alter table user_taste_profile     disable row level security;
alter table user_saved_search      disable row level security;
alter table user_listing_interaction disable row level security;
alter table agent_match            disable row level security;
alter table user_account           disable row level security;
