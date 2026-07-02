import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../lib/AuthContext';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
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
    </View>
  );
}
