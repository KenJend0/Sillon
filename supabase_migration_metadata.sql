-- ============================================================
-- WAVEFORM — Migration : Metadata (genres, album_genres, album_metadata)
-- À exécuter via le Supabase SQL Editor (une seule fois en production)
-- ============================================================

-- ============================================================
-- 1. GENRES
-- Liste normalisée de tags/genres musicaux (lowercase)
-- ============================================================
CREATE TABLE IF NOT EXISTS genres (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,  -- ex: "indie rock", "jazz"
    slug TEXT UNIQUE NOT NULL   -- ex: "indie-rock", "jazz"
);

-- ============================================================
-- 2. ALBUM_GENRES
-- Relation many-to-many album <-> genre avec source et poids
-- ============================================================
CREATE TABLE IF NOT EXISTS album_genres (
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    source   TEXT NOT NULL CHECK (source IN ('lastfm', 'musicbrainz')),
    weight   INTEGER NOT NULL DEFAULT 1,  -- nombre de votes ou rang inversé
    PRIMARY KEY (album_id, genre_id)
);

CREATE INDEX IF NOT EXISTS idx_album_genres_album_id ON album_genres(album_id);
CREATE INDEX IF NOT EXISTS idx_album_genres_genre_id  ON album_genres(genre_id);

-- ============================================================
-- 3. ALBUM_METADATA
-- Métadonnées étendues par album : description, lien Last.fm
-- ============================================================
CREATE TABLE IF NOT EXISTS album_metadata (
    album_id        UUID PRIMARY KEY REFERENCES albums(id) ON DELETE CASCADE,
    description     TEXT,
    description_src TEXT CHECK (description_src IN ('lastfm', 'wikipedia')),
    lastfm_url      TEXT,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS : lecture publique, écriture service-role uniquement
-- ============================================================
ALTER TABLE genres         ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_genres   ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "genres_select"         ON genres         FOR SELECT USING (true);
CREATE POLICY "album_genres_select"   ON album_genres   FOR SELECT USING (true);
CREATE POLICY "album_metadata_select" ON album_metadata FOR SELECT USING (true);
