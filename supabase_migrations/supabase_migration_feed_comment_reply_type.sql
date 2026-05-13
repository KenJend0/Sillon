-- Migration: add 'comment_reply' to the feed_events type check constraint
-- Run this in the Supabase SQL editor

-- Drop the existing constraint, then recreate it with comment_reply added.
-- The exact allowed values below must match what was in the original constraint —
-- check with: SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'feed_events_type_check';

ALTER TABLE feed_events
  DROP CONSTRAINT feed_events_type_check;

ALTER TABLE feed_events
  ADD CONSTRAINT feed_events_type_check
  CHECK (type IN ('diary_entry', 'like', 'comment', 'follow', 'discover', 'comment_reply'));
