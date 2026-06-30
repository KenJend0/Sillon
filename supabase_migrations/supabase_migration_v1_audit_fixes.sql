-- ============================================================
-- Migration : Correctifs de l'audit pré-V1
-- À exécuter dans le dashboard Supabase → SQL Editor
-- Aucune suppression de données — uniquement des correctifs
-- additifs (index) et un durcissement RLS ciblé.
-- ============================================================

-- 1. Confidentialité : les likes sur une liste privée étaient visibles
--    par tout le monde (policy USING (true) sans vérifier user_lists.is_public).
--    On aligne sur le pattern déjà utilisé pour list_items / diary_comments.
DROP POLICY IF EXISTS "list_likes_select" ON list_likes;
CREATE POLICY "list_likes_select" ON list_likes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_lists ul
            WHERE ul.id = list_likes.list_id
            AND (ul.is_public = true OR ul.user_id = auth.uid())
        )
    );

-- 2. feed_events.track_comment_id est ON DELETE SET NULL, contrairement à
--    comment_id qui est ON DELETE CASCADE — même classe de bug que le
--    nettoyage manquant de feed_events déjà corrigé côté code pour les
--    track diary entries. Sans CASCADE, supprimer un commentaire de critique
--    de titre laisse une notification fantôme ("X a commenté") dans le feed
--    des abonnés.
ALTER TABLE feed_events
  DROP CONSTRAINT IF EXISTS feed_events_track_comment_id_fkey;

ALTER TABLE feed_events
  ADD CONSTRAINT feed_events_track_comment_id_fkey
  FOREIGN KEY (track_comment_id)
  REFERENCES track_diary_comments(id)
  ON DELETE CASCADE;

-- 3. Index manquants — requêtes chaudes (feed, trending) sans index adapté.
CREATE INDEX IF NOT EXISTS idx_diary_entries_public_created
  ON diary_entries(created_at DESC) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_track_diary_entries_public_created
  ON track_diary_entries(created_at DESC) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_feed_events_user_created
  ON feed_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_events_followee_id
  ON feed_events(followee_id) WHERE followee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feed_events_comment_id
  ON feed_events(comment_id) WHERE comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_track_diary_comments_parent
  ON track_diary_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- user_similarity n'a un index que sur (user_a, score) : la relation est
-- directionnelle (une ligne par paire ordonnée), donc les lookups sur
-- user_b (sens inverse, utilisés par explore.ts) scannent sans index dédié.
CREATE INDEX IF NOT EXISTS idx_user_similarity_user_b_score
  ON user_similarity(user_b, score DESC);

-- Le journal personnel trie par listened_at (pas created_at, le seul indexé).
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_listened
  ON diary_entries(user_id, listened_at DESC);
