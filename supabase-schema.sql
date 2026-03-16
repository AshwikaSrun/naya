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

-- Indexes for fast aggregation queries
create index if not exists idx_price_obs_brand_type on price_observations (brand, item_type);
create index if not exists idx_price_obs_created on price_observations (created_at);
create index if not exists idx_price_obs_query on price_observations (query);
create index if not exists idx_search_events_query on search_events (query);
create index if not exists idx_search_events_created on search_events (created_at);
create index if not exists idx_search_events_campus on search_events (campus_slug);
