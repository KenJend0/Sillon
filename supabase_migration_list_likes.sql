-- ============================================================
-- Migration : Likes sur les listes
-- À exécuter dans le dashboard Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS list_likes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    list_id    UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, list_id)
);

CREATE INDEX IF NOT EXISTS idx_list_likes_list_id ON list_likes(list_id);
CREATE INDEX IF NOT EXISTS idx_list_likes_user_id ON list_likes(user_id);

ALTER TABLE list_likes ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les likes (pour les compteurs)
CREATE POLICY "list_likes_select" ON list_likes FOR SELECT USING (true);

-- Seul l'auteur du like peut l'insérer
CREATE POLICY "list_likes_insert" ON list_likes
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Seul l'auteur du like peut le supprimer
CREATE POLICY "list_likes_delete" ON list_likes
    FOR DELETE USING (user_id = auth.uid());
