-- ============================================================
-- SILLON — Migration : track_metadata
-- Liens streaming par titre (Spotify, Apple Music, Deezer)
-- À exécuter via le Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS track_metadata (
    track_id        UUID PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
    spotify_url     TEXT,
    apple_music_url TEXT,
    deezer_url      TEXT,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_track_metadata_fetched_at ON track_metadata(fetched_at);

-- ── RLS : lecture publique, écriture service-role uniquement ──
-- (le service role bypasse RLS nativement — même pattern que album_metadata)
ALTER TABLE track_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "track_metadata_select" ON track_metadata
    FOR SELECT USING (true);
