-- ============================================================
-- Migration : Import historique externe (Last.fm, RateYourMusic)
-- À exécuter dans le dashboard Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS external_imports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    source          TEXT NOT NULL CHECK (source IN ('lastfm', 'rym')),
    source_label    TEXT NOT NULL, -- pseudo Last.fm ou nom du fichier RYM
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matching', 'done', 'failed')),
    raw_items       JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_items     INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    matched_count   INTEGER NOT NULL DEFAULT 0,
    failed_count    INTEGER NOT NULL DEFAULT 0,
    list_id         UUID REFERENCES user_lists(id) ON DELETE SET NULL, -- utilisé uniquement pour source='lastfm'
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_external_imports_user_source_created ON external_imports(user_id, source, created_at);

ALTER TABLE external_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "external_imports_select" ON external_imports;
CREATE POLICY "external_imports_select" ON external_imports
    FOR SELECT USING (user_id = auth.uid());

-- Écriture exclusivement via le service role (server actions) — pas d'insert/update direct côté client.
