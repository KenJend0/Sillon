import { Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { useNavScrollHandler } from '../../../lib/useNavScrollHandler';

export default function AddScreen() {
  const scrollHandler = useNavScrollHandler();

  return (
    <Animated.ScrollView
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 }}
    >
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular' }} className="text-3xl text-text-warm">
        Ajouter
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular' }} className="mt-2 text-text-secondary">
        Bientôt disponible
      </Text>
    </Animated.ScrollView>
  );
}
