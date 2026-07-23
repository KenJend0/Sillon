import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ListCard } from '../profile/ListCard';
import { type ProfileListUI } from '../../lib/lists';
import { h2Style } from '../../lib/typography';

/**
 * Section bonus "Listes populaires" — présente sur le web (CommunityListsSection,
 * inline dans app/explore/page.tsx) mais absente du checklist Phase 7 d'origine.
 * "voir tout" mène à /lists (app/lists/index.tsx, miroir de la page web).
 */
export function CommunityListsSection({ lists }: { lists: ProfileListUI[] }) {
  const router = useRouter();

  if (lists.length === 0) return null;

  return (
    <View>
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1 pr-3">
          <Text style={h2Style} className="text-text-primary">
            Listes <Text style={{ fontFamily: 'InstrumentSerif_400Regular_Italic' }} className="text-accent-deep">populaires</Text>
          </Text>
        </View>
        <Pressable onPress={() => router.push('/lists')} className="border-b border-accent pb-0.5">
          <Text className="text-accent" style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 14 }}>
            voir tout
          </Text>
        </Pressable>
      </View>
      <View className="flex-row flex-wrap justify-between" style={{ rowGap: 20 }}>
        {lists.map((list) => (
          <ListCard key={list.id} list={list} />
        ))}
      </View>
    </View>
  );
}
