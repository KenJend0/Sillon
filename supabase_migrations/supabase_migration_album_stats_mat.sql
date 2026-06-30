-- ============================================================
-- Migration : rapatrie album_stats_mat dans les migrations trackées
-- + ajoute son mécanisme de rafraîchissement (absent jusqu'ici).
--
-- Contexte : cette vue matérialisée existe déjà en production (créée
-- manuellement, jamais migrée) et est lue par curator.ts/explore.ts.
-- Aucun pg_cron ni script ne la rafraîchissait — ses stats (avg_rating,
-- listeners_count) étaient potentiellement figées depuis sa création.
-- À exécuter dans le dashboard Supabase → SQL Editor.
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS album_stats_mat AS
SELECT
  album_id,
  round(avg(rating), 2) AS avg_rating,
  count(DISTINCT user_id) AS listeners_count
FROM diary_entries
WHERE rating IS NOT NULL
GROUP BY album_id;

-- Index unique requis pour pouvoir faire un REFRESH ... CONCURRENTLY
-- (évite de bloquer les lectures pendant le rafraîchissement).
CREATE UNIQUE INDEX IF NOT EXISTS idx_album_stats_mat_album_id
  ON album_stats_mat(album_id);

-- Fonction exposée en RPC pour permettre un refresh depuis l'extérieur
-- (GitHub Action via REST), sans dépendre de pg_cron.
CREATE OR REPLACE FUNCTION refresh_album_stats_mat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY album_stats_mat;
END;
$$;

-- Seul le service role (utilisé par les jobs serveur) peut déclencher le refresh.
REVOKE ALL ON FUNCTION refresh_album_stats_mat() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_album_stats_mat() TO service_role;
