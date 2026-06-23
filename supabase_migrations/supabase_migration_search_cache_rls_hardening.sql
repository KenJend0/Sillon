-- ============================================================
-- Migration: harden search_cache RLS permissions
-- ============================================================
--
-- The cache is shared and non-sensitive, but its integrity matters:
-- authenticated users must not be able to inject, modify, or delete
-- results for every other user.
--
-- The application reads/writes this cache server-side via createSupabaseAdmin()
-- in frontend/app/actions/musicbrainz.ts. The service role bypasses RLS,
-- but the explicit policy below documents the intended boundary.
-- ============================================================

ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Keep read access for authenticated users.
DROP POLICY IF EXISTS "search_cache_read" ON search_cache;
CREATE POLICY "search_cache_read" ON search_cache
  FOR SELECT TO authenticated USING (true);

-- Remove direct writes from anon/authenticated clients.
DROP POLICY IF EXISTS "search_cache_write" ON search_cache;
DROP POLICY IF EXISTS "search_cache_update" ON search_cache;
DROP POLICY IF EXISTS "search_cache_delete" ON search_cache;

-- Writes are reserved for server/service-role jobs.
DROP POLICY IF EXISTS "search_cache_write_service" ON search_cache;
CREATE POLICY "search_cache_write_service" ON search_cache
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
