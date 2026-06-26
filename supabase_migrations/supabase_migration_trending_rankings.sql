-- Migration: aggregate Explore trending rankings in Postgres
-- Run this in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION get_trending_albums(result_limit int DEFAULT 20)
RETURNS TABLE (
  album_id uuid,
  album_title text,
  artist_name text,
  cover_url text,
  activity_count int,
  unique_users int,
  reviews_count int,
  recent_unique_users int,
  trend_score double precision,
  delta int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      now() - interval '7 days' AS current_start,
      now() - interval '2 days' AS recent_start,
      now() - interval '8 days' AS previous_start,
      now() - interval '1 day' AS previous_end
  ),
  current_activity AS (
    SELECT
      de.album_id,
      count(*)::int AS activity_count,
      count(distinct de.user_id)::int AS unique_users,
      count(*) FILTER (WHERE de.review_body IS NOT NULL AND de.review_body <> '')::int AS reviews_count,
      count(distinct de.user_id) FILTER (WHERE de.created_at >= p.recent_start)::int AS recent_unique_users,
      max(de.created_at) AS latest_activity
    FROM diary_entries de
    CROSS JOIN params p
    WHERE de.created_at >= p.current_start
      AND de.is_public = true
    GROUP BY de.album_id
  ),
  current_scored AS (
    SELECT
      ca.*,
      (
        ca.unique_users * 3.0
        + ca.activity_count * 0.5
        + ca.reviews_count * 1.5
        + ca.recent_unique_users * 1.0
      )::double precision AS score
    FROM current_activity ca
  ),
  previous_activity AS (
    SELECT
      de.album_id,
      count(*)::int AS activity_count,
      count(distinct de.user_id)::int AS unique_users,
      count(*) FILTER (WHERE de.review_body IS NOT NULL AND de.review_body <> '')::int AS reviews_count,
      count(distinct de.user_id) FILTER (WHERE de.created_at >= (SELECT previous_end - interval '2 days' FROM params))::int AS recent_unique_users,
      max(de.created_at) AS latest_activity
    FROM diary_entries de
    CROSS JOIN params p
    WHERE de.created_at >= p.previous_start
      AND de.created_at < p.previous_end
      AND de.is_public = true
    GROUP BY de.album_id
  ),
  previous_scored AS (
    SELECT
      pa.*,
      (
        pa.unique_users * 3.0
        + pa.activity_count * 0.5
        + pa.reviews_count * 1.5
        + pa.recent_unique_users * 1.0
      )::double precision AS score
    FROM previous_activity pa
  ),
  previous_top AS (
    SELECT album_id, rank
    FROM (
      SELECT
        ps.album_id,
        row_number() OVER (
          ORDER BY ps.score DESC, ps.unique_users DESC, ps.activity_count DESC, ps.reviews_count DESC, ps.latest_activity DESC, ps.album_id
        )::int AS rank
      FROM previous_scored ps
    ) ranked
    WHERE rank <= result_limit
  ),
  current_top AS (
    SELECT
      cs.*,
      row_number() OVER (
        ORDER BY cs.score DESC, cs.unique_users DESC, cs.activity_count DESC, cs.reviews_count DESC, cs.latest_activity DESC, cs.album_id
      )::int AS rank
    FROM current_scored cs
  )
  SELECT
    ct.album_id,
    a.title AS album_title,
    ar.name AS artist_name,
    a.cover_url,
    ct.activity_count,
    ct.unique_users,
    ct.reviews_count,
    ct.recent_unique_users,
    ct.score AS trend_score,
    CASE WHEN pt.rank IS NULL THEN NULL ELSE pt.rank - ct.rank END AS delta
  FROM current_top ct
  JOIN albums a ON a.id = ct.album_id
  JOIN artists ar ON ar.id = a.artist_id
  LEFT JOIN previous_top pt ON pt.album_id = ct.album_id
  WHERE ct.rank <= result_limit
  ORDER BY ct.rank;
$$;

CREATE OR REPLACE FUNCTION get_trending_tracks(result_limit int DEFAULT 20)
RETURNS TABLE (
  track_id uuid,
  track_title text,
  artist_id uuid,
  artist_name text,
  album_id uuid,
  album_title text,
  cover_url text,
  avg_rating numeric,
  activity_count int,
  unique_users int,
  reviews_count int,
  recent_unique_users int,
  trend_score double precision,
  delta int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      now() - interval '7 days' AS current_start,
      now() - interval '2 days' AS recent_start,
      now() - interval '8 days' AS previous_start,
      now() - interval '1 day' AS previous_end
  ),
  current_activity AS (
    SELECT
      tde.track_id,
      count(*)::int AS activity_count,
      count(distinct tde.user_id)::int AS unique_users,
      count(*) FILTER (WHERE tde.review_body IS NOT NULL AND tde.review_body <> '')::int AS reviews_count,
      count(distinct tde.user_id) FILTER (WHERE tde.created_at >= p.recent_start)::int AS recent_unique_users,
      round((avg(tde.rating) FILTER (WHERE tde.rating IS NOT NULL))::numeric, 1) AS avg_rating,
      max(tde.created_at) AS latest_activity
    FROM track_diary_entries tde
    CROSS JOIN params p
    WHERE tde.created_at >= p.current_start
      AND tde.is_public = true
    GROUP BY tde.track_id
  ),
  current_scored AS (
    SELECT
      ca.*,
      (
        ca.unique_users * 3.0
        + ca.activity_count * 0.5
        + ca.reviews_count * 1.5
        + ca.recent_unique_users * 1.0
      )::double precision AS score
    FROM current_activity ca
  ),
  previous_activity AS (
    SELECT
      tde.track_id,
      count(*)::int AS activity_count,
      count(distinct tde.user_id)::int AS unique_users,
      count(*) FILTER (WHERE tde.review_body IS NOT NULL AND tde.review_body <> '')::int AS reviews_count,
      count(distinct tde.user_id) FILTER (WHERE tde.created_at >= (SELECT previous_end - interval '2 days' FROM params))::int AS recent_unique_users,
      max(tde.created_at) AS latest_activity
    FROM track_diary_entries tde
    CROSS JOIN params p
    WHERE tde.created_at >= p.previous_start
      AND tde.created_at < p.previous_end
      AND tde.is_public = true
    GROUP BY tde.track_id
  ),
  previous_scored AS (
    SELECT
      pa.*,
      (
        pa.unique_users * 3.0
        + pa.activity_count * 0.5
        + pa.reviews_count * 1.5
        + pa.recent_unique_users * 1.0
      )::double precision AS score
    FROM previous_activity pa
  ),
  previous_top AS (
    SELECT track_id, rank
    FROM (
      SELECT
        ps.track_id,
        row_number() OVER (
          ORDER BY ps.score DESC, ps.unique_users DESC, ps.activity_count DESC, ps.reviews_count DESC, ps.latest_activity DESC, ps.track_id
        )::int AS rank
      FROM previous_scored ps
    ) ranked
    WHERE rank <= result_limit
  ),
  current_top AS (
    SELECT
      cs.*,
      row_number() OVER (
        ORDER BY cs.score DESC, cs.unique_users DESC, cs.activity_count DESC, cs.reviews_count DESC, cs.latest_activity DESC, cs.track_id
      )::int AS rank
    FROM current_scored cs
  )
  SELECT
    ct.track_id,
    t.title AS track_title,
    ar.id AS artist_id,
    ar.name AS artist_name,
    a.id AS album_id,
    a.title AS album_title,
    a.cover_url,
    ct.avg_rating,
    ct.activity_count,
    ct.unique_users,
    ct.reviews_count,
    ct.recent_unique_users,
    ct.score AS trend_score,
    CASE WHEN pt.rank IS NULL THEN NULL ELSE pt.rank - ct.rank END AS delta
  FROM current_top ct
  JOIN tracks t ON t.id = ct.track_id
  JOIN albums a ON a.id = t.album_id
  JOIN artists ar ON ar.id = t.artist_id
  LEFT JOIN previous_top pt ON pt.track_id = ct.track_id
  WHERE ct.rank <= result_limit
  ORDER BY ct.rank;
$$;
