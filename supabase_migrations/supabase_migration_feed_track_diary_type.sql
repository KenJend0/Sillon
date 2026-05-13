-- Migration: add 'track_diary_entry', 'track_like', 'track_comment' to feed_events type check constraint
-- Run this in the Supabase SQL editor

ALTER TABLE feed_events
  DROP CONSTRAINT feed_events_type_check;

ALTER TABLE feed_events
  ADD CONSTRAINT feed_events_type_check
  CHECK (type IN (
    'diary_entry',
    'like',
    'comment',
    'follow',
    'discover',
    'comment_reply',
    'track_diary_entry',
    'track_like',
    'track_comment'
  ));
