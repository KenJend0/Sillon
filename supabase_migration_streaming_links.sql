-- Add Apple Music and Deezer URL columns to album_metadata
ALTER TABLE album_metadata
  ADD COLUMN IF NOT EXISTS apple_music_url TEXT,
  ADD COLUMN IF NOT EXISTS deezer_url TEXT;
