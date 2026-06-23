-- ============================================================
-- Migration: harden track diary interactions RLS
-- ============================================================
--
-- track_diary_entries can be private. Child tables must therefore inherit
-- the same visibility boundary: an interaction is readable/creatable only
-- when its parent entry is public or owned by the current user.
-- ============================================================

ALTER TABLE track_diary_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_diary_comments ENABLE ROW LEVEL SECURITY;

-- Likes: read only when the parent entry is visible.
DROP POLICY IF EXISTS "track_diary_likes_read" ON track_diary_likes;
CREATE POLICY "track_diary_likes_read" ON track_diary_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM track_diary_entries entry
      WHERE entry.id = track_diary_likes.entry_id
        AND (entry.is_public = true OR entry.user_id = (SELECT auth.uid()))
    )
  );

-- Likes: users can like only visible entries, and only as themselves.
DROP POLICY IF EXISTS "track_diary_likes_insert" ON track_diary_likes;
CREATE POLICY "track_diary_likes_insert" ON track_diary_likes
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM track_diary_entries entry
      WHERE entry.id = track_diary_likes.entry_id
        AND (entry.is_public = true OR entry.user_id = (SELECT auth.uid()))
    )
  );

-- Comments: read only when the parent entry is visible.
DROP POLICY IF EXISTS "track_diary_comments_read" ON track_diary_comments;
CREATE POLICY "track_diary_comments_read" ON track_diary_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM track_diary_entries entry
      WHERE entry.id = track_diary_comments.entry_id
        AND (entry.is_public = true OR entry.user_id = (SELECT auth.uid()))
    )
  );

-- Comments: users can comment only on visible entries, and only as themselves.
DROP POLICY IF EXISTS "track_diary_comments_insert" ON track_diary_comments;
CREATE POLICY "track_diary_comments_insert" ON track_diary_comments
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM track_diary_entries entry
      WHERE entry.id = track_diary_comments.entry_id
        AND (entry.is_public = true OR entry.user_id = (SELECT auth.uid()))
    )
  );
