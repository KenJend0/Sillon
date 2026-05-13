-- ============================================================
-- WAVEFORM — Migration : votes genres communautaires
-- A exécuter via le Supabase SQL Editor
-- ============================================================

-- 1. Autoriser 'community' comme source dans album_genres
ALTER TABLE album_genres
    DROP CONSTRAINT IF EXISTS album_genres_source_check;

ALTER TABLE album_genres
    ADD CONSTRAINT album_genres_source_check
    CHECK (source IN ('lastfm', 'musicbrainz', 'community'));

-- 2. Table de votes (1 vote par user par album par genre)
CREATE TABLE IF NOT EXISTS album_genre_votes (
    user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    album_id UUID NOT NULL REFERENCES albums(id)     ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES genres(id)     ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, album_id, genre_id)
);

-- 3. RLS
ALTER TABLE album_genre_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des votes" ON album_genre_votes
    FOR SELECT USING (true);

CREATE POLICY "Utilisateurs gèrent leurs propres votes" ON album_genre_votes
    FOR ALL USING (auth.uid() = user_id);
