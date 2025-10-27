-- 0) Extensions présentes
SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto','citext','pg_trgm');

-- 1) Tables essentielles présentes
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN
                                ('users','follows','artists','albums','tracks','external_ids','listens','ratings','reviews')
ORDER BY 1;

-- 2) Contraintes UNIQUE mbid (doivent exister)
SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE conname IN ('uq_artists_mbid','uq_albums_mbid','uq_tracks_mbid')
ORDER BY table_name;

-- 3) Idempotence artistes/albums/tracks (aucun doublon MBID)
SELECT 'artists' AS t, COUNT(*) total, COUNT(mbid) with_mbid, COUNT(*) - COUNT(DISTINCT mbid) dupes_or_nulls
FROM artists
UNION ALL
SELECT 'albums', COUNT(*), COUNT(mbid), COUNT(*) - COUNT(DISTINCT mbid) FROM albums
UNION ALL
SELECT 'tracks', COUNT(*), COUNT(mbid), COUNT(*) - COUNT(DISTINCT mbid) FROM tracks;

-- 4) Référentiels cohérents (FK présentes)
SELECT COUNT(*) invalid_album_fk
FROM albums a LEFT JOIN artists ar ON ar.id = a.artist_id
WHERE ar.id IS NULL;

SELECT COUNT(*) invalid_track_fk
FROM tracks t
         LEFT JOIN artists ar ON ar.id = t.artist_id
         LEFT JOIN albums  al ON al.id = t.album_id
WHERE ar.id IS NULL OR al.id IS NULL;

-- 5) Comptage de l’album importé (remplace l'ID si besoin)
--   Tu peux récupérer l'albumId depuis /catalog/import
SELECT a.id, a.title, a.release_date, a.cover_url FROM albums a
WHERE a.id = '22d76a2d-b435-4e3a-b93e-33d2ffcb2845';

SELECT COUNT(*) AS track_count
FROM tracks WHERE album_id = '22d76a2d-b435-4e3a-b93e-33d2ffcb2845';

-- 6) external_ids présents pour artist/album/track
SELECT entity_type, source, COUNT(*) c
FROM external_ids
GROUP BY 1,2 ORDER BY 1,2;

--7) diary
SELECT d.listened_at, d.rating, d.review_title,
       a.title AS album, ar.name AS artist,
       u.display_name AS user
FROM diary_entries d
    JOIN albums a  ON a.id = d.album_id
    JOIN artists ar ON ar.id = a.artist_id
    JOIN users u   ON u.id = d.user_id
ORDER BY d.listened_at DESC, d.created_at DESC
    LIMIT 20;
