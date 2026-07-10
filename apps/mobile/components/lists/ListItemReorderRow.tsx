import { Pressable, Text, View } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { CoverImage } from '../album/CoverImage';
import { labelStyle } from '../../lib/typography';
import type { ListItem } from '../../lib/lists';

type Props = {
  item: ListItem;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
};

/**
 * Mode "Réorganiser" mobile — flèches haut/bas plutôt qu'un drag-and-drop
 * (@dnd-kit/sortable, web, est DOM-only et react-native-draggable-flatlist n'est pas
 * installé). Décision de scope documentée dans docs/MOBILE_ROADMAP.md : construire le
 * drag à la main avec Gesture Handler + Reanimated aurait ajouté un risque de régression
 * (gestes en conflit avec le ScrollView parent) pour un gain marginal — l'ordre reste
 * pleinement modifiable, juste un geste par cran au lieu d'un glissement continu.
 */
export function ListItemReorderRow({ item, onMoveUp, onMoveDown, isFirst, isLast }: Props) {
  const isTrack = !!item.track_id && !!item.track;
  const data = isTrack ? item.track! : item.album!;

  return (
    <View className="flex-row items-center gap-3 p-2.5 bg-background-secondary rounded-input">
      <View className="w-10 h-10 rounded-badge overflow-hidden bg-background-tertiary relative flex-shrink-0">
        {data.cover_url ? (
          <CoverImage src={data.cover_url} style={{ width: '100%', height: '100%' }} placeholder={<View className="w-full h-full bg-background-tertiary" />} />
        ) : (
          <View className="w-full h-full bg-background-tertiary" />
        )}
      </View>
      <View className="flex-1 min-w-0">
        <Text numberOfLines={1} className="text-text-primary" style={{ fontFamily: 'Inter_500Medium', fontSize: 13 }}>
          {data.title}
        </Text>
        <Text numberOfLines={1} className="text-text-tertiary" style={labelStyle}>{data.artist}</Text>
      </View>
      <View style={{ gap: 2 }}>
        <Pressable onPress={onMoveUp} disabled={isFirst} hitSlop={6} style={{ opacity: isFirst ? 0.3 : 1 }}>
          <ChevronUp size={16} color="#6B6B6B" />
        </Pressable>
        <Pressable onPress={onMoveDown} disabled={isLast} hitSlop={6} style={{ opacity: isLast ? 0.3 : 1 }}>
          <ChevronDown size={16} color="#6B6B6B" />
        </Pressable>
      </View>
    </View>
  );
}
