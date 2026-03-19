-- Run this in the Supabase SQL Editor to create the tables

create table if not exists price_observations (
  id bigint generated always as identity primary key,
  query text not null,
  item_title text not null,
  brand text,
  item_type text,
  price numeric(10,2) not null,
  original_price numeric(10,2),
  source text not null,
  image_url text,
  listing_url text,
  created_at timestamptz default now()
);

create table if not exists search_events (
  id bigint generated always as identity primary key,
  query text not null,
  campus_slug text,
  result_count int not null default 0,
  platforms_hit text[] not null default '{}',
  created_at timestamptz default now()
);

create table if not exists redirect_events (
  id bigint generated always as identity primary key,
  destination_url text not null,
  source text not null,
  title text,
  price numeric(10,2),
  created_at timestamptz default now()
);

-- Indexes for fast aggregation queries
create index if not exists idx_price_obs_brand_type on price_observations (brand, item_type);
create index if not exists idx_price_obs_created on price_observations (created_at);
create index if not exists idx_price_obs_query on price_observations (query);
create index if not exists idx_search_events_query on search_events (query);
create index if not exists idx_search_events_created on search_events (created_at);
create index if not exists idx_search_events_campus on search_events (campus_slug);
create index if not exists idx_redirect_events_source on redirect_events (source);
create index if not exists idx_redirect_events_created on redirect_events (created_at);

create table if not exists app_installs (
  id bigint generated always as identity primary key,
  platform text not null default 'pwa',
  user_agent text,
  referrer text,
  created_at timestamptz default now()
);

create table if not exists waitlist_signups (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz default now()
);

create table if not exists auth_events (
  id bigint generated always as identity primary key,
  identifier text not null,
  source text not null,
  created_at timestamptz default now()
);

create index if not exists idx_app_installs_created on app_installs (created_at);
create index if not exists idx_app_installs_platform on app_installs (platform);
create index if not exists idx_waitlist_signups_created on waitlist_signups (created_at);
create index if not exists idx_waitlist_signups_email on waitlist_signups (email);
create index if not exists idx_auth_events_created on auth_events (created_at);
create index if not exists idx_auth_events_identifier on auth_events (identifier);

-- Disable RLS so service key writes and anon key reads both work
alter table price_observations disable row level security;
alter table search_events disable row level security;
alter table redirect_events disable row level security;
alter table app_installs disable row level security;
alter table waitlist_signups disable row level security;
alter table auth_events disable row level security;
