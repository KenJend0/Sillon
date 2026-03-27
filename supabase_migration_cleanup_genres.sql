-- ============================================================
-- WAVEFORM — Migration : nettoyage des genres parasites
-- À exécuter via le Supabase SQL Editor
-- ============================================================

-- Étape 1 : supprimer les album_genres liés aux genres à retirer
DELETE FROM album_genres WHERE genre_id IN (
  SELECT id FROM genres WHERE
    -- Années spécifiques (2025, 2022, 1966…) et décennies (70s, 80s, 60s, 90s)
    slug ~ '^\d{4}s?$'
    OR slug ~ '^\d{2}s$'
    OR slug IN (
      -- Noms d'artistes
      'ofwgkta', 'lauryn-hill', 'radiohead', 'zaho', 'sade', 'stevie-wonder',
      'buena-vista-social-club', 'johnny-hallyday', 'ennio-morricone',
      'michael-jackson', 'common', 'mf-doom', 'j-dilla',
      -- Tags d'opinion / méta
      'aoty', 'worst-album-ever', 'personal-favourites', 'favourite-albums',
      -- Pays / nationalités (pas des genres)
      'france', 'belgian', 'belgium', 'american', 'fr',
      -- Bruit pur
      'have-i-heard-you-before-with-dj-t', 'wsum-91-7-fm-madison',
      'mmmnmn', 'synth-fumk', 'kill-bill', 'short',
      'clinically-romantic',
      -- Redondants (on garde les versions slugifiées)
      'rhythm-and-blues', 'rhythm-blues', 'conscious', 'rap-fr'
    )
);

-- Étape 2 : supprimer les genres eux-mêmes
DELETE FROM genres WHERE
  slug ~ '^\d{4}s?$'
  OR slug ~ '^\d{2}s$'
  OR slug IN (
    'ofwgkta', 'lauryn-hill', 'radiohead', 'zaho', 'sade', 'stevie-wonder',
    'buena-vista-social-club', 'johnny-hallyday', 'ennio-morricone',
    'michael-jackson', 'common', 'mf-doom', 'j-dilla',
    'aoty', 'worst-album-ever', 'personal-favourites', 'favourite-albums',
    'france', 'belgian', 'belgium', 'american', 'fr',
    'have-i-heard-you-before-with-dj-t', 'wsum-91-7-fm-madison',
    'mmmnmn', 'synth-fumk', 'kill-bill', 'short',
    'clinically-romantic',
    'rhythm-and-blues', 'rhythm-blues', 'conscious', 'rap-fr'
  );

-- Étape 3 : genres orphelins (0 albums liés)
DELETE FROM genres WHERE id NOT IN (SELECT DISTINCT genre_id FROM album_genres);
