-- Create public covers bucket for album artwork
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  5242880,  -- 5 MB max per image
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read covers (public bucket)
CREATE POLICY "covers_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

-- Only service role can upload (bypasses RLS anyway, but explicit is clearer)
-- Uploads happen server-side via supabaseAdmin (service_role key)
