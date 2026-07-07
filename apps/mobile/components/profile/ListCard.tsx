import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Lock, Bookmark } from 'lucide-react-native';
import { CoverImage } from '../album/CoverImage';
import type { ProfileListUI } from '../../lib/lists';
import { useListSave } from '../../lib/useListSave';
import { labelStyle } from '../../lib/typography';

type Props = {
  list: ProfileListUI;
  /** Remplace la largeur par défaut (48%, grille 2 colonnes) — utilisé par
   * ListCardWithMenu qui gère lui-même la largeur sur son conteneur englobant. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Miroir de ListCard (web) — grille de couvertures + titre, bouton sauvegarder (visible
 * seulement si list.is_public && !isOwnList, comme le web) et navigation vers /lists/[id]
 * (Phase 7 — remplace l'ancien toast "Bientôt disponible").
 */
export function ListCard({ list, style }: Props) {
  const router = useRouter();
  const covers = list.cover_urls.slice(0, 4);
  const { saved, isOwnList, toggleSave } = useListSave(list);

  return (
    <Pressable onPress={() => router.push(`/lists/${list.id}`)} style={style ?? { width: '48%' }}>
      <View className="aspect-square rounded-input overflow-hidden bg-background-tertiary flex-row flex-wrap">
        {covers.length === 0 ? (
          <View className="w-full h-full items-center justify-center">
            <Text className="text-2xl text-text-tertiary">♪</Text>
          </View>
        ) : (
          covers.map((url, i) => (
            <View key={i} style={{ width: covers.length > 1 ? '50%' : '100%', height: covers.length > 2 ? '50%' : '100%' }}>
              {url ? (
                <CoverImage src={url} style={{ width: '100%', height: '100%' }} placeholder={<View className="w-full h-full bg-background-tertiary" />} />
              ) : (
                <View className="w-full h-full bg-background-tertiary" />
              )}
            </View>
          ))
        )}
        {list.creator_username && (
          <View className="absolute top-2 left-2 flex-row items-center gap-1.5 bg-paper-hi/90 border border-border rounded-full pl-0.5 pr-2 py-0.5">
            <View className="rounded-full overflow-hidden border border-rule bg-accent/20" style={{ width: 18, height: 18 }}>
              {list.creator_avatar && (
                <Image source={{ uri: list.creator_avatar }} style={{ width: 18, height: 18 }} contentFit="cover" />
              )}
            </View>
            <Text numberOfLines={1} className="text-text-primary" style={{ fontFamily: 'Inter_500Medium', fontSize: 10 }}>
              @{list.creator_username}
            </Text>
          </View>
        )}
        {list.is_public && !isOwnList && (
          <Pressable
            onPress={toggleSave}
            hitSlop={8}
            className="absolute top-2 right-2 w-7 h-7 rounded-full items-center justify-center bg-paper-hi/90 border border-border"
          >
            <Bookmark size={13} color={saved ? '#8E6F5E' : '#9A9A9A'} fill={saved ? '#8E6F5E' : 'transparent'} />
          </Pressable>
        )}
      </View>
      <View className="flex-row items-center gap-1 mt-2">
        {!list.is_public && <Lock size={11} color="#9A9A9A" />}
        <Text numberOfLines={1} className="flex-1 text-text-warm" style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 14 }}>
          {list.title}
        </Text>
      </View>
      <Text className="text-text-tertiary mt-0.5" style={labelStyle}>
        {list.item_count} album{list.item_count !== 1 ? 's' : ''}
      </Text>
    </Pressable>
  );
}
