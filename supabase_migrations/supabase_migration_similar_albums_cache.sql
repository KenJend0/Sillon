-- Migration: similar_albums_cache
-- Cache des albums similaires calculés (TTL 24h)
-- Évite de recalculer l'algo (4 requêtes SQL) à chaque page view

CREATE TABLE IF NOT EXISTS similar_albums_cache (
  album_id    UUID PRIMARY KEY REFERENCES albums(id) ON DELETE CASCADE,
  similar_albums JSONB NOT NULL DEFAULT '[]',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index sur computed_at pour faciliter les purges futures
CREATE INDEX IF NOT EXISTS similar_albums_cache_computed_at_idx
  ON similar_albums_cache (computed_at);

-- RLS
ALTER TABLE similar_albums_cache ENABLE ROW LEVEL SECURITY;

-- Lecture publique (page album accessible sans auth)
CREATE POLICY "similar_albums_cache_read" ON similar_albums_cache
  FOR SELECT USING (true);

-- Écriture réservée au service role (server actions via createSupabaseAdmin)
CREATE POLICY "similar_albums_cache_write" ON similar_albums_cache
  FOR ALL USING (auth.role() = 'service_role');
