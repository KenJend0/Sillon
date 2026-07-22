-- Seed beta users (SQL Editor version)
--
-- IMPORTANT:
-- 1) Create the 20 auth users first in Supabase Auth (Dashboard > Authentication > Users)
--    with emails: <username>@seed.sillon.local
--    (password can be the same for all users)
-- 2) Then run this script in SQL Editor.
--
-- This script will:
-- - upsert profiles for those auth users
-- - ensure artists/albums exist
-- - reset old diary entries for these seed users
-- - insert ~15 diary entries per user (1-3 reviews max)

BEGIN;

-- ----------
-- 1) Seed users catalog
-- ----------
CREATE TEMP TABLE tmp_seed_users (
  username text primary key,
  bio text,
  style text,
  created_at date,
  email text
) ON COMMIT DROP;

INSERT INTO tmp_seed_users (username, bio, style, created_at, email) VALUES
('ruefroide', 'je note surtout le rap fr qui traine pas partout', 'rap_fr_underground', '2025-01-12', 'ruefroide@seed.sillon.local'),
('lucas_music', 'jecoute un peu de tout', 'mainstream', '2025-01-20', 'lucas_music@seed.sillon.local'),
('lostinaudio', 'je cherche des trucs un peu partout', 'global_digger', '2025-01-05', 'lostinaudio@seed.sillon.local'),
('nightvibes', 'musique pour le soir', 'rnb_chill', '2025-01-18', 'nightvibes@seed.sillon.local'),
('filmsonics', 'les bandes originales c est la vie', 'soundtracks', '2025-01-10', 'filmsonics@seed.sillon.local'),
('ldnflow', 'uk rap and grime', 'uk', '2025-01-08', 'ldnflow@seed.sillon.local'),
('indienight', 'indie and alt vibes', 'indie', '2025-01-15', 'indienight@seed.sillon.local'),
('emma', 'jecoute surtout en voiture', 'casual', '2025-01-25', 'emma@seed.sillon.local'),
('caliente', 'reggaeton and latino', 'latino', '2025-01-10', 'caliente@seed.sillon.local'),
('popdiary', 'pop lover', 'pop', '2025-01-18', 'popdiary@seed.sillon.local'),
('hardears', 'note severe', 'critic', '2025-01-05', 'hardears@seed.sillon.local'),
('nightpulse', 'electronic only', 'electro', '2025-01-12', 'nightpulse@seed.sillon.local'),
('oldrecords', 'jazz and classics', 'classic', '2025-01-07', 'oldrecords@seed.sillon.local'),
('sunwave', 'afrobeats lover', 'afro', '2025-01-20', 'sunwave@seed.sillon.local'),
('antoine', 'rap fr plus un peu de tout', 'fr_casual', '2025-01-22', 'antoine@seed.sillon.local'),
('soundtracklife', 'film music only', 'soundtrack', '2025-01-09', 'soundtracklife@seed.sillon.local'),
('guitars', 'rock only', 'rock', '2025-01-06', 'guitars@seed.sillon.local'),
('softvoice', 'rnb feminin', 'rnb', '2025-01-14', 'softvoice@seed.sillon.local'),
('leo', '', 'random', '2025-01-28', 'leo@seed.sillon.local'),
('noah', '', 'minimal', '2025-01-30', 'noah@seed.sillon.local');

-- ----------
-- 2) Resolve auth users and create profiles
-- ----------
CREATE TEMP TABLE tmp_seed_user_ids (
  user_id uuid primary key,
  username text,
  bio text,
  style text,
  created_at date
) ON COMMIT DROP;

INSERT INTO tmp_seed_user_ids (user_id, username, bio, style, created_at)
SELECT au.id, su.username, su.bio, su.style, su.created_at
FROM tmp_seed_users su
JOIN auth.users au ON lower(au.email) = lower(su.email);

-- Warn if users are missing in auth.users
DO $$
DECLARE
  expected_count int;
  found_count int;
BEGIN
  SELECT count(*) INTO expected_count FROM tmp_seed_users;
  SELECT count(*) INTO found_count FROM tmp_seed_user_ids;
  IF found_count < expected_count THEN
    RAISE NOTICE 'Only %/% auth users found. Create missing users in Auth Dashboard first.', found_count, expected_count;
  END IF;
END $$;

INSERT INTO profiles (id, username, display_name, bio, created_at)
SELECT
  s.user_id,
  s.username,
  s.username,
  s.bio,
  (s.created_at::text || ' 10:00:00+00')::timestamptz
FROM tmp_seed_user_ids s
ON CONFLICT (id) DO UPDATE
SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio;

-- ----------
-- 3) Album pool (style-driven)
-- ----------
CREATE TEMP TABLE tmp_seed_albums (
  style text,
  title text,
  artist text,
  base_rating int,
  review_hint text
) ON COMMIT DROP;

INSERT INTO tmp_seed_albums (style, title, artist, base_rating, review_hint) VALUES
('rap_fr_underground', 'Bitume Caviar, Vol. 01', 'Prince Waly', 9, 'no skip'),
('rap_fr_underground', 'ERRR', 'La Feve', 8, 'bonne energie'),
('rap_fr_underground', 'Trinity', 'Laylow', 9, 'tres coherent'),
('rap_fr_underground', 'Ipseite', 'Damso', 9, 'tres solide'),
('rap_fr_underground', 'JVLIVS II', 'SCH', 8, 'bonne prod'),
('rap_fr_underground', 'NQNT 2', 'Vald', 8, 'bon replay'),

('mainstream', 'Astroworld', 'Travis Scott', 8, 'gros replay value'),
('mainstream', 'After Hours', 'The Weeknd', 9, 'hyper clean'),
('mainstream', 'SOS', 'SZA', 8, 'tres solide'),
('mainstream', 'Take Care', 'Drake', 8, 'classique efficace'),
('mainstream', 'Future Nostalgia', 'Dua Lipa', 8, 'beaucoup de hits'),
('mainstream', '1989', 'Taylor Swift', 7, 'super efficace'),

('global_digger', 'Untrue', 'Burial', 9, 'atmosphere unique'),
('global_digger', 'Clube da Esquina', 'Milton Nascimento', 9, 'immense classique'),
('global_digger', 'El Mal Querer', 'Rosalia', 8, 'idee forte'),
('global_digger', 'Blue Lines', 'Massive Attack', 8, 'bonne texture'),
('global_digger', 'MM..FOOD', 'MF DOOM', 9, 'detail incroyable'),
('global_digger', 'Renaissance', 'Beyonce', 7, 'fun global'),

('rnb_chill', 'WASTELAND', 'Brent Faiyaz', 9, 'ultra smooth'),
('rnb_chill', 'Gemini Rights', 'Steve Lacy', 8, 'vibe du soir'),
('rnb_chill', 'Ctrl', 'SZA', 8, 'parfait la nuit'),
('rnb_chill', 'Freudian', 'Daniel Caesar', 9, 'tres propre'),
('rnb_chill', 'Lahai', 'Sampha', 9, 'super voix'),
('rnb_chill', 'A Seat at the Table', 'Solange', 8, 'classe'),

('soundtracks', 'La La Land', 'Justin Hurwitz', 10, 'incroyable du debut a la fin'),
('soundtracks', 'Interstellar', 'Hans Zimmer', 9, 'score enorme'),
('soundtracks', 'Inception', 'Hans Zimmer', 8, 'ambiance forte'),
('soundtracks', 'Oppenheimer', 'Ludwig Goransson', 9, 'immersion totale'),
('soundtracks', 'Spirited Away', 'Joe Hisaishi', 10, 'chef doeuvre'),
('soundtracks', 'Arrival', 'Johann Johannsson', 8, 'minimal et fort'),

('uk', 'Psychodrama', 'Dave', 9, 'classique UK'),
('uk', 'Konnichiwa', 'Skepta', 8, 'bonne energie grime'),
('uk', '23', 'Central Cee', 7, 'efficace'),
('uk', 'Made in the Manor', 'Kano', 9, 'très solide'),
('uk', 'Heavy Is the Head', 'Stormzy', 8, 'bon impact'),
('uk', 'Alpha Place', 'Knucks', 8, 'bon storytelling'),

('indie', 'AM', 'Arctic Monkeys', 8, 'toujours efficace'),
('indie', 'Currents', 'Tame Impala', 9, 'vibe forte'),
('indie', 'Is This It', 'The Strokes', 8, 'classique indie'),
('indie', 'Melodrama', 'Lorde', 9, 'tres bien ecrit'),
('indie', 'In Rainbows', 'Radiohead', 10, 'incontournable'),
('indie', 'Punisher', 'Phoebe Bridgers', 8, 'fin de soiree parfaite'),

('casual', 'Starboy', 'The Weeknd', 8, 'ca passe tout seul'),
('casual', 'Future Nostalgia', 'Dua Lipa', 7, 'bon en voiture'),
('casual', '1989', 'Taylor Swift', 7, 'facile a ecouter'),
('casual', 'Fine Line', 'Harry Styles', 8, 'bonne surprise'),
('casual', 'SOUR', 'Olivia Rodrigo', 8, 'tres efficace'),
('casual', '21', 'Adele', 8, 'voix top'),

('latino', 'YHLQMDLG', 'Bad Bunny', 9, 'energie haute'),
('latino', 'Un Verano Sin Ti', 'Bad Bunny', 8, 'tres solide'),
('latino', 'Motomami', 'Rosalia', 8, 'bonne prise de risque'),
('latino', 'DATA', 'Tainy', 8, 'bonne prod'),
('latino', 'Vibras', 'J Balvin', 8, 'gros mood'),
('latino', 'x100PRE', 'Bad Bunny', 8, 'toujours efficace'),

('pop', 'Midnights', 'Taylor Swift', 8, 'beaucoup de bons hooks'),
('pop', 'Future Nostalgia', 'Dua Lipa', 9, 'que des bangers'),
('pop', 'Born This Way', 'Lady Gaga', 8, 'fort en energie'),
('pop', 'Emotion', 'Carly Rae Jepsen', 9, 'imparable'),
('pop', 'BRAT', 'Charli XCX', 9, 'ultra accrocheur'),
('pop', 'Pure Heroine', 'Lorde', 8, 'vieillit bien'),

('critic', 'Astroworld', 'Travis Scott', 6, 'propre mais trop long'),
('critic', 'UTOPIA', 'Travis Scott', 5, 'execution inegale'),
('critic', 'After Hours', 'The Weeknd', 7, 'bonne tenue'),
('critic', 'Scorpion', 'Drake', 5, 'trop de remplissage'),
('critic', 'DAMN.', 'Kendrick Lamar', 8, 'solide'),
('critic', 'For All the Dogs', 'Drake', 5, 'peu marquant'),

('electro', 'Discovery', 'Daft Punk', 9, 'classique electro'),
('electro', 'Random Access Memories', 'Daft Punk', 8, 'propre'),
('electro', 'Untrue', 'Burial', 9, 'immersion top'),
('electro', 'In Colour', 'Jamie xx', 9, 'mix parfait'),
('electro', 'Cross', 'Justice', 8, 'energie brute'),
('electro', 'Alive 2007', 'Daft Punk', 10, 'energie folle'),

('classic', 'Kind of Blue', 'Miles Davis', 10, 'intemporel'),
('classic', 'A Love Supreme', 'John Coltrane', 9, 'essentiel'),
('classic', 'Blue Train', 'John Coltrane', 9, 'superbe'),
('classic', 'Mingus Ah Um', 'Charles Mingus', 9, 'magnifique'),
('classic', 'Time Out', 'The Dave Brubeck Quartet', 8, 'classe'),
('classic', 'Sketches of Spain', 'Miles Davis', 9, 'grand disque'),

('afro', 'African Giant', 'Burna Boy', 9, 'energie stable'),
('afro', 'Made in Lagos', 'Wizkid', 8, 'vibe propre'),
('afro', 'Twice As Tall', 'Burna Boy', 8, 'solide'),
('afro', 'Rave and Roses', 'Rema', 8, 'bon groove'),
('afro', 'Timeless', 'Davido', 8, 'plein de gros morceaux'),
('afro', 'L.I.F.E', 'Burna Boy', 8, 'bonne constance'),

('fr_casual', 'Feu', 'Nekfeu', 8, 'tres solide'),
('fr_casual', 'Trinity', 'Laylow', 9, 'bonne ambiance'),
('fr_casual', 'Ipseite', 'Damso', 9, 'toujours fort'),
('fr_casual', 'Civilisation', 'Orelsan', 8, 'bien ecrit'),
('fr_casual', 'Mauvais Ordre', 'Lomepal', 7, 'bonne surprise'),
('fr_casual', 'Racine Carree', 'Stromae', 8, 'ultra propre'),

('soundtrack', 'Interstellar', 'Hans Zimmer', 10, 'intouchable'),
('soundtrack', 'Inception', 'Hans Zimmer', 9, 'gros impact'),
('soundtrack', 'Dune', 'Hans Zimmer', 8, 'ambiance dense'),
('soundtrack', 'The Batman', 'Michael Giacchino', 8, 'bonne tension'),
('soundtrack', 'Spirited Away', 'Joe Hisaishi', 10, 'masterpiece'),
('soundtrack', 'The Social Network', 'Trent Reznor and Atticus Ross', 8, 'tres propre'),

('rock', 'Nevermind', 'Nirvana', 9, 'toujours une claque'),
('rock', 'Back in Black', 'AC/DC', 8, 'efficace'),
('rock', 'The Dark Side of the Moon', 'Pink Floyd', 10, 'majeur'),
('rock', 'Led Zeppelin IV', 'Led Zeppelin', 9, 'indispensable'),
('rock', 'OK Computer', 'Radiohead', 9, 'enorme'),
('rock', 'In Rainbows', 'Radiohead', 9, 'toujours excellent'),

('rnb', 'Ctrl', 'SZA', 9, 'tres classe'),
('rnb', 'SOS', 'SZA', 8, 'super propre'),
('rnb', 'Heaux Tales', 'Jazmine Sullivan', 9, 'beaucoup de personnalite'),
('rnb', 'A Seat at the Table', 'Solange', 9, 'classe absolue'),
('rnb', 'The Miseducation of Lauryn Hill', 'Lauryn Hill', 10, 'intouchable'),
('rnb', 'Lahai', 'Sampha', 9, 'incroyable voix'),

('random', 'AM', 'Arctic Monkeys', 7, 'bon partout'),
('random', 'After Hours', 'The Weeknd', 8, 'bien produit'),
('random', 'DAMN.', 'Kendrick Lamar', 8, 'toujours solide'),
('random', 'Discovery', 'Daft Punk', 8, 'fun'),
('random', 'Interstellar', 'Hans Zimmer', 9, 'grosse ambiance'),
('random', 'Blonde', 'Frank Ocean', 8, 'vraiment beau'),

('minimal', 'Thriller', 'Michael Jackson', 9, 'classique total'),
('minimal', 'Random Access Memories', 'Daft Punk', 8, 'propre'),
('minimal', '1989', 'Taylor Swift', 7, 'simple et efficace'),
('minimal', 'After Hours', 'The Weeknd', 8, 'ca marche'),
('minimal', 'Kind of Blue', 'Miles Davis', 9, 'excellent'),
('minimal', 'La La Land', 'Justin Hurwitz', 9, 'tres agreable');

-- ----------
-- 4) Ensure artists/albums exist
-- ----------
INSERT INTO artists (name)
SELECT DISTINCT sa.artist
FROM tmp_seed_albums sa
LEFT JOIN artists a ON a.name = sa.artist
WHERE a.id IS NULL;

INSERT INTO albums (artist_id, title)
SELECT a.id, sa.title
FROM tmp_seed_albums sa
JOIN artists a ON a.name = sa.artist
LEFT JOIN albums al ON al.artist_id = a.id AND al.title = sa.title
WHERE al.id IS NULL;

-- ----------
-- 5) Reset diary entries for seed users (idempotent rerun)
-- ----------
DELETE FROM diary_entries de
USING tmp_seed_user_ids su
WHERE de.user_id = su.user_id;

-- ----------
-- 6) Insert ~15 logs per user
-- ----------
WITH candidate_pool AS (
  SELECT
    su.user_id,
    su.username,
    su.style AS user_style,
    su.created_at AS user_created_at,
    sa.style AS album_style,
    sa.title,
    sa.artist,
    sa.base_rating,
    sa.review_hint,
    row_number() OVER (
      PARTITION BY su.user_id
      ORDER BY (CASE WHEN sa.style = su.style THEN 1 ELSE 0 END) DESC, random()
    ) AS rn
  FROM tmp_seed_user_ids su
  CROSS JOIN tmp_seed_albums sa
),
selected AS (
  SELECT *
  FROM candidate_pool
  WHERE rn <= 15
),
resolved AS (
  SELECT
    s.user_id,
    s.username,
    s.user_style,
    s.rn,
    s.base_rating,
    s.review_hint,
    al.id AS album_id,
    (
      '2025-02-01 20:00:00+00'::timestamptz
      + ((s.rn - 1) * 3 + (random() * 1)::int) * interval '1 day'
      + ((random() * 4)::int - 2) * interval '1 hour'
    ) AS listened_at
  FROM selected s
  JOIN artists a ON a.name = s.artist
  JOIN albums al ON al.artist_id = a.id AND al.title = s.title
)
INSERT INTO diary_entries (
  user_id,
  album_id,
  listened_at,
  rating,
  review_body,
  is_public,
  created_at
)
SELECT
  r.user_id,
  r.album_id,
  r.listened_at,
  LEAST(10, GREATEST(5, r.base_rating + ((random() * 2)::int - 1)))::int AS rating,
  CASE
    -- max 3 reviews per user
    WHEN r.rn IN (2, 7, 12) AND random() > 0.25 THEN r.review_hint
    ELSE NULL
  END AS review_body,
  true,
  r.listened_at
FROM resolved r;

COMMIT;

-- Quick check
SELECT
  p.username,
  COUNT(*) AS logs,
  COUNT(*) FILTER (WHERE COALESCE(de.review_body, '') <> '') AS reviews
FROM diary_entries de
JOIN profiles p ON p.id = de.user_id
WHERE p.username IN (SELECT username FROM tmp_seed_users)
GROUP BY p.username
ORDER BY p.username;
