-- ============================================================
-- WAVEFORM — Migration : retry des tags/genres (album_metadata)
-- À exécuter via le Supabase SQL Editor (une seule fois en production)
--
-- Constat : Phase 1 d'enrich-missing.mjs ne traite que les albums jamais
-- tentés (aucune ligne album_metadata). Une fois tentée, une recherche de
-- tags qui échoue (rate-limit MusicBrainz, timeout Last.fm, clé API
-- absente sur ce run précis) reste figée à "0 tag" pour toujours — rien
-- ne la retente automatiquement, contrairement au streaming (Phase 2).
-- Observé en prod : forcer un nouvel essai manuel sur des albums déjà
-- "tentés" retrouve des tags pour ~31% d'entre eux (9/29), ce qui pointe
-- vers des échecs transitoires plutôt qu'une vraie absence de données.
--
-- Ces colonnes permettent une Phase de retry pour les tags, sur le même
-- modèle anti-boucle que streaming_attempts (cf. supabase_migration_streaming_retry_cap.sql).
-- ============================================================

ALTER TABLE album_metadata
  ADD COLUMN IF NOT EXISTS tag_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags_checked_at TIMESTAMPTZ;

-- tags_checked_at démarre à fetched_at pour les lignes existantes : elles ont
-- déjà été tentées une fois (au moment de l'enrichissement initial), donc le
-- cooldown du nouveau retry doit partir de cette première tentative et non de NULL
-- (NULL == "jamais tenté", ce qui les rendrait éligibles immédiatement en masse).
UPDATE album_metadata SET tags_checked_at = fetched_at WHERE tags_checked_at IS NULL;

CREATE INDEX IF NOT EXISTS album_metadata_tag_retry_idx
  ON album_metadata (tags_checked_at, tag_attempts);
