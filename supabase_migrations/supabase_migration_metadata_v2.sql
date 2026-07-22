-- ============================================================
-- SILLON — Migration : album_metadata v2
-- Ajout des colonnes lastfm_listeners et lastfm_playcount
-- À exécuter via le Supabase SQL Editor
-- ============================================================

ALTER TABLE album_metadata
    ADD COLUMN IF NOT EXISTS lastfm_listeners INTEGER,
    ADD COLUMN IF NOT EXISTS lastfm_playcount  INTEGER;
