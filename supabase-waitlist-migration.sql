-- Run in Supabase SQL Editor if waitlist_signups already exists without source / unique email.
-- Safe to re-run.

alter table waitlist_signups add column if not exists source text;
update waitlist_signups set source = 'signup' where source is null;
alter table waitlist_signups alter column source set default 'signup';

-- Deduplicate before adding unique index (keep earliest row per email)
delete from waitlist_signups a
using waitlist_signups b
where a.email = b.email
  and a.id > b.id;

create unique index if not exists waitlist_signups_email_uidx on waitlist_signups (email);

alter table waitlist_signups disable row level security;
