-- ============================================================
-- Migration : supprime les likes sur les listes, ne garde que les
-- sauvegardes (saved_lists) comme seul signal de popularité — plus
-- pertinent pour des listes que des likes.
-- À exécuter dans le dashboard Supabase → SQL Editor.
-- ============================================================

-- ── Suppression du like ──────────────────────────────────────

DROP TRIGGER IF EXISTS trg_list_likes_count ON list_likes;
DROP FUNCTION IF EXISTS update_list_likes_count();
DROP TABLE IF EXISTS list_likes;

ALTER TABLE user_lists DROP COLUMN IF EXISTS likes_count;

-- ── Compteur dénormalisé sur les sauvegardes (remplace likes_count
-- comme métrique de popularité pour le tri de /lists et /explore) ──

ALTER TABLE user_lists ADD COLUMN IF NOT EXISTS saves_count INT NOT NULL DEFAULT 0;

UPDATE user_lists ul
SET saves_count = (SELECT COUNT(*) FROM saved_lists s WHERE s.list_id = ul.id);

CREATE OR REPLACE FUNCTION update_list_saves_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_lists SET saves_count = saves_count + 1 WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_lists SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_list_saves_count ON saved_lists;
CREATE TRIGGER trg_list_saves_count
AFTER INSERT OR DELETE ON saved_lists
FOR EACH ROW EXECUTE FUNCTION update_list_saves_count();
