import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { CoverImage } from '../album/CoverImage';
import { coverSrcWithFallback } from '../../lib/cover';
import { labelStyle } from '../../lib/typography';
import type { ListItem } from '../../lib/lists';

type Props = {
  item: ListItem;
  onRemove?: () => void;
};

/** Miroir fusionné de AlbumCard/TrackCard (ListPageContent, web) — une seule cellule grille. */
export function ListItemCard({ item, onRemove }: Props) {
  const router = useRouter();
  const isTrack = !!item.track_id && !!item.track;
  const data = isTrack ? item.track! : item.album!;
  const href = isTrack ? `/tracks/${data.id}` : `/albums/${data.id}`;
  const { src, fallback } = coverSrcWithFallback(data.mbid, data.cover_url);

  return (
    <View style={{ width: '48%' }}>
      <Pressable onPress={() => router.push(href as any)}>
        <View className="aspect-square rounded-input overflow-hidden bg-background-tertiary relative mb-2">
          {src ? (
            <CoverImage src={src} fallback={fallback} style={{ width: '100%', height: '100%' }} placeholder={<View className="w-full h-full bg-background-tertiary" />} />
          ) : (
            <View className="w-full h-full bg-background-tertiary items-center justify-center">
              {isTrack && <Text className="text-2xl text-text-disabled">♪</Text>}
            </View>
          )}
        </View>
        <Text numberOfLines={2} className="text-text-primary" style={{ fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 }}>
          {data.title}
        </Text>
        <Text numberOfLines={1} className="text-text-tertiary mt-0.5" style={labelStyle}>
          {data.artist}
        </Text>
      </Pressable>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/90 border border-border items-center justify-center"
        >
          <X size={11} color="#6B6B6B" />
        </Pressable>
      )}
    </View>
  );
}
