import { supabase } from './supabase';

/**
 * Similarité par chevauchement de genres — miroir simplifié de getSimilarAlbums
 * (web, apps/web/app/actions/metadata.ts). Le cache 24h (similar_albums_cache) n'est
 * pas porté ici : son écriture passe par le client admin côté web (service_role),
 * jamais disponible côté mobile — on recalcule à chaque appel plutôt que de risquer
 * une erreur RLS silencieuse sur l'upsert.
 */
export type SimilarAlbum = {
  id: string;
  title: string;
  cover_url: string | null;
  mbid: string | null;
  year: number | null;
  artist: string;
  artistId: string | null;
};

export async function getSimilarAlbums(albumId: string, limit = 6): Promise<SimilarAlbum[]> {
  try {
    const { data: myAlbum } = await supabase.from('albums').select('artist_id').eq('id', albumId).maybeSingle();
    const sameArtistAlbumIds = new Set<string>();
    if (myAlbum?.artist_id) {
      const { data: sameArtistAlbums } = await supabase.from('albums').select('id').eq('artist_id', myAlbum.artist_id);
      for (const a of sameArtistAlbums ?? []) sameArtistAlbumIds.add(a.id);
    }

    const { data: myGenres } = await supabase
      .from('album_genres')
      .select('genre_id, weight')
      .eq('album_id', albumId)
      .order('weight', { ascending: false })
      .limit(6);

    if (!myGenres || myGenres.length === 0) return [];

    const genreIds = myGenres.map((g) => g.genre_id);
    const myWeightMap = new Map(myGenres.map((g) => [g.genre_id, g.weight]));

    const { data: rawCandidates } = await supabase
      .from('album_genres')
      .select('album_id, genre_id, weight')
      .in('genre_id', genreIds)
      .neq('album_id', albumId)
      .limit(500);

    const candidates = (rawCandidates ?? []).filter((c) => !sameArtistAlbumIds.has(c.album_id));
    if (candidates.length === 0) return [];

    const scoreMap = new Map<string, { score: number; shared: number }>();
    for (const c of candidates) {
      const myW = myWeightMap.get(c.genre_id) ?? 1;
      const entry = scoreMap.get(c.album_id) ?? { score: 0, shared: 0 };
      entry.score += myW * c.weight;
      entry.shared += 1;
      scoreMap.set(c.album_id, entry);
    }

    const topIds = [...scoreMap.entries()]
      .filter(([, { shared }]) => shared >= 2)
      .sort((a, b) => (b[1].shared !== a[1].shared ? b[1].shared - a[1].shared : b[1].score - a[1].score))
      .slice(0, limit)
      .map(([id]) => id);

    if (topIds.length === 0) return [];

    const { data: albums } = await supabase
      .from('albums')
      .select('id, title, cover_url, mbid, release_date, artist_id, artists(id, name)')
      .in('id', topIds);

    if (!albums) return [];

    return topIds
      .map((id) => {
        const a = albums.find((al) => al.id === id);
        if (!a) return null;
        const artistRel = a.artists as unknown as { id: string; name: string } | null;
        return {
          id: a.id,
          title: a.title,
          cover_url: a.cover_url,
          mbid: a.mbid,
          year: a.release_date ? new Date(a.release_date).getFullYear() : null,
          artist: artistRel?.name ?? 'Artiste inconnu',
          artistId: artistRel?.id ?? null,
        };
      })
      .filter((x): x is SimilarAlbum => x !== null);
  } catch (err) {
    console.error('getSimilarAlbums error:', err);
    return [];
  }
}
