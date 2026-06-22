-- Recommendation feedback — bouton "Pas pour moi" sur les recos "Pour toi" (albums et titres)
-- Run this in the Supabase SQL editor.
--
-- Si la table recommendation_feedback existait déjà (version album_id seulement),
-- ce script la fait évoluer vers le schéma générique album_id OU track_id.
-- Si elle n'existe pas encore, il la crée directement dans sa forme finale.

CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  album_id    UUID REFERENCES albums(id) ON DELETE CASCADE,
  track_id    UUID REFERENCES tracks(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration de l'ancien schéma (album_id NOT NULL, PK composite) vers le nouveau —
-- sans effet si la table vient d'être créée ci-dessus dans sa forme finale.
ALTER TABLE recommendation_feedback ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE recommendation_feedback ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES tracks(id) ON DELETE CASCADE;
ALTER TABLE recommendation_feedback ALTER COLUMN id SET NOT NULL;

-- Remplace l'ancienne PK composite (user_id, album_id) par une PK sur id —
-- doit se faire AVANT de retirer NOT NULL sur album_id (Postgres interdit
-- de retirer NOT NULL sur une colonne qui fait encore partie d'une PK).
ALTER TABLE recommendation_feedback DROP CONSTRAINT IF EXISTS recommendation_feedback_pkey;
ALTER TABLE recommendation_feedback ADD CONSTRAINT recommendation_feedback_pkey PRIMARY KEY (id);

ALTER TABLE recommendation_feedback ALTER COLUMN album_id DROP NOT NULL;

ALTER TABLE recommendation_feedback DROP CONSTRAINT IF EXISTS recommendation_feedback_one_target;
ALTER TABLE recommendation_feedback ADD CONSTRAINT recommendation_feedback_one_target CHECK (
  (album_id IS NOT NULL AND track_id IS NULL) OR
  (album_id IS NULL AND track_id IS NOT NULL)
);

ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own feedback" ON recommendation_feedback;
CREATE POLICY "users manage own feedback"
  ON recommendation_feedback FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP INDEX IF EXISTS recommendation_feedback_user_idx;

CREATE UNIQUE INDEX IF NOT EXISTS recommendation_feedback_user_album_idx
  ON recommendation_feedback (user_id, album_id) WHERE album_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recommendation_feedback_user_track_idx
  ON recommendation_feedback (user_id, track_id) WHERE track_id IS NOT NULL;
