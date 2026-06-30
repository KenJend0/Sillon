-- ============================================================
-- Migration : Artistes en featuring (album + piste)
-- À exécuter dans le dashboard Supabase → SQL Editor
-- ============================================================

-- joinphrase : séparateur MB exact précédant cet artiste ("&", "feat.", ",", "vs."...),
-- tel que renvoyé par l'artist-credit MusicBrainz — permet un rendu fidèle plutôt
-- qu'un "feat." générique pour tout le monde.
CREATE TABLE IF NOT EXISTS album_featured_artists (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id   UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    artist_id  UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL DEFAULT 0,
    joinphrase TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(album_id, artist_id)
);

CREATE TABLE IF NOT EXISTS track_featured_artists (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id   UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    artist_id  UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL DEFAULT 0,
    joinphrase TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(track_id, artist_id)
);

CREATE INDEX IF NOT EXISTS idx_album_featured_artists_album_id ON album_featured_artists(album_id);
CREATE INDEX IF NOT EXISTS idx_album_featured_artists_artist_id ON album_featured_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_track_featured_artists_track_id ON track_featured_artists(track_id);
CREATE INDEX IF NOT EXISTS idx_track_featured_artists_artist_id ON track_featured_artists(artist_id);

ALTER TABLE album_featured_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_featured_artists ENABLE ROW LEVEL SECURITY;

-- Lecture publique (comme albums/tracks) ; les écritures passent par le service role
-- (server actions d'import + script de backfill), pas par le client.
CREATE POLICY "album_featured_artists_select" ON album_featured_artists FOR SELECT USING (true);
CREATE POLICY "track_featured_artists_select" ON track_featured_artists FOR SELECT USING (true);
