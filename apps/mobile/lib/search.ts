// Recherche interne Supabase — miroir de searchInternal (apps/web/app/actions/search.ts).
// Pas de Server Action côté mobile : tourne client-side sous RLS, comme le reste de lib/.
import { supabase } from './supabase';

export type SearchResultUI = {
  id: string;
  releaseId?: string;
  recordingMbid?: string;
  title: string;
  subtitle?: string;
  slug?: string;
  kind: 'album' | 'artist' | 'user' | 'track';
  coverUrl?: string | null;
  releaseDate?: string | null;
  source: 'internal' | 'musicbrainz';
  score?: number;
  releaseCount?: number;
  trackAlbumId?: string;
  trackArtistId?: string;
};

export type SearchTab = 'albums' | 'artists' | 'tracks' | 'users';

/** Échappe % et _ pour l'ILIKE — évite les faux "wildcards" issus de la saisie utilisateur. */
function escapeILike(str: string): string {
  return str.replace(/[%_]/g, '\\$&');
}

interface AlbumRow {
  id: string;
  title: string;
  cover_url: string | null;
  release_date: string | null;
  artists: { name: string } | null;
}

interface ArtistRow {
  id: string;
  name: string;
  image_url: string | null;
}

interface ProfileRow {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface TrackRow {
  id: string;
  title: string;
  albums: {
    id: string;
    title: string;
    cover_url: string | null;
    artists: { id: string; name: string } | null;
  } | null;
  track_featured_artists: Array<{ position: number; artists: { name: string } | null }> | null;
}

export async function searchInternal(
  q: string,
  kind: 'all' | SearchTab = 'all',
  artist?: string
): Promise<SearchResultUI[]> {
  if (!q.trim()) return [];

  const trimmedArtist = artist?.trim();
  const escapedArtist = trimmedArtist ? escapeILike(trimmedArtist) : '';

  const trimmed = q.trim();
  // Enlève les accents pour la FTS (le tsvector stocké utilise immutable_unaccent()).
  const trimmedUnaccented = trimmed.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const escapedQuery = escapeILike(trimmed);

  // Full-text pour 3+ caractères, ILIKE en dessous (tokenisation peu fiable sur requêtes très courtes).
  const useTextSearch = trimmed.length >= 3;

  const albumsQuery = async () => {
    if (kind !== 'all' && kind !== 'albums') return { data: null as AlbumRow[] | null };
    if (useTextSearch) {
      const r = await supabase
        .from('albums')
        .select('id, title, cover_url, release_date, artists(name)')
        .neq('type', 'Single')
        .textSearch('search_vector', trimmedUnaccented, { type: 'websearch', config: 'simple' })
        .limit(5);
      if (!r.error) return r;
      // search_vector absente (migration pas encore appliquée) — fallback ILIKE
    }
    return supabase
      .from('albums')
      .select('id, title, cover_url, release_date, artists(name)')
      .neq('type', 'Single')
      .ilike('title', `%${escapedQuery}%`)
      .limit(5);
  };

  const artistsQuery = async () => {
    if (kind !== 'all' && kind !== 'artists') return { data: null as ArtistRow[] | null };
    if (useTextSearch) {
      const r = await (supabase
        .from('artists')
        .select('id, name, image_url') as any)
        .textSearch('search_vector', trimmedUnaccented, { type: 'websearch', config: 'simple' })
        .limit(5);
      if (!r.error) return r;
    }
    return (supabase
      .from('artists')
      .select('id, name, image_url') as any)
      .ilike('name', `%${escapedQuery}%`)
      .limit(5);
  };

  // Tracks: ILIKE sur le titre, jointure cover album + nom artiste. tracks.artist_id
  // (distinct de albums.artist_id) gère le cas Various Artists où l'interprète réel
  // du titre diffère de l'artiste crédité sur l'album.
  const tracksQuery = async () => {
    if (kind !== 'tracks') return { data: null as TrackRow[] | null };
    let artistIds: string[] | null = null;
    if (escapedArtist) {
      const { data: matchingArtists } = await supabase
        .from('artists')
        .select('id')
        .ilike('name', `%${escapedArtist}%`);
      artistIds = (matchingArtists || []).map((a) => a.id);
      if (artistIds.length === 0) {
        const { data: fuzzyArtists } = await supabase.rpc('fuzzy_search_artists', {
          query_text: trimmedArtist as string,
          result_limit: 5,
        });
        artistIds = ((fuzzyArtists as { id: string }[] | null) || []).map((a) => a.id);
      }
      if (artistIds.length === 0) return { data: [] as TrackRow[] };
    }
    let qb = supabase
      .from('tracks')
      .select('id, title, albums(id, title, cover_url, artists(id, name)), track_featured_artists(position, artists(name))')
      .ilike('title', `%${escapedQuery}%`);
    if (artistIds) {
      qb = qb.in('artist_id', artistIds);
    }
    return qb.limit(10) as any;
  };

  const [albumsData, artistsData, usersData, tracksData] = await Promise.all([
    albumsQuery(),
    artistsQuery(),
    (kind === 'all' || kind === 'users')
      ? supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .ilike('username', `%${escapedQuery}%`)
          .limit(5)
      : Promise.resolve({ data: null as ProfileRow[] | null }),
    tracksQuery(),
  ]);

  const results: SearchResultUI[] = [];

  (albumsData.data as AlbumRow[] | null)?.forEach((a) =>
    results.push({
      id: a.id,
      title: a.title,
      subtitle: a.artists?.name || 'Unknown Artist',
      kind: 'album',
      coverUrl: a.cover_url,
      releaseDate: a.release_date,
      source: 'internal',
    })
  );

  ((artistsData.data as ArtistRow[] | null) || []).forEach((a) =>
    results.push({
      id: a.id,
      title: a.name,
      kind: 'artist',
      coverUrl: a.image_url || null,
      source: 'internal',
    })
  );

  (usersData.data as ProfileRow[] | null)?.forEach((u) => {
    if (u.username) {
      const username = u.username.trim();
      results.push({
        id: u.id,
        title: username,
        slug: username,
        kind: 'user',
        coverUrl: u.avatar_url,
        source: 'internal',
      });
    }
  });

  const seenTrackKeys = new Set<string>();
  ((tracksData.data as TrackRow[] | null) || []).forEach((t) => {
    const album = t.albums;
    const artistOf = album?.artists;
    const dedupeKey = `${t.title.toLowerCase().trim()}|||${(artistOf?.name || '').toLowerCase().trim()}`;
    if (seenTrackKeys.has(dedupeKey)) return;
    seenTrackKeys.add(dedupeKey);
    const featuredNames = (t.track_featured_artists ?? [])
      .filter((f): f is { position: number; artists: { name: string } } => !!f.artists)
      .sort((a, b) => a.position - b.position)
      .map((f) => f.artists.name);
    const artistLabel = featuredNames.length > 0
      ? `${artistOf?.name || 'Unknown'} feat. ${featuredNames.join(', ')}`
      : artistOf?.name || 'Unknown';
    results.push({
      id: t.id,
      title: t.title,
      subtitle: `${artistLabel} · ${album?.title || 'Unknown'}`,
      kind: 'track',
      coverUrl: album?.cover_url || null,
      source: 'internal',
      trackAlbumId: album?.id || '',
      trackArtistId: artistOf?.id || '',
    });
  });

  // Fallback flou pg_trgm (typos type "Nirvarna" → "Nirvana") — seulement si les requêtes
  // primaires ne renvoient rien. Nécessite supabase_migration_trgm.sql.
  const needsAlbumFuzzy = (kind === 'all' || kind === 'albums') && !results.some((r) => r.kind === 'album');
  const needsArtistFuzzy = (kind === 'all' || kind === 'artists') && !results.some((r) => r.kind === 'artist');
  const needsTrackFuzzy = kind === 'tracks' && !results.some((r) => r.kind === 'track');

  if (needsAlbumFuzzy || needsArtistFuzzy || needsTrackFuzzy) {
    const [fuzzyAlbums, fuzzyArtists, fuzzyTracks] = await Promise.all([
      needsAlbumFuzzy
        ? supabase.rpc('fuzzy_search_albums', { query_text: trimmed, result_limit: 5 })
        : Promise.resolve({ data: null, error: null }),
      needsArtistFuzzy
        ? supabase.rpc('fuzzy_search_artists', { query_text: trimmed, result_limit: 5 })
        : Promise.resolve({ data: null, error: null }),
      needsTrackFuzzy
        ? supabase.rpc('fuzzy_search_tracks', { query_text: trimmed, result_limit: 10 })
        : Promise.resolve({ data: null, error: null }),
    ]);

    ((fuzzyAlbums.data as any[] | null) || []).forEach((a) =>
      results.push({
        id: a.id,
        title: a.title,
        subtitle: a.artist_name || 'Unknown Artist',
        kind: 'album',
        coverUrl: a.cover_url || null,
        releaseDate: a.release_date || null,
        source: 'internal',
      })
    );

    ((fuzzyArtists.data as any[] | null) || []).forEach((a) =>
      results.push({
        id: a.id,
        title: a.name,
        kind: 'artist',
        coverUrl: a.image_url || null,
        source: 'internal',
      })
    );

    ((fuzzyTracks.data as any[] | null) || []).forEach((t) => {
      const dedupeKey = `${t.title.toLowerCase().trim()}|||${(t.artist_name || '').toLowerCase().trim()}`;
      if (seenTrackKeys.has(dedupeKey)) return;
      seenTrackKeys.add(dedupeKey);
      results.push({
        id: t.id,
        title: t.title,
        subtitle: `${t.artist_name || 'Unknown'} · ${t.album_title || 'Unknown'}`,
        kind: 'track',
        coverUrl: t.album_cover || null,
        source: 'internal',
        trackAlbumId: t.album_id || '',
        trackArtistId: t.artist_id || '',
      });
    });
  }

  // Tri de similarité côté client : exact > commence-par > contient
  const qLower = trimmed.toLowerCase();
  results.sort((a, b) => {
    const rankOf = (t: string) => {
      if (t === qLower) return 3;
      if (t.startsWith(qLower)) return 2;
      return 1;
    };
    return rankOf(b.title.toLowerCase()) - rankOf(a.title.toLowerCase());
  });

  return results;
}
