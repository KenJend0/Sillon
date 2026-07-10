import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CoverImage } from './CoverImage';

type Props = {
  album: {
    id: string;
    title: string;
    coverSrc: string | null;
    coverFallback?: string;
  };
  year?: number | null;
  trackCount?: number;
  avgRating?: number | null;
  width?: number;
  /** Remplace la navigation par défaut vers /albums/[id] — utilisé pour les releases
   *  MusicBrainz pas encore en DB (déclenche l'import au lieu de naviguer). */
  onPress?: () => void;
  /** Affiche un spinner par-dessus la cover et désactive le tap (import en cours). */
  importing?: boolean;
};

export function AlbumCard({ album, year, trackCount, avgRating, width = 160, onPress, importing }: Props) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => !importing && (onPress ? onPress() : router.push(`/albums/${album.id}`))}
      style={{ width, opacity: importing ? 0.6 : 1 }}
    >
      <View className="rounded-input overflow-hidden bg-background-secondary aspect-square">
        {album.coverSrc ? (
          <CoverImage
            src={album.coverSrc}
            fallback={album.coverFallback}
            style={{ width: '100%', height: '100%' }}
            placeholder={<CoverPlaceholder />}
          />
        ) : (
          <CoverPlaceholder />
        )}
        {importing && (
          <View className="absolute inset-0 items-center justify-center bg-black/20">
            <ActivityIndicator size="small" color="#F5F3EF" />
          </View>
        )}
        {avgRating != null && (
          <View className="absolute top-2 right-2 bg-[#1C1C1C] rounded-button px-2 py-1">
            <Text className="text-[11px] text-[#F5F3EF]" style={{ fontFamily: 'Inter_500Medium' }}>
              {avgRating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
      <Text
        numberOfLines={2}
        className="mt-3 text-sm text-text-warm"
        style={{ fontFamily: 'InstrumentSerif_400Regular' }}
      >
        {album.title}
      </Text>
      <Text className="text-[11px] text-text-secondary mt-1" style={{ fontFamily: 'Inter_400Regular' }}>
        {[year, trackCount ? `${trackCount} titre${trackCount !== 1 ? 's' : ''}` : null]
          .filter(Boolean)
          .join(' · ')}
      </Text>
    </Pressable>
  );
}

function CoverPlaceholder() {
  return (
    <View className="w-full h-full items-center justify-center">
      <Text className="text-2xl text-text-tertiary">♪</Text>
    </View>
  );
}
