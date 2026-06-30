# Audit Supabase pré-V1 — Waveform

Audit de l'architecture base de données + du pipeline de suppression des critiques, mené avant le gel du schéma pour la V1. Coche au fur et à mesure qu'on traite chaque point.

---

## 0. Bug rapporté : critique supprimée toujours visible en feed

**Cause** : le feed est en fan-out à l'écriture (une ligne `feed_events` par abonné, pas une vue calculée). La suppression doit donc nettoyer explicitement ces copies chez chaque abonné — ce qui ne se produisait pas pour les critiques de titre.

- [x] `deleteTrackDiaryEntry` (track-diary.ts) ne supprimait aucun `feed_events` — corrigé (delete admin sur `track_diary_entry`/`track_like`/`track_comment` via `payload->>trackEntryId`)
- [x] `deleteTrackComment` (track-diary.ts) ne nettoyait pas les notifications de commentaire — corrigé
- [x] `deleteDiaryEntry` (diary.ts) utilisait le client RLS au lieu du client admin pour supprimer `feed_events` (ne supprimait rien, sauvé en pratique par la contrainte `ON DELETE CASCADE`) — corrigé pour utiliser `createSupabaseAdmin()`

---

## 1. Migration prête : `supabase_migrations/supabase_migration_v1_audit_fixes.sql`

**✅ Appliquée le 2026-06-30.**

- [x] **Sécurité** — `list_likes_select` rendait visibles les likes sur une liste privée à tout le monde (`USING (true)` sans vérifier `user_lists.is_public`). Corrigé pour hériter de la visibilité de la liste parente.
- [x] **Cohérence** — `feed_events.track_comment_id` était `ON DELETE SET NULL` au lieu de `CASCADE` (asymétrie avec `comment_id`) → laissait une notification fantôme après suppression d'un commentaire sur critique de titre.
- [x] **Index** `idx_diary_entries_public_created` — filtre `is_public` sur le feed public/trending (album)
- [x] **Index** `idx_track_diary_entries_public_created` — idem côté titres
- [x] **Index** `idx_feed_events_user_created` — requête la plus fréquente de l'app (chargement du fil d'activité)
- [x] **Index** `idx_feed_events_followee_id` — colonne FK filtrée (`getFollowActors`) sans index
- [x] **Index** `idx_feed_events_comment_id` — asymétrie avec `track_comment_id` déjà indexé
- [x] **Index** `idx_track_diary_comments_parent` — threading des réponses (équivalent manquant de l'index album)
- [x] **Index** `idx_user_similarity_user_b_score` — sens inverse de la relation directionnelle (utilisé par `explore.ts`)
- [x] **Index** `idx_diary_entries_user_listened` — tri du journal personnel par `listened_at` (seul `created_at` était indexé)

---

## 2. Décisions produit à trancher (bloquant avant le gel du schéma)

**Vérifié en base le 2026-06-30 — voir résultats des requêtes de diagnostic.**

- [x] **`recommendations` / `notifications` / `recommendation_likes`** — **CONFIRMÉ : n'existent pas en prod** (`information_schema.tables` ne retourne aucune ligne). `recommendations.ts` + `RecommendationModal.tsx` supprimés (code mort garanti cassé). Commentaire `supabase_schema.sql` mis à jour. PATCH 2 de `supabase_rls_patches.sql` (visait `recommendation_likes`, table inexistante) retiré avec note explicative.
- [ ] **`album_stats_mat`** — **CONFIRMÉ : existe**, vue matérialisée simple (avg_rating/listeners_count par album), jamais rafraîchie (pas de `pg_cron`, aucun script ne faisait de `REFRESH`). Migration créée : `supabase_migrations/supabase_migration_album_stats_mat.sql` (rapatrie la vue + ajoute une fonction RPC `refresh_album_stats_mat()` réservée au service role). Appel quotidien ajouté dans `.github/workflows/daily-enrich.yml` (step "Refresh album_stats_mat").
  → **Reste à faire : exécuter la migration SQL dans le dashboard Supabase** (voir requête ci-dessous).
- [x] **`saved_albums` vs liste "À écouter" (`list_items`)** — **CONFIRMÉ divergent et migré.** Découverte en creusant l'UI : `SaveAlbumButton`/`SavedTracks` (les seuls composants qui *affichaient* `saved_albums`) n'étaient déjà rendus nulle part — `saved_albums` ne servait plus qu'en écriture muette (depuis `ImportButton`) et dans un toggle incohérent (`AddToDiaryButton` agissait sur `saved_albums` alors que sa checkbox était pilotée par l'état de `list_items`). Code migré vers `list_items`/`user_lists` (liste par défaut) :
  - `ImportButton.tsx` → `getOrCreateDefaultList()` + `toggleListItem()` au lieu de `saveAlbumOnce()`
  - `AddToDiaryButton.tsx` / `AlbumHero.tsx` → `toggleListItem(defaultListId, …)` au lieu de `toggleSaveAlbum()`
  - `explore.ts` (fallback trending) → lit `list_items.added_at` au lieu de `saved_albums.saved_at`
  - `export.ts` (RGPD) → `saved_albums` retiré (déjà couvert par `lists`/`list_items`)
  - 4 scripts de maintenance (`reconcile-duplicate-albums.mjs`, `reconcile-duplicate-tracks.mjs`, `refix-suspicious-albums.mjs`, `investigate-mbid-not-found.mjs`) → références à `saved_albums` retirées
  - Fichiers supprimés : `saved-albums.ts`, `SaveAlbumButton.tsx`, `SavedTracks.tsx` (code mort)
  → **Reste à faire en base** : lancer le backfill puis `DROP TABLE saved_albums` une fois le code déployé (voir requêtes ci-dessous).
- [x] **`user_taste_vectors` / `recommendation_metrics`** — **CONFIRMÉ actifs** : pipeline ML externe toujours en fonctionnement (dernier calcul du jour même, 2026-06-30). Tables légitimes, à conserver telles quelles. Aucune action requise.

---

## 3. Nettoyage mineur / cosmétique (non bloquant, à faire si le temps le permet)

- [ ] Fusionner les migrations dupliquées `supabase_migration_track_ratings.sql` et `supabase_migration_track_diary_likes.sql` (créent les mêmes tables `track_diary_likes`/`track_diary_comments` — inoffensif car idempotent, mais pollue l'historique)
- [ ] Fusionner `supabase_migration_product_events.sql` et `supabase_migration_beta_dashboard_weekly.sql` (même duplication)
- [ ] Supprimer ou brancher la vue `beta_dashboard_weekly` — créée en DB mais `app/admin/page.tsx` recalcule les mêmes métriques en JS depuis `product_events` directement
- [ ] Supprimer le filtre mort `.neq('type', 'discover')` dans `feed.ts` (lignes ~168, ~1157) — devenu un no-op depuis que la contrainte CHECK rejette ce type
- [ ] Supprimer `external_ids` si confirmé sans usage (RLS + index existent pour une table jamais lue/écrite par le code — les IDs externes sont stockés directement en colonnes ailleurs : `albums.mbid`, `album_metadata.spotify_url`, etc.)
- [ ] Supprimer les scripts orphelins `scripts/refresh_discover.sh` / `.ps1` (référencent une ancienne API Express qui n'existe plus dans le repo)
- [ ] Régénérer `supabase_schema.sql` une fois les décisions ci-dessus prises, pour qu'il reflète fidèlement la prod (actuellement partiellement désynchronisé — sert de référence pour le gel, donc doit être fiable)
- [ ] Harmoniser le pattern de comptage likes/comments (album diary = triggers + colonnes dénormalisées, track diary = vue SQL recalculée, listes = `COUNT()` à la demande) — ou documenter explicitement pourquoi les trois diffèrent

---

## Notes de méthode

Audit croisé via 3 passes indépendantes (recherche exhaustive par grep sur `frontend/app/actions/*.ts` + lecture des 57 fichiers de migration). Les points ci-dessus sont ceux qui ont survécu à la vérification croisée ; les faux positifs (ex. RLS de `track_diary_likes`/`track_diary_comments`, en réalité déjà correctement durcie) ont été écartés.
