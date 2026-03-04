-- ============================================================
-- MIGRATION: Full-text search vectors
-- À appliquer via l'éditeur SQL du dashboard Supabase
-- ============================================================
--
-- Ajoute des colonnes tsvector générées automatiquement sur albums
-- et artists pour permettre la recherche plein texte avec
-- websearch_to_tsquery('english', ...).
--
-- La config 'english' :
--   - met tout en minuscules + stemming anglais (run/runs/running → run)
--   - supprime les stopwords (the, a, of…)
--   - meilleur recall pour les noms d'albums/artistes en anglais
--
-- Les index GIN assurent des recherches O(log n) même sur une grande table.
-- ============================================================

-- Albums
ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_albums_search_vector
  ON albums USING gin(search_vector);

-- Artists
ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_artists_search_vector
  ON artists USING gin(search_vector);
