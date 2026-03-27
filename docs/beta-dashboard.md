# Dashboard beta Waveform

Objectif: savoir si un nouvel utilisateur comprend la promesse du produit, fait une premiere action utile, puis revient.

Ce dashboard est volontairement minimal. Tant que Waveform est en beta, il ne faut pas suivre 50 chiffres. Il faut suivre le funnel coeur du produit.

Les requetes SQL prêtes a lancer sont dans [docs/beta-dashboard-sql.md](docs/beta-dashboard-sql.md).

## Les 6 chiffres a regarder chaque semaine

1. Visiteurs uniques sur 7 jours
2. Inscriptions terminees
3. Onboardings termines
4. Utilisateurs ayant logge au moins 1 album
5. Utilisateurs ayant suivi au moins 1 personne
6. Retention J7

## Questions auxquelles le dashboard doit repondre

1. Est-ce que des gens entrent dans l'application ?
2. Est-ce qu'ils terminent l'inscription ?
3. Est-ce qu'ils comprennent quoi faire juste apres ?
4. Est-ce qu'ils font l'action coeur, c'est-a-dire logger un album ?
5. Est-ce qu'ils commencent a activer la couche sociale ?
6. Est-ce qu'ils reviennent une semaine plus tard ?

## Vue 1 - Acquisition

KPIs:

| Metrique | Definition | Pourquoi |
|---|---|---|
| Visiteurs uniques | Utilisateurs ou navigateurs ayant visite l'app sur 7 jours | Mesure l'entree de funnel |
| Taux visiteur -> inscription | `inscriptions_terminees / visiteurs_uniques` | Mesure la clarte de la proposition de valeur |
| Taux inscription -> onboarding | `onboardings_termines / inscriptions_terminees` | Mesure la friction juste apres auth |

## Vue 2 - Activation

KPIs:

| Metrique | Definition | Pourquoi |
|---|---|---|
| Premier album logge | Nombre d'utilisateurs ayant cree au moins une entree diary | C'est l'action coeur du produit |
| Taux onboarding -> premier log | `users_ayant_logge / onboardings_termines` | Mesure la comprehension du produit |
| Premier follow | Nombre d'utilisateurs ayant suivi au moins une personne | Mesure l'activation de la boucle sociale |
| Taux premier log -> premier follow | `users_ayant_follow / users_ayant_logge` | Mesure si la couche sociale est visible assez tot |

## Vue 3 - Retention

KPIs:

| Metrique | Definition | Pourquoi |
|---|---|---|
| Retention J1 | Pourcentage des inscrits revenus le lendemain | Mesure l'interet immediat |
| Retention J7 | Pourcentage des inscrits revenus entre J7 et J8 | Mesure le debut de la valeur recurrente |
| WAU | Utilisateurs actifs sur 7 jours | Mesure la traction minimale |
| Albums logges par WAU | `nombre_total_d_entrees_diary / WAU` | Mesure la profondeur d'usage |

## Evenements a suivre

Waveform a deja Vercel Analytics pour les vues de pages. Il manque surtout des evenements produit.

Evenements minimum a emettre:

| Evenement | Quand il part | Proprietes utiles |
|---|---|---|
| `signup_completed` | Compte cree avec succes | `method=email` |
| `onboarding_completed` | Fin du flow onboarding | `suggested_follows_count` |
| `album_search_used` | Premiere recherche album/artiste | `query_length`, `results_count`, `surface` |
| `album_import_started` | Clic sur import auto | `source=search|artist|diary|overlay` |
| `album_logged` | Creation d'une entree diary | `rating_present`, `review_present`, `source` |
| `user_followed` | Premier follow ou follow standard | `source=onboarding|profile|feed` |
| `review_liked` | Like sur une review | `surface=feed|diary|album` |
| `comment_created` | Commentaire cree | `surface=feed|diary` |

## Evenements de friction a suivre

| Evenement | Quand il part | Ce qu'il indique |
|---|---|---|
| `search_no_results` | Une recherche ne renvoie rien | Probleme de pertinence ou couverture |
| `album_import_failed` | L'import auto echoue | Probleme de donnees ou de pipeline |
| `auth_error` | Login, signup ou reset echoue | Probleme UX ou fiabilite |
| `action_error` | Une server action critique echoue | Probleme technique visible |

## Comment lire les chiffres

Signaux sains en beta:

1. Le taux inscription -> onboarding ne s'effondre pas.
2. Au moins la moitie des users onboardes loggent un premier album.
3. Une part non nulle des users actives suivent quelqu'un.
4. La retention J7 monte ou se stabilise au lieu de baisser a chaque iteration.

Signaux mauvais:

1. Beaucoup de visiteurs, peu d'inscriptions.
2. Beaucoup d'inscriptions, peu d'onboarding complete.
3. Beaucoup d'onboarding, peu de premier album logge.
4. Beaucoup de recherches sans resultat ou d'imports rates.

## Dashboard sans stack lourde

Tu peux commencer sans PostHog, sans Mixpanel, sans budget.

Option 1:
1. Garder Vercel Analytics pour les pages.
2. Stocker les evenements produit simples dans Supabase dans une table `product_events`.
3. Faire 3 vues SQL ou une page admin minimale.

Option 2:
1. Garder Vercel Analytics.
2. Logger les evenements dans un Google Sheet via webhook ou script.
3. Lire seulement les 6 chiffres cle chaque semaine.

## Table minimale si tu veux la faire dans Supabase

```sql
create table if not exists product_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null,
  session_id text null,
  event_name text not null,
  surface text null,
  properties jsonb not null default '{}'::jsonb
);

create index if not exists idx_product_events_event_name_created_at
  on product_events(event_name, created_at desc);

create index if not exists idx_product_events_user_id_created_at
  on product_events(user_id, created_at desc);
```

## Rituel hebdo recommande

Chaque semaine, reponds a ces 4 questions:

1. Combien de nouveaux users sont alles jusqu'au premier album logge ?
2. Ou perd-on le plus de monde dans le funnel ?
3. Quelles erreurs ou frictions reviennent le plus ?
4. Quelle unique iteration produit va avoir l'effet le plus clair sur ce funnel ?