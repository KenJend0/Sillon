-- ML Tables — Sillon Recommender System
-- Run this in the Supabase SQL editor.
-- These tables store precomputed ML results written by the Python batch pipeline.

-- 1. User rating vectors (mean-centered, one row per user)
CREATE TABLE IF NOT EXISTS user_taste_vectors (
  user_id      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  vector       FLOAT[]  NOT NULL,   -- mean-centered rating vector, one value per album in album_index
  album_index  JSONB    NOT NULL,   -- { "album_uuid": position_int, ... } — maps album_id to vector index
  n_ratings    INT      NOT NULL DEFAULT 0,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_taste_vectors ENABLE ROW LEVEL SECURITY;

-- Users can read their own vector; service_role writes
CREATE POLICY "users read own vector"
  ON user_taste_vectors FOR SELECT
  USING (auth.uid() = user_id);

-- 2. User-user cosine similarity (top-N neighbours per user)
CREATE TABLE IF NOT EXISTS user_similarity (
  user_a      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score       FLOAT NOT NULL CHECK (score >= 0 AND score <= 1),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a <> user_b)
);

ALTER TABLE user_similarity ENABLE ROW LEVEL SECURITY;

-- Public read (used for "taste match %" on public profiles)
CREATE POLICY "public read similarity"
  ON user_similarity FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS user_similarity_user_a_score_idx
  ON user_similarity (user_a, score DESC);

-- 3. Precomputed recommendations per user
CREATE TABLE IF NOT EXISTS user_recommendations (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  album_id    UUID NOT NULL REFERENCES albums(id)   ON DELETE CASCADE,
  score       FLOAT NOT NULL,
  method      TEXT  NOT NULL,   -- 'cosine_cf' | 'content_genre' | 'hybrid'
  rank        INT   NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, album_id)
);

ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own recs"
  ON user_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_recommendations_user_rank_idx
  ON user_recommendations (user_id, rank);

-- 4. Offline evaluation metrics
CREATE TABLE IF NOT EXISTS recommendation_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method        TEXT  NOT NULL,
  k             INT   NOT NULL,
  precision_at_k FLOAT,
  recall_at_k    FLOAT,
  ndcg_at_k      FLOAT,
  n_users        INT,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recommendation_metrics ENABLE ROW LEVEL SECURITY;

-- Public read — données agrégées non sensibles.
-- La vérification admin réelle est faite côté app (ADMIN_USER_IDS env var).
CREATE POLICY "public read metrics"
  ON recommendation_metrics FOR SELECT
  USING (true);
