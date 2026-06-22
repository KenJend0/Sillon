-- Sélection personnelle du créateur — section éditoriale permanente sur /explore.
-- Gestion manuelle via l'éditeur SQL Supabase (pas d'interface admin pour l'instant) :
--
--   INSERT INTO curator_picks (album_id, curator_id, note)
--   VALUES ('<album_uuid>', '<ton_user_id>', 'Ton mot sur l''album, à la première personne.');
--
-- L'affichage prend toujours la dernière entrée créée — ajoute une nouvelle ligne
-- pour changer la sélection, pas besoin de supprimer l'ancienne (elle reste en historique).

CREATE TABLE IF NOT EXISTS curator_picks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id    UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  curator_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE curator_picks ENABLE ROW LEVEL SECURITY;

-- Lecture publique — c'est un contenu éditorial visible par tous les profils.
-- Pas de policy d'écriture : la gestion se fait via l'éditeur SQL (service role), pas depuis l'app.
CREATE POLICY "public read curator picks"
  ON curator_picks FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS curator_picks_created_at_idx
  ON curator_picks (created_at DESC);
