-- Sauvegarde de listes — bouton "sauvegarder" sur les cartes de listes communautaires.
-- Distinct du like : sauvegarder, c'est collectionner une liste pour la retrouver plus tard,
-- pas juste l'apprécier. Même modèle que saved_albums.

CREATE TABLE IF NOT EXISTS saved_lists (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    list_id  UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, list_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_lists_user_id ON saved_lists(user_id);

ALTER TABLE saved_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_lists_select_owner" ON saved_lists FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "saved_lists_insert_owner" ON saved_lists FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "saved_lists_delete_owner" ON saved_lists FOR DELETE USING ((SELECT auth.uid()) = user_id);
