-- ============================================================
-- Migration : harmonise le comptage likes/comments sur le pattern
-- déjà utilisé pour diary_entries (voir supabase_migration_feed_counts_backfill.sql)
-- — colonnes dénormalisées + triggers, au lieu d'une vue recalculée à
-- chaque lecture (track_diary_entries) ou d'un COUNT() à la demande (user_lists).
-- À exécuter dans le dashboard Supabase → SQL Editor.
-- ============================================================

-- ── track_diary_entries ──────────────────────────────────────

ALTER TABLE track_diary_entries ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;
ALTER TABLE track_diary_entries ADD COLUMN IF NOT EXISTS comments_count INT NOT NULL DEFAULT 0;

UPDATE track_diary_entries e
SET likes_count = (SELECT COUNT(*) FROM track_diary_likes l WHERE l.entry_id = e.id);

UPDATE track_diary_entries e
SET comments_count = (SELECT COUNT(*) FROM track_diary_comments c WHERE c.entry_id = e.id);

CREATE OR REPLACE FUNCTION update_track_entry_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE track_diary_entries SET likes_count = likes_count + 1 WHERE id = NEW.entry_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE track_diary_entries SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.entry_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_track_entry_likes_count ON track_diary_likes;
CREATE TRIGGER trg_track_entry_likes_count
AFTER INSERT OR DELETE ON track_diary_likes
FOR EACH ROW EXECUTE FUNCTION update_track_entry_likes_count();

CREATE OR REPLACE FUNCTION update_track_entry_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE track_diary_entries SET comments_count = comments_count + 1 WHERE id = NEW.entry_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE track_diary_entries SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.entry_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_track_entry_comments_count ON track_diary_comments;
CREATE TRIGGER trg_track_entry_comments_count
AFTER INSERT OR DELETE ON track_diary_comments
FOR EACH ROW EXECUTE FUNCTION update_track_entry_comments_count();

-- track_diary_entry_stats reste en place avec la même forme (entry_id,
-- likes_count, comments_count) pour que le code applicatif existant
-- (feed.ts, track-diary.ts, diary.ts) n'ait rien à changer — seule sa
-- source passe d'un recalcul GROUP BY à une lecture directe des colonnes.
-- L'ancienne vue retournait des bigint (résultat de COUNT(*)) — CREATE OR
-- REPLACE VIEW interdit de changer le type d'une colonne, d'où le DROP.
DROP VIEW IF EXISTS track_diary_entry_stats;
CREATE VIEW track_diary_entry_stats AS
SELECT id AS entry_id, likes_count::bigint AS likes_count, comments_count::bigint AS comments_count
FROM track_diary_entries;

-- ── user_lists (likes sur les listes) ────────────────────────

ALTER TABLE user_lists ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;

UPDATE user_lists ul
SET likes_count = (SELECT COUNT(*) FROM list_likes l WHERE l.list_id = ul.id);

CREATE OR REPLACE FUNCTION update_list_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_lists SET likes_count = likes_count + 1 WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_lists SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_list_likes_count ON list_likes;
CREATE TRIGGER trg_list_likes_count
AFTER INSERT OR DELETE ON list_likes
FOR EACH ROW EXECUTE FUNCTION update_list_likes_count();
