import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { showToast } from '../components/ui/Toast';

/**
 * Import d'un album MusicBrainz pas encore en DB, via l'Edge Function
 * import-musicbrainz (voir supabase/functions/import-musicbrainz), puis navigation
 * directe vers la page créée — même flux que SearchOverlay (components/layout/SearchOverlay.tsx)
 * et que le web : le tap déclenche l'import ET la redirection, pas d'étape de preview visible.
 *
 * Réutilisable partout où une release MusicBrainz est affichée à côté d'albums déjà
 * en DB (discographie artiste, "du même artiste"...).
 */
export function useMusicBrainzAlbumImport() {
  const router = useRouter();
  const { user } = useAuth();
  const [importingMbid, setImportingMbid] = useState<string | null>(null);

  const importAlbum = useCallback(
    async (mbid: string) => {
      if (!user) {
        showToast('Connecte-toi pour importer cet album', 'error');
        return;
      }
      setImportingMbid(mbid);
      try {
        const { data, error } = await supabase.functions.invoke('import-musicbrainz', {
          body: { kind: 'album', mbid },
        });
        if (!error && data?.success && data.albumId) {
          router.push((data.redirectUrl ?? `/albums/${data.albumId}`) as any);
        } else {
          showToast(data?.error || "Erreur lors de l'import", 'error');
        }
      } catch {
        showToast("Erreur lors de l'import", 'error');
      } finally {
        setImportingMbid(null);
      }
    },
    [user, router]
  );

  return { importingMbid, importAlbum };
}

/**
 * Import d'un artiste MusicBrainz pas encore en DB — même Edge Function, `kind: 'artist'`.
 * Contrairement au web (qui n'affiche jamais un artiste similaire hors DB, voir
 * ArtistPageContent.tsx), le mobile choisit de les rendre cliquables via ce hook
 * (ArtistSimilarSection) : import get-or-create (pas de tracklist à récupérer, plus léger
 * qu'un import d'album) puis navigation directe vers la page créée.
 */
export function useMusicBrainzArtistImport() {
  const router = useRouter();
  const { user } = useAuth();
  const [importingMbid, setImportingMbid] = useState<string | null>(null);

  const importArtist = useCallback(
    async (mbid: string, name: string) => {
      if (!user) {
        showToast('Connecte-toi pour accéder à cet artiste', 'error');
        return;
      }
      setImportingMbid(mbid);
      try {
        const { data, error } = await supabase.functions.invoke('import-musicbrainz', {
          body: { kind: 'artist', mbid, name },
        });
        if (!error && data?.success && data.artistId) {
          router.push(`/artists/${data.artistId}` as any);
        } else {
          showToast(data?.error || "Erreur lors de l'import de l'artiste", 'error');
        }
      } catch {
        showToast("Erreur lors de l'import de l'artiste", 'error');
      } finally {
        setImportingMbid(null);
      }
    },
    [user, router]
  );

  return { importingMbid, importArtist };
}
