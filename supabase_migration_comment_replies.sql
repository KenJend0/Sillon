-- Migration: Add parent_comment_id to diary_comments for reply threading
-- Run this in the Supabase SQL editor

-- 1. Add parent_comment_id column (nullable FK to diary_comments.id)
ALTER TABLE diary_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid
    REFERENCES diary_comments(id) ON DELETE CASCADE;

-- 2. Index for fast fetching of replies by parent
CREATE INDEX IF NOT EXISTS idx_diary_comments_parent
  ON diary_comments(parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;

-- 3. Only allow 1 level of nesting: replies cannot themselves have a parent
--    (enforced via a check constraint using a subquery is not portable in Postgres,
--     so we enforce this at the application layer instead)
