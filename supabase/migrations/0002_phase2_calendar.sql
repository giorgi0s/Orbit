-- Orbit · Phase 2: calendar events, push subscriptions and reminder bookkeeping.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.

create table if not exists public.events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users on delete cascade,
  title               text not null check (char_length(title) between 1 and 200),
  starts_at           timestamptz not null,
  ends_at             timestamptz,
  all_day             boolean not null default false,
  area                text not null default 'other' check (area in ('work', 'body', 'food', 'out', 'home', 'mind', 'other')),
  location            text,
  notes               text,
  -- Weekly repeats: days of the week it happens on (0 = Sunday … 6 = Saturday), until an optional end date.
  repeat_days         smallint[] check (repeat_days is null or repeat_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  repeat_until        date,
  remind_day_before   boolean not null default true,
  remind_hour_before  boolean not null default true,
  created_at          timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists events_user_starts on public.events (user_id, starts_at);

-- One row per device that allowed notifications.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  device      text,
  created_at  timestamptz not null default now()
);

create table if not exists public.settings (
  user_id     uuid primary key default auth.uid() references auth.users on delete cascade,
  timezone    text not null default 'Europe/London'
);

-- What the reminder sender has already sent, so nothing is sent twice.
create table if not exists public.sent_notifications (
  user_id     uuid not null references auth.users on delete cascade,
  kind        text not null,              -- 'morning' | 'evening' | 'hour' | 'test'
  ref         text not null default '',    -- event id for 'hour'
  occurrence  date not null,
  sent_at     timestamptz not null default now(),
  primary key (user_id, kind, ref, occurrence)
);

do $$
declare t text;
begin
  foreach t in array array['events', 'push_subscriptions', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Only the reminder sender (service role) touches this one.
alter table public.sent_notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events') then
    alter publication supabase_realtime add table public.events;
  end if;
end $$;

-- The scheduler that wakes the reminder sender every 5 minutes.
create extension if not exists pg_cron;
create extension if not exists pg_net;
