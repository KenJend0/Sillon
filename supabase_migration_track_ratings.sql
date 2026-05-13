-- Migration: Add track diary entries (track-level ratings)
-- Run this in the Supabase SQL editor

-- 1. Table principale : track_diary_entries
CREATE TABLE IF NOT EXISTS track_diary_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id    uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  album_id    uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  artist_id   uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  rating      smallint CHECK (rating >= 0 AND rating <= 10),
  review_title text,
  review_body text,
  listened_at date NOT NULL DEFAULT CURRENT_DATE,
  is_public   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id, listened_at)
);

-- 2. Trigger updated_at (update_updated_at() est définie dans supabase_schema.sql)
CREATE TRIGGER trg_track_diary_entries_updated_at
  BEFORE UPDATE ON track_diary_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Index pour performance
CREATE INDEX IF NOT EXISTS idx_track_diary_entries_track_id   ON track_diary_entries(track_id);
CREATE INDEX IF NOT EXISTS idx_track_diary_entries_user_id    ON track_diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_track_diary_entries_album_id   ON track_diary_entries(album_id);
CREATE INDEX IF NOT EXISTS idx_track_diary_entries_created_at ON track_diary_entries(created_at DESC);

-- 4. RLS
ALTER TABLE track_diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "track_diary_select_public_or_owner" ON track_diary_entries
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "track_diary_insert_owner" ON track_diary_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "track_diary_update_owner" ON track_diary_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "track_diary_delete_owner" ON track_diary_entries
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Vue stats par titre
CREATE OR REPLACE VIEW track_stats AS
SELECT
  track_id,
  COUNT(*) FILTER (WHERE rating IS NOT NULL)                   AS ratings_count,
  ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL), 1)      AS avg_rating,
  COUNT(DISTINCT user_id)                                      AS listeners_count
FROM track_diary_entries
GROUP BY track_id;

-- 6. Likes sur les entrées track diary
CREATE TABLE IF NOT EXISTS track_diary_likes (
  entry_id   uuid NOT NULL REFERENCES track_diary_entries(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_track_diary_likes_entry_id ON track_diary_likes(entry_id);
CREATE INDEX IF NOT EXISTS idx_track_diary_likes_user_id  ON track_diary_likes(user_id);

ALTER TABLE track_diary_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "track_diary_likes_read"   ON track_diary_likes FOR SELECT USING (true);
CREATE POLICY "track_diary_likes_insert" ON track_diary_likes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "track_diary_likes_delete" ON track_diary_likes FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 7. Commentaires sur les entrées track diary
CREATE TABLE IF NOT EXISTS track_diary_comments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id          uuid NOT NULL REFERENCES track_diary_entries(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body              text NOT NULL,
  parent_comment_id uuid REFERENCES track_diary_comments(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_track_diary_comments_entry_id ON track_diary_comments(entry_id);
CREATE INDEX IF NOT EXISTS idx_track_diary_comments_user_id  ON track_diary_comments(user_id);

ALTER TABLE track_diary_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "track_diary_comments_read"   ON track_diary_comments FOR SELECT USING (true);
CREATE POLICY "track_diary_comments_insert" ON track_diary_comments FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "track_diary_comments_delete" ON track_diary_comments FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 8. Vue stats likes/comments par entrée
CREATE OR REPLACE VIEW track_diary_entry_stats AS
SELECT
  e.id AS entry_id,
  COALESCE(l.likes_count, 0)    AS likes_count,
  COALESCE(c.comments_count, 0) AS comments_count
FROM track_diary_entries e
LEFT JOIN (
  SELECT entry_id, COUNT(*) AS likes_count FROM track_diary_likes GROUP BY entry_id
) l ON l.entry_id = e.id
LEFT JOIN (
  SELECT entry_id, COUNT(*) AS comments_count FROM track_diary_comments GROUP BY entry_id
) c ON c.entry_id = e.id;
