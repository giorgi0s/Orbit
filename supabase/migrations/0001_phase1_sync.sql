-- Orbit · Phase 1: tasks, weekly goals and the work timer, synced between devices.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.

-- ───────── tables ─────────

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  title       text not null check (char_length(title) between 1 and 500),
  done        boolean not null default false,
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  slug        text not null,
  title       text not null,
  target      int  not null check (target between 1 and 14),
  sticker     text not null default 'star' check (sticker in ('star', 'heart', 'sun')),
  sort        int  not null default 0,
  archived    boolean not null default false,
  unique (user_id, slug)
);

-- How many stickers each goal has in a given week (week_start is that week's Monday).
create table if not exists public.goal_stamps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  goal_id     uuid not null references public.goals on delete cascade,
  week_start  date not null,
  count       int  not null default 0 check (count >= 0),
  unique (goal_id, week_start)
);

-- One row per person: what the sticky-note timer is doing right now.
create table if not exists public.timer (
  user_id     uuid primary key default auth.uid() references auth.users on delete cascade,
  project     text not null default 'Work',
  started_at  timestamptz
);

create table if not exists public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  project     text not null,
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  check (ended_at >= started_at)
);

create index if not exists tasks_user_created on public.tasks (user_id, created_at);
create index if not exists goal_stamps_user_week on public.goal_stamps (user_id, week_start);
create index if not exists time_entries_user_ended on public.time_entries (user_id, ended_at);

-- ───────── security: every row belongs to whoever is signed in ─────────

do $$
declare t text;
begin
  foreach t in array array['tasks', 'goals', 'goal_stamps', 'timer', 'time_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ───────── live sync: send changes to the other device instantly ─────────

do $$
declare t text;
begin
  foreach t in array array['tasks', 'goals', 'goal_stamps', 'timer', 'time_entries'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ───────── starter weekly goals for every existing user ─────────

insert into public.goals (user_id, slug, title, target, sticker, sort)
select u.id, g.slug, g.title, g.target, g.sticker, g.sort
from auth.users u
cross join (values
  ('gym',  'Gym',          3, 'star',  1),
  ('cook', 'Cook at home', 4, 'heart', 2),
  ('out',  'Go out',       2, 'sun',   3)
) as g(slug, title, target, sticker, sort)
on conflict (user_id, slug) do nothing;
