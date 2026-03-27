-- ============================================================
-- BETA DASHBOARD SETUP
-- Script idempotent a executer dans l'editeur SQL Supabase
-- 1. Cree la table product_events si elle n'existe pas encore
-- 2. Ajoute les index et policies minimales
-- 3. Cree la vue beta_dashboard_weekly pour l'admin
-- ============================================================

create table if not exists product_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  session_id text null,
  event_name text not null,
  surface text null,
  properties jsonb not null default '{}'
);

create index if not exists idx_product_events_created_at
  on product_events(created_at desc);

create index if not exists idx_product_events_event_name_created_at
  on product_events(event_name, created_at desc);

create index if not exists idx_product_events_user_id_created_at
  on product_events(user_id, created_at desc);

alter table product_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_events'
      and policyname = 'product_events_read_own'
  ) then
    create policy product_events_read_own on product_events
      for select to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_events'
      and policyname = 'product_events_insert_authenticated'
  ) then
    create policy product_events_insert_authenticated on product_events
      for insert to authenticated
      with check (auth.uid() = user_id or user_id is null);
  end if;
end $$;

create or replace view beta_dashboard_weekly as
with base as (
  select *
  from product_events
  where created_at >= now() - interval '180 days'
)
select
  date_trunc('week', created_at)::date as week,
  count(distinct user_id) filter (where event_name = 'signup_completed' and user_id is not null) as signup_users,
  count(distinct user_id) filter (where event_name = 'onboarding_completed' and user_id is not null) as onboarded_users,
  count(distinct user_id) filter (where event_name = 'album_logged' and user_id is not null) as activated_users,
  count(distinct user_id) filter (where event_name = 'user_followed' and user_id is not null) as social_users,
  count(distinct user_id) filter (where user_id is not null) as wau,
  count(*) filter (where event_name = 'album_logged') as album_logs,
  count(*) filter (where event_name = 'album_import_failed') as import_failures,
  count(*) filter (where event_name = 'search_no_results') as search_no_results,
  count(*) filter (where event_name = 'auth_error') as auth_errors
from base
group by week
order by week desc;