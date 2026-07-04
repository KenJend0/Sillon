import '../global.css';

import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@expo/ui/community/bottom-sheet';
import { AuthProvider } from '../lib/AuthContext';
import { ToastHost } from '../components/ui/Toast';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#1C1C1C" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <AuthProvider>
            {/* Stack (pas Slot) — nécessaire pour que /albums/[id] (et les futures pages
                /artists, /tracks, /u) s'ouvrent en plein écran par-dessus la bottom nav
                de (tabs), qui gère elle-même son propre TopTabs + Stack imbriqué. */}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="albums/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="tracks/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="artists/[id]" options={{ animation: 'slide_from_right' }} />
            </Stack>
            <ToastHost />
          </AuthProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
