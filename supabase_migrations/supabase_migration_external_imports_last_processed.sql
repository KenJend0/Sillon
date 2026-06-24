-- ============================================================
-- Migration : last_processed_at sur external_imports
-- À exécuter dans le dashboard Supabase → SQL Editor
--
-- Permet au cron de reprise (scripts/process-external-imports.mjs) de
-- distinguer les imports stale (abandonnés, tab fermé) des imports
-- activement pollés côté client, pour ne jamais traiter la même ligne
-- en double depuis les deux côtés en même temps.
-- ============================================================

ALTER TABLE external_imports ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMPTZ;
