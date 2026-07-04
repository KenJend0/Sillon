import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../avatars/Avatar';
import { h2Style } from '../../lib/typography';
import type { SimilarArtist } from '../../lib/artists';

type Props = { artists: SimilarArtist[] };

/**
 * Miroir de la section "Artistes similaires" de ArtistPageContent (web) — seuls les
 * artistes déjà en DB (id non-null) sont affichés/cliquables, comme sur le web (pas
 * d'import d'artiste depuis cette section, ni côté web ni côté mobile).
 */
export function ArtistSimilarSection({ artists }: Props) {
  const router = useRouter();
  const inDb = artists.filter((a) => a.id !== null);
  if (inDb.length === 0) return null;

  return (
    <View className="border-t border-border-divider pt-10 mt-12 mb-8">
      <Text className="text-text-primary mb-6" style={h2Style}>Artistes similaires</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {inDb.map((a) => (
          <Pressable key={a.id} onPress={() => router.push(`/artists/${a.id}` as any)} style={{ width: 80 }}>
            <View className="items-center gap-2">
              <Avatar src={a.imageUrl} size={56} />
              <Text numberOfLines={2} className="text-text-warm text-center" style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 14, lineHeight: 17 }}>
                {a.name}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
