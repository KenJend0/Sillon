import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/serverRateLimit';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req);
  if (limited) return limited;

  const albumId = req.nextUrl.searchParams.get('albumId');
  if (!albumId || !UUID_RE.test(albumId)) {
    return NextResponse.json({ ready: false });
  }

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('album_metadata')
    .select('fetched_at, spotify_url, apple_music_url, deezer_url')
    .eq('album_id', albumId)
    .maybeSingle();

  // fetched_at = enrichissement complet (cron nocturne, genres/description inclus).
  // Les liens streaming arrivent plus tôt via after() à l'import (voir
  // importAlbumFromMusicBrainz) et ne posent pas fetched_at — sinon le cron
  // croirait l'album déjà pleinement enrichi et ne le retraiterait jamais.
  const hasStreamingLink = !!(data?.spotify_url || data?.apple_music_url || data?.deezer_url);
  return NextResponse.json({ ready: !!data?.fetched_at || hasStreamingLink });
}
