-- ============================================================
-- MIGRATION: Product events beta dashboard
-- A appliquer via l'editeur SQL du dashboard Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NULL,
  event_name TEXT NOT NULL,
  surface TEXT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_product_events_created_at
  ON product_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_event_name_created_at
  ON product_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_user_id_created_at
  ON product_events(user_id, created_at DESC);

ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "product_events_read_own" ON product_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "product_events_insert_authenticated" ON product_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);