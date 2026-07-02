import { Pressable, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAuth } from '../../../lib/AuthContext';
import { useNavScrollHandler } from '../../../lib/useNavScrollHandler';

export default function MeScreen() {
  const { user, signOut } = useAuth();
  const scrollHandler = useNavScrollHandler();

  return (
    <Animated.ScrollView
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 }}
    >
      <Text
        style={{ fontFamily: 'InstrumentSerif_400Regular' }}
        className="text-4xl text-text-warm"
      >
        Waveform
      </Text>
      <Text style={{ fontFamily: 'Inter_400Regular' }} className="mt-2 text-text-secondary">
        Connecté en tant que {user?.email}
      </Text>

      <Pressable
        onPress={signOut}
        className="mt-8 bg-text-warm rounded-button py-3 px-6 items-center"
      >
        <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-paper-hi">
          Se déconnecter
        </Text>
      </Pressable>
    </Animated.ScrollView>
  );
}
