-- ============================================================
-- Migration : aligne feed_events.entry_id sur ON DELETE CASCADE
-- À exécuter dans le dashboard Supabase → SQL Editor.
--
-- Découvert en relisant le dump fidèle de la prod (supabase_schema.sql
-- régénéré le 2026-06-30) : feed_events.entry_id était en réalité
-- ON DELETE SET NULL — seule colonne polymorphe de la table à ne pas être
-- en CASCADE (comment_id, track_comment_id, album_id, actor_id, user_id,
-- followee_id le sont tous). L'ancien supabase_schema.sql maintenu à la
-- main affirmait à tort qu'elle était déjà en CASCADE.
--
-- Conséquence concrète : toute suppression d'une diary_entries qui ne
-- nettoie pas feed_events explicitement (ex. adminDeleteContent en
-- modération — corrigé en parallèle dans moderation.ts) laisse une ligne
-- feed_events orpheline (entry_id=NULL). Elle ne s'affiche plus (filtrée
-- côté lecture par mapFeedEvent), mais continue de compter indéfiniment
-- dans le badge "non lu" (hasUnseenActivity ne filtre pas sur l'existence
-- de l'entrée) et pollue la table pour toujours.
-- ============================================================

ALTER TABLE feed_events
  DROP CONSTRAINT IF EXISTS feed_events_entry_id_fkey;

ALTER TABLE feed_events
  ADD CONSTRAINT feed_events_entry_id_fkey
  FOREIGN KEY (entry_id)
  REFERENCES diary_entries(id)
  ON DELETE CASCADE;

-- Nettoyage des orphelins déjà accumulés (entry_id NULL = ligne morte,
-- aucune entrée ne la référence plus).
DELETE FROM feed_events WHERE entry_id IS NULL AND type IN ('diary_entry', 'diary');
