import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CoverImage } from '../album/CoverImage';
import { h2Style, labelStyle } from '../../lib/typography';

export type Apparition = {
  id: string;
  title: string;
  coverUrl: string | null;
  subtitle: string;
  year: number | null;
};

type Props = { apparitions: Apparition[] };

/**
 * Miroir de la section "Apparaît sur" de ArtistPageContent (web) — albums où
 * l'artiste est crédité en featuring (album OU piste), pas en principal.
 */
export function ArtistAppearsOnSection({ apparitions }: Props) {
  const router = useRouter();
  if (apparitions.length === 0) return null;

  return (
    <View className="border-t border-border-divider pt-10 mt-12 mb-8">
      <Text className="text-text-primary mb-6" style={h2Style}>Apparaît sur</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {apparitions.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/albums/${item.id}` as any)} style={{ width: 128 }}>
            <View className="aspect-square rounded-cover overflow-hidden bg-background-secondary">
              {item.coverUrl ? (
                <CoverImage
                  src={item.coverUrl}
                  style={{ width: '100%', height: '100%' }}
                  placeholder={<View className="w-full h-full bg-background-tertiary" />}
                />
              ) : (
                <View className="w-full h-full bg-background-tertiary" />
              )}
            </View>
            <View className="mt-2">
              <Text numberOfLines={2} className="text-text-warm" style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 14, lineHeight: 17 }}>
                {item.title}
              </Text>
              <Text numberOfLines={1} className="text-text-tertiary mt-0.5" style={labelStyle}>
                {item.subtitle}{item.year ? ` · ${item.year}` : ''}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
