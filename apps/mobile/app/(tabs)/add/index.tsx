import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AddQueueMobile from '../../../components/add/AddQueueMobile';
import { buildAddQueue, type AddQueueItem } from '../../../lib/buildAddQueue';
import { getDefaultListAlbums, getDefaultListTracks, getUnratedSavedItems } from '../../../lib/lists';

/**
 * Miroir mobile de apps/web/app/add/page.tsx (fetch parallèle + buildAddQueue),
 * branché sur AddQueueMobile (pile swipeable). Mode dégradé Phase 6.4 : les tiers
 * "Suggestion pour toi"/"À découvrir" (Phase 7, pas encore commencée côté mobile)
 * sont passés vides — voir docs/MOBILE_ROADMAP.md (notes de scope 6.4). Comme sur le
 * web, la file est construite une seule fois à l'arrivée sur l'écran (pas de refetch
 * à chaque focus d'onglet) — AddQueueMobile gère ensuite tout l'état localement.
 */
export default function AddScreen() {
  const [queue, setQueue] = useState<AddQueueItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getUnratedSavedItems(), getDefaultListAlbums(8), getDefaultListTracks(8)]).then(
      ([unratedSaved, listAlbums, listTracks]) => {
        if (cancelled) return;
        setQueue(
          buildAddQueue({
            unratedSaved,
            listAlbums,
            listTracks,
            forYouAlbums: [],
            forYouTracks: [],
            discoveryAlbums: [],
          })
        );
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  if (!queue) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#1C1C1C" />
      </View>
    );
  }

  return <AddQueueMobile initialQueue={queue} />;
}
