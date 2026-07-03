import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavScrollHandler } from '../../../lib/useNavScrollHandler';
import { SearchTrigger } from '../../../components/layout/SearchOverlay';

export default function ExploreScreen() {
  const scrollHandler = useNavScrollHandler();
  const insets = useSafeAreaInsets();

  return (
    <Animated.ScrollView
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 100 }}
    >
      <SearchTrigger />

      <View className="items-center justify-center py-20">
        <Text style={{ fontFamily: 'InstrumentSerif_400Regular' }} className="text-3xl text-text-warm">
          Découvrir
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular' }} className="mt-2 text-text-secondary">
          Bientôt disponible
        </Text>
      </View>
    </Animated.ScrollView>
  );
}
