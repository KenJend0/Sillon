import { NextRequest, NextResponse } from 'next/server';
import { enrichAlbumMetadata } from '@/app/actions/metadata';
import { createSupabaseAdmin } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/serverRateLimit';
import { uploadCoverToSupabase } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req);
  if (limited) return limited;

  try {
    const { albumId, mbid, title, artist } = await req.json();
    if (!albumId || !mbid || !title || !artist) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Vérifie que l'album existe avant d'enrichir
    const { data: album } = await supabase
      .from('albums')
      .select('id, cover_url, mbid')
      .eq('id', albumId)
      .maybeSingle();

    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    // Upload cover to Supabase Storage if it's still an external URL
    let coverUploaded = false;
    if (album.cover_url && album.mbid) {
      const storedUrl = await uploadCoverToSupabase(album.cover_url, album.mbid, supabase);
      if (storedUrl && storedUrl !== album.cover_url) {
        await supabase
          .from('albums')
          .update({ cover_url: storedUrl })
          .eq('id', albumId);
        coverUploaded = true;
      }
    }

    const result = await enrichAlbumMetadata(albumId, mbid, title, artist, true);

    return NextResponse.json({
      ok: true,
      coverUploaded,
      genres: result.genres,
      hasDescription: result.hasDescription,
      mbTagsRaw: result.mbTagsRaw,
      lfmTagsRaw: result.lfmTagsRaw,
      errors: result.errors,
    });
  } catch (err) {
    console.error('[/api/enrich] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
