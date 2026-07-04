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
