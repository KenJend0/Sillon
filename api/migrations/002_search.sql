-- Assure-toi que pg_trgm est actif (déjà fait normalement)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index trigram (si pas déjà faits dans 001)
CREATE INDEX IF NOT EXISTS idx_trgm_artists_name ON artists USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trgm_albums_title ON albums  USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trgm_tracks_title ON tracks  USING GIN (title gin_trgm_ops);

-- Optionnel : petit boost de perf sur correspondances exactes
CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album  ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id);
