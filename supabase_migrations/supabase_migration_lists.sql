-- ============================================================
-- Migration : Feature Listes
-- À exécuter dans le dashboard Supabase → SQL Editor
-- Remplace le système saved_albums par un système de listes
-- ============================================================

-- 1. Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS user_lists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    is_public   BOOLEAN NOT NULL DEFAULT false,
    is_default  BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantit une seule liste "default" par user
CREATE UNIQUE INDEX IF NOT EXISTS user_lists_one_default
    ON user_lists(user_id) WHERE is_default = true;

CREATE TABLE IF NOT EXISTS list_items (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id   UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
    album_id  UUID REFERENCES albums(id) ON DELETE CASCADE,
    track_id  UUID REFERENCES tracks(id) ON DELETE CASCADE,
    position  INTEGER,
    added_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Un item = album OU titre, pas les deux
    CONSTRAINT list_items_one_type CHECK (
        (album_id IS NOT NULL)::int + (track_id IS NOT NULL)::int = 1
    )
);

-- Unicité partielle : pas de doublon album par liste
CREATE UNIQUE INDEX IF NOT EXISTS list_items_album_unique
    ON list_items(list_id, album_id) WHERE album_id IS NOT NULL;

-- Unicité partielle : pas de doublon titre par liste
CREATE UNIQUE INDEX IF NOT EXISTS list_items_track_unique
    ON list_items(list_id, track_id) WHERE track_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_lists_user_id ON user_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_album_id ON list_items(album_id);
CREATE INDEX IF NOT EXISTS idx_list_items_track_id ON list_items(track_id);

-- 2. RLS
-- ============================================================

ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

-- user_lists : lecture si public ou propriétaire
DROP POLICY IF EXISTS "user_lists_select" ON user_lists;
CREATE POLICY "user_lists_select" ON user_lists
    FOR SELECT USING (is_public = true OR user_id = auth.uid());

-- user_lists : écriture uniquement pour le propriétaire
DROP POLICY IF EXISTS "user_lists_insert" ON user_lists;
CREATE POLICY "user_lists_insert" ON user_lists
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_lists_update" ON user_lists;
CREATE POLICY "user_lists_update" ON user_lists
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_lists_delete" ON user_lists;
CREATE POLICY "user_lists_delete" ON user_lists
    FOR DELETE USING (user_id = auth.uid() AND is_default = false);

-- list_items : lecture si la liste est publique ou si l'utilisateur en est propriétaire
DROP POLICY IF EXISTS "list_items_select" ON list_items;
CREATE POLICY "list_items_select" ON list_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_lists ul
            WHERE ul.id = list_items.list_id
            AND (ul.is_public = true OR ul.user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "list_items_insert" ON list_items;
CREATE POLICY "list_items_insert" ON list_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_lists ul
            WHERE ul.id = list_items.list_id AND ul.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "list_items_delete" ON list_items;
CREATE POLICY "list_items_delete" ON list_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_lists ul
            WHERE ul.id = list_items.list_id AND ul.user_id = auth.uid()
        )
    );

-- 3. Migration des données existantes
-- ============================================================

-- Créer la liste "À écouter" par défaut pour TOUS les utilisateurs existants
INSERT INTO user_lists (user_id, title, is_public, is_default)
SELECT id, 'À écouter', false, true
FROM profiles
ON CONFLICT DO NOTHING;

-- Migrer les saved_albums dans la liste par défaut
INSERT INTO list_items (list_id, album_id, added_at)
SELECT ul.id, sa.album_id, sa.saved_at
FROM saved_albums sa
JOIN user_lists ul ON ul.user_id = sa.user_id AND ul.is_default = true
ON CONFLICT DO NOTHING;

-- ============================================================
-- Note : saved_albums est conservé intact pour l'instant.
-- Il peut être supprimé une fois la migration validée.
-- ============================================================
