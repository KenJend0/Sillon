# Requetes SQL beta dashboard

Ces requetes sont faites pour la table `product_events` ajoutee pour la beta.

Si tu veux un script SQL unique et idempotent pour Supabase, utilise aussi `supabase_migration_beta_dashboard_weekly.sql`.

Point important: le chiffre `visiteurs uniques` ne sort pas de cette table aujourd'hui, car les vues de pages restent dans Vercel Analytics. Les requetes ci-dessous couvrent donc surtout l'activation, la friction et la retention produit.

## 1. KPIs 7 jours

```sql
with current_7d as (
  select *
  from product_events
  where created_at >= now() - interval '7 days'
),
previous_7d as (
  select *
  from product_events
  where created_at >= now() - interval '14 days'
    and created_at < now() - interval '7 days'
)
select
  'current_7d' as period,
  count(distinct user_id) filter (where event_name = 'signup_completed' and user_id is not null) as signup_users,
  count(distinct user_id) filter (where event_name = 'onboarding_completed' and user_id is not null) as onboarded_users,
  count(distinct user_id) filter (where event_name = 'album_logged' and user_id is not null) as activated_users,
  count(distinct user_id) filter (where event_name = 'user_followed' and user_id is not null) as social_users,
  count(distinct user_id) filter (where user_id is not null) as wau,
  count(*) filter (where event_name = 'album_logged') as album_logs,
  round(
    count(*) filter (where event_name = 'album_logged')::numeric
    / nullif(count(distinct user_id) filter (where user_id is not null), 0),
    2
  ) as album_logs_per_wau
from current_7d

union all

select
  'previous_7d' as period,
  count(distinct user_id) filter (where event_name = 'signup_completed' and user_id is not null) as signup_users,
  count(distinct user_id) filter (where event_name = 'onboarding_completed' and user_id is not null) as onboarded_users,
  count(distinct user_id) filter (where event_name = 'album_logged' and user_id is not null) as activated_users,
  count(distinct user_id) filter (where event_name = 'user_followed' and user_id is not null) as social_users,
  count(distinct user_id) filter (where user_id is not null) as wau,
  count(*) filter (where event_name = 'album_logged') as album_logs,
  round(
    count(*) filter (where event_name = 'album_logged')::numeric
    / nullif(count(distinct user_id) filter (where user_id is not null), 0),
    2
  ) as album_logs_per_wau
from previous_7d;
```

## 2. Funnel journalier sur 30 jours

```sql
with daily as (
  select
    date_trunc('day', created_at)::date as day,
    event_name,
    user_id
  from product_events
  where created_at >= now() - interval '30 days'
)
select
  day,
  count(distinct user_id) filter (where event_name = 'signup_completed' and user_id is not null) as signups,
  count(distinct user_id) filter (where event_name = 'onboarding_completed' and user_id is not null) as onboardings,
  count(distinct user_id) filter (where event_name = 'album_logged' and user_id is not null) as first_or_repeat_album_loggers,
  count(distinct user_id) filter (where event_name = 'user_followed' and user_id is not null) as followers,
  round(
    count(distinct user_id) filter (where event_name = 'onboarding_completed' and user_id is not null)::numeric
    / nullif(count(distinct user_id) filter (where event_name = 'signup_completed' and user_id is not null), 0),
    3
  ) as signup_to_onboarding_rate,
  round(
    count(distinct user_id) filter (where event_name = 'album_logged' and user_id is not null)::numeric
    / nullif(count(distinct user_id) filter (where event_name = 'onboarding_completed' and user_id is not null), 0),
    3
  ) as onboarding_to_album_rate
from daily
group by day
order by day desc;
```

## 3. Premiers albums logges par nouvel inscrit

Cette requete mesure mieux l'activation reelle: un inscrit est compte seulement s'il logge son premier album apres son signup.

```sql
with signups as (
  select
    user_id,
    min(created_at) as signup_at
  from product_events
  where event_name = 'signup_completed'
    and user_id is not null
  group by user_id
),
first_album_log as (
  select
    user_id,
    min(created_at) as first_album_logged_at
  from product_events
  where event_name = 'album_logged'
    and user_id is not null
  group by user_id
)
select
  date_trunc('week', s.signup_at)::date as cohort_week,
  count(*) as signed_up_users,
  count(*) filter (
    where f.first_album_logged_at is not null
      and f.first_album_logged_at >= s.signup_at
      and f.first_album_logged_at < s.signup_at + interval '7 days'
  ) as activated_in_7d,
  round(
    count(*) filter (
      where f.first_album_logged_at is not null
        and f.first_album_logged_at >= s.signup_at
        and f.first_album_logged_at < s.signup_at + interval '7 days'
    )::numeric / nullif(count(*), 0),
    3
  ) as activation_rate_7d
from signups s
left join first_album_log f on f.user_id = s.user_id
group by cohort_week
order by cohort_week desc;
```

## 4. Premiere activation sociale apres activation coeur

```sql
with first_album_log as (
  select user_id, min(created_at) as first_album_logged_at
  from product_events
  where event_name = 'album_logged'
    and user_id is not null
  group by user_id
),
first_follow as (
  select user_id, min(created_at) as first_followed_at
  from product_events
  where event_name = 'user_followed'
    and user_id is not null
  group by user_id
)
select
  date_trunc('week', a.first_album_logged_at)::date as cohort_week,
  count(*) as activated_users,
  count(*) filter (
    where f.first_followed_at is not null
      and f.first_followed_at >= a.first_album_logged_at
      and f.first_followed_at < a.first_album_logged_at + interval '7 days'
  ) as socialized_in_7d,
  round(
    count(*) filter (
      where f.first_followed_at is not null
        and f.first_followed_at >= a.first_album_logged_at
        and f.first_followed_at < a.first_album_logged_at + interval '7 days'
    )::numeric / nullif(count(*), 0),
    3
  ) as album_to_follow_rate_7d
from first_album_log a
left join first_follow f on f.user_id = a.user_id
group by cohort_week
order by cohort_week desc;
```

## 5. Frictions 7 jours

```sql
select
  event_name,
  surface,
  count(*) as events,
  count(distinct user_id) filter (where user_id is not null) as affected_users
from product_events
where created_at >= now() - interval '7 days'
  and event_name in ('auth_error', 'search_no_results', 'album_import_failed')
group by event_name, surface
order by events desc, event_name, surface;
```

## 6. Retention J1 et J7 par cohorte

La retention est calculee sur les utilisateurs ayant un `signup_completed`, puis n'importe quelle activite ulterieure dans `product_events`.

```sql
with signups as (
  select
    user_id,
    min(created_at)::date as signup_date
  from product_events
  where event_name = 'signup_completed'
    and user_id is not null
  group by user_id
),
activity_days as (
  select distinct
    user_id,
    created_at::date as activity_date
  from product_events
  where user_id is not null
),
cohorts as (
  select
    s.user_id,
    s.signup_date,
    exists (
      select 1
      from activity_days a
      where a.user_id = s.user_id
        and a.activity_date = s.signup_date + 1
    ) as retained_d1,
    exists (
      select 1
      from activity_days a
      where a.user_id = s.user_id
        and a.activity_date between s.signup_date + 7 and s.signup_date + 8
    ) as retained_d7
  from signups s
)
select
  date_trunc('week', signup_date)::date as cohort_week,
  count(*) as signed_up_users,
  count(*) filter (where retained_d1) as retained_users_d1,
  round(count(*) filter (where retained_d1)::numeric / nullif(count(*), 0), 3) as retention_d1,
  count(*) filter (where retained_d7) as retained_users_d7,
  round(count(*) filter (where retained_d7)::numeric / nullif(count(*), 0), 3) as retention_d7
from cohorts
group by cohort_week
order by cohort_week desc;
```

## 7. Repartition des recherches par surface

```sql
select
  surface,
  count(*) as searches,
  count(*) filter (where event_name = 'search_no_results') as no_result_events,
  round(
    count(*) filter (where event_name = 'search_no_results')::numeric
    / nullif(count(*), 0),
    3
  ) as no_result_rate
from product_events
where created_at >= now() - interval '30 days'
  and event_name in ('search_used', 'search_no_results')
group by surface
order by searches desc;
```

## 8. Vue simple pour une future page admin

Si tu veux une base propre pour une page admin, tu peux materialiser une vue hebdo.

```sql
create or replace view beta_dashboard_weekly as
with base as (
  select *
  from product_events
  where created_at >= now() - interval '90 days'
)
select
  date_trunc('week', created_at)::date as week,
  count(distinct user_id) filter (where event_name = 'signup_completed' and user_id is not null) as signup_users,
  count(distinct user_id) filter (where event_name = 'onboarding_completed' and user_id is not null) as onboarded_users,
  count(distinct user_id) filter (where event_name = 'album_logged' and user_id is not null) as activated_users,
  count(distinct user_id) filter (where event_name = 'user_followed' and user_id is not null) as social_users,
  count(distinct user_id) filter (where user_id is not null) as wau,
  count(*) filter (where event_name = 'album_import_failed') as import_failures,
  count(*) filter (where event_name = 'search_no_results') as search_no_results,
  count(*) filter (where event_name = 'auth_error') as auth_errors
from base
group by week
order by week desc;
```

## Limites actuelles

1. `visiteurs uniques` reste dans Vercel Analytics, pas dans Supabase.
2. On logge aujourd'hui `query_length`, pas le texte de recherche. Donc on peut mesurer le taux de recherche sans resultat, mais pas encore les requetes precises qui echouent.
3. `album_logged` compte tout log, pas seulement le premier. Pour un vrai funnel, utilise les requetes basees sur `min(created_at)` par `user_id`.