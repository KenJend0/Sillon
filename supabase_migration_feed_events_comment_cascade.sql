-- Migration: cascade-delete feed_events when a diary_comment is deleted
-- Run this in the Supabase SQL editor

ALTER TABLE feed_events
  DROP CONSTRAINT feed_events_comment_id_fkey;

ALTER TABLE feed_events
  ADD CONSTRAINT feed_events_comment_id_fkey
  FOREIGN KEY (comment_id)
  REFERENCES diary_comments(id)
  ON DELETE CASCADE;
