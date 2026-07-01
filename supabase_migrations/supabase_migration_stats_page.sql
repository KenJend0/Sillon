-- Migration: optimisations pour la page /me/stats

-- 1. Index partiel sur album_stats_mat pour la requête "angles morts"
--    Permet un index scan trié par avg_rating DESC sur les albums avec listeners_count >= 5,
--    évite le full scan + sort sur la vue matérialisée.
CREATE INDEX IF NOT EXISTS idx_album_stats_mat_rated
  ON public.album_stats_mat (avg_rating DESC)
  WHERE listeners_count >= 5;


-- 2. Fonction RPC get_angles_morts
--    Fusionne les deux allers-retours JS (album_stats_mat → puis albums)
--    en une seule requête SQL avec NOT EXISTS sur diary_entries.
CREATE OR REPLACE FUNCTION public.get_angles_morts(
  p_user_id      uuid,
  p_min_rating   numeric  DEFAULT 7.0,
  p_min_listeners integer DEFAULT 5,
  p_limit        integer  DEFAULT 5
)
RETURNS TABLE (
  id          uuid,
  title       text,
  artist_name text,
  cover_url   text,
  mbid        uuid,
  avg_rating  numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.title,
    ar.name   AS artist_name,
    a.cover_url,
    a.mbid,
    s.avg_rating
  FROM album_stats_mat s
  JOIN albums  a  ON a.id  = s.album_id
  JOIN artists ar ON ar.id = a.artist_id
  WHERE s.avg_rating    >= p_min_rating
    AND s.listeners_count >= p_min_listeners
    AND NOT EXISTS (
      SELECT 1
      FROM diary_entries de
      WHERE de.user_id  = p_user_id
        AND de.album_id = s.album_id
    )
  ORDER BY s.avg_rating DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_angles_morts(uuid, numeric, integer, integer)
  TO authenticated, anon, service_role;
