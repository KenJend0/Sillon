import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../components/ui/BackButton';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ListCard } from '../../components/profile/ListCard';
import { getPublicLists, type ProfileListUI } from '../../lib/lists';
import { h2Style, smStyle, metaMediumStyle } from '../../lib/typography';

/**
 * Miroir mobile de /lists (web) — grille de toutes les listes publiques.
 * Cible du "voir tout" de CommunityListsSection (explore), qui affichait jusqu'ici
 * un toast "Bientôt disponible" faute d'écran équivalent.
 */
export default function PublicListsScreen() {
  const insets = useSafeAreaInsets();
  const [lists, setLists] = useState<ProfileListUI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicLists(30)
      .then(setLists)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
        <View style={{ paddingTop: 16 }}>
          <BackButton label="Explorer" />
        </View>

        <View className="mt-4 mb-6">
          <Text style={h2Style} className="text-text-primary">
            Listes <Text style={{ fontFamily: 'InstrumentSerif_400Regular_Italic' }} className="text-accent-deep">populaires</Text>
          </Text>
          <Text style={smStyle} className="text-text-secondary mt-1">
            Sélections musicales partagées par la communauté.
          </Text>
        </View>

        {lists.length === 0 ? (
          <View className="py-8 items-center">
            <Text className="text-text-secondary" style={metaMediumStyle}>
              Rien pour le moment.
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between" style={{ rowGap: 20 }}>
            {lists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
