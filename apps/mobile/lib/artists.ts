import { supabase } from './supabase';

export type SimilarArtist = {
  id: string | null; // null si pas dans notre DB
  name: string;
  imageUrl: string | null;
  mbid: string | null;
};

/**
 * Artistes similaires — délègue à l'Edge Function `similar-artists` (supabase/functions/
 * similar-artists), miroir de getSimilarArtists (web, apps/web/app/actions/artists.ts).
 * Last.fm exige une clé API secrète (LASTFM_API_KEY) jamais exposable côté mobile — la
 * fonction l'appelle server-side et retourne uniquement le résultat matché en DB. Échec
 * silencieux (liste vide) : jamais bloquant pour l'affichage de la page artiste.
 */
export async function getSimilarArtists(artistName: string, artistMbid: string | null): Promise<SimilarArtist[]> {
  try {
    const { data, error } = await supabase.functions.invoke('similar-artists', {
      body: { artistName, artistMbid },
    });
    if (error) return [];
    return (data?.artists as SimilarArtist[] | undefined) ?? [];
  } catch {
    return [];
  }
}
