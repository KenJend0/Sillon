-- Migration: Add likes & comments tables for track diary entries
-- Run this in the Supabase SQL editor
-- (track_diary_entries already exists from the previous migration)

-- 1. Likes
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

-- 2. Commentaires
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

-- 3. Vue stats likes/comments par entrée
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
