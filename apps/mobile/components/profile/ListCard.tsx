import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { CoverImage } from '../album/CoverImage';
import type { ProfileListUI } from '../../lib/lists';
import { showToast } from '../ui/Toast';
import { labelStyle } from '../../lib/typography';

type Props = { list: ProfileListUI };

/**
 * Miroir simplifié de ListCard (web) — affichage seul (grille de couvertures + titre).
 * La page /lists/[id] n'existe pas encore côté mobile (Phase 7) : le tap montre un toast
 * "Bientôt disponible" au lieu de naviguer, comme pour les autres routes manquantes.
 */
export function ListCard({ list }: Props) {
  const router = useRouter();
  const covers = list.cover_urls.slice(0, 4);

  return (
    <Pressable onPress={() => showToast('Bientôt disponible', 'info')} style={{ width: '48%' }}>
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
