-- ============================================================
-- Migration : skipped_count sur external_imports
-- À exécuter dans le dashboard Supabase → SQL Editor
--
-- Distingue les items déjà présents dans le journal (ignorés, pas de note
-- écrasée) des items réellement nouvellement ajoutés (matched_count) — le
-- compteur "matched" mélangeait jusqu'ici les deux, ce qui rendait le rapport
-- final de l'import trompeur ("X matchés" incluait des doublons silencieux).
-- ============================================================

ALTER TABLE external_imports ADD COLUMN IF NOT EXISTS skipped_count INTEGER NOT NULL DEFAULT 0;
