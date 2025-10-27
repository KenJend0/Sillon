-- Activer les extensions nécessaires (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- ok si déjà présent, sinon ignoré

-- Créer la table (clé primaire générée via gen_random_uuid)
CREATE TABLE IF NOT EXISTS diary_entries (
                                             id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    album_id     UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,

    listened_at  DATE NOT NULL DEFAULT CURRENT_DATE,
    re_listen    BOOLEAN NOT NULL DEFAULT FALSE,

    rating       SMALLINT CHECK (rating BETWEEN 1 AND 10),
    review_title TEXT,
    review_body  TEXT,
    is_public    BOOLEAN NOT NULL DEFAULT TRUE,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

-- Dédup douce : 1 entrée par user/album/jour
CREATE UNIQUE INDEX IF NOT EXISTS uq_diary_user_album_day
    ON diary_entries (user_id, album_id, listened_at);

-- Index utiles
CREATE INDEX IF NOT EXISTS ix_diary_user_date
    ON diary_entries (user_id, listened_at DESC);

CREATE INDEX IF NOT EXISTS ix_diary_album_date
    ON diary_entries (album_id, listened_at DESC);

-- Auto-maintien de updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_diary_updated_at ON diary_entries;
CREATE TRIGGER set_diary_updated_at
    BEFORE UPDATE ON diary_entries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
