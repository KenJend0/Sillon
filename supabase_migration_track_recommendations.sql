-- Track recommendations — pipeline ML batch
-- Run in Supabase SQL editor after supabase_migration_ml_tables.sql

CREATE TABLE IF NOT EXISTS user_track_recommendations (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id    UUID NOT NULL REFERENCES tracks(id)   ON DELETE CASCADE,
  score       FLOAT NOT NULL,
  method      TEXT  NOT NULL,  -- 'cosine_cf'
  rank        INT   NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

ALTER TABLE user_track_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own track recs"
  ON user_track_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_track_recs_user_rank_idx
  ON user_track_recommendations (user_id, rank);
