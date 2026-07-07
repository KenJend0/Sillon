import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../../components/ui/BackButton';
import ProfileStatsPage from '../../../components/profile/stats/ProfileStatsPage';
import { useAuth } from '../../../lib/AuthContext';
import { getUserStatsData, type StatsData } from '../../../lib/profile-stats';

/** Miroir de apps/web/app/me/stats/page.tsx. */
export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsData | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const stats = await getUserStatsData(user.id);
          if (!cancelled) setData(stats);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user])
  );

  return (
    <View className="flex-1 bg-paper-hi" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
        <BackButton label="Profil" className="mt-3 mb-6" />
        <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 28 }} className="text-text-warm mb-6">
          Mes <Text style={{ fontStyle: 'italic', color: '#5C4538' }}>stats</Text>
        </Text>

        {loading || !data ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color="#1C1C1C" />
          </View>
        ) : (
          <ProfileStatsPage data={data} />
        )}
      </ScrollView>
    </View>
  );
}
