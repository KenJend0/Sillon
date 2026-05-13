-- Migration: Allow actor to insert feed events for their followers
-- Fixes 23514 error when fanout inserts into followers' feeds
-- Context: the user-level client (with auth session) does the insert,
--          so auth.uid() = actor_id is a safe check.

CREATE POLICY "feed_insert_as_actor" ON feed_events
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = actor_id);
