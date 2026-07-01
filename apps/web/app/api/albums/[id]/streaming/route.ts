import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fetchAlbumStreamingLinks } from "@/app/actions/metadata";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createSupabaseServer();

    // Check DB first — if links already cached, return immediately
    const { data: meta } = await supabase
        .from("album_metadata")
        .select("spotify_url, apple_music_url, deezer_url")
        .eq("album_id", id)
        .maybeSingle();

    if (meta?.spotify_url || meta?.apple_music_url || meta?.deezer_url) {
        return NextResponse.json({
            spotify: meta.spotify_url ?? null,
            appleMusic: meta.apple_music_url ?? null,
            deezer: meta.deezer_url ?? null,
        });
    }

    // Need to fetch from external APIs — get album + artist info
    const { data: album } = await supabase
        .from("albums")
        .select("id, title, mbid, artist_id")
        .eq("id", id)
        .maybeSingle();

    if (!album?.mbid) {
        return NextResponse.json({ spotify: null, appleMusic: null, deezer: null });
    }

    const { data: artist } = await supabase
        .from("artists")
        .select("name")
        .eq("id", album.artist_id)
        .maybeSingle();

    if (!artist?.name) {
        return NextResponse.json({ spotify: null, appleMusic: null, deezer: null });
    }

    try {
        const links = await fetchAlbumStreamingLinks(album.id, album.mbid, artist.name, album.title);
        return NextResponse.json({
            spotify: links.spotify ?? null,
            appleMusic: links.appleMusic ?? null,
            deezer: links.deezer ?? null,
        });
    } catch {
        return NextResponse.json({ spotify: null, appleMusic: null, deezer: null });
    }
}
