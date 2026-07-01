-- Migration : couverture personnalisée pour les listes
-- Ajoute custom_cover_url sur user_lists + bucket Supabase Storage list-covers

ALTER TABLE user_lists
  ADD COLUMN IF NOT EXISTS custom_cover_url text;

-- Bucket Storage (public, pas de TTL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('list-covers', 'list-covers', true)
ON CONFLICT (id) DO NOTHING;
