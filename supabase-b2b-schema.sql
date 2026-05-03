-- naya B2B API auth layer — run this in the Supabase SQL Editor.
-- Adds the api_keys + api_usage tables that back scraper-api/middleware/apiAuth.js.

-- gen_random_uuid() lives in pgcrypto on older Postgres images.
create extension if not exists pgcrypto;

-- ── api_keys ──────────────────────────────────────────────────────────────
create table if not exists api_keys (
  id              uuid primary key default gen_random_uuid(),
  api_key         text unique not null
                    default concat('naya_', replace(gen_random_uuid()::text, '-', '')),
  customer_name   text,
  customer_email  text,
  tier            text not null default 'pilot'
                    check (tier in ('pilot', 'growth', 'scale')),
  monthly_limit   integer default 1000,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  notes           text
);

-- ── api_usage ─────────────────────────────────────────────────────────────
create table if not exists api_usage (
  id           bigserial primary key,
  api_key_id   uuid references api_keys(id) on delete cascade,
  api_key      text,
  endpoint     text,
  query        text,
  status_code  integer,
  response_ms  integer,
  created_at   timestamptz not null default now()
);

-- ── indexes ───────────────────────────────────────────────────────────────
create index if not exists idx_api_keys_api_key       on api_keys (api_key);
create index if not exists idx_api_usage_api_key      on api_usage (api_key);
create index if not exists idx_api_usage_created_desc on api_usage (created_at desc);
create index if not exists idx_api_usage_key_id_month on api_usage (api_key_id, created_at desc);

-- Service-role middleware does its own auth; keep RLS disabled like the rest of the schema.
alter table api_keys  disable row level security;
alter table api_usage disable row level security;

-- ── sandbox key (idempotent insert) ───────────────────────────────────────
insert into api_keys (customer_name, customer_email, tier, monthly_limit, notes)
select 'Sandbox', 'ashwikasrun@gmail.com', 'pilot', 100, 'Public sandbox key for evaluation. 100 calls/month.'
where not exists (
  select 1 from api_keys where customer_email = 'ashwikasrun@gmail.com'
);

-- Convenience: print the sandbox key after running so you can copy it.
select api_key as sandbox_api_key, monthly_limit, tier
from api_keys
where customer_email = 'ashwikasrun@gmail.com';
