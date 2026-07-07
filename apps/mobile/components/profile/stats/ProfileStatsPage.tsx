import { Text, View } from 'react-native';
import type { StatsData } from '../../../lib/profile-stats';
import ProfileStatsEmpreinte from './ProfileStatsEmpreinte';
import ProfileStatsTrajectoire from './ProfileStatsTrajectoire';
import ProfileStatsAnchors from './ProfileStatsAnchors';
import ProfileStatsAnglesMorts from './ProfileStatsAnglesMorts';
import ProfileStatsEvolution from './ProfileStatsEvolution';

type Props = { data: StatsData };

/** Miroir de ProfileStatsPage (web) — orchestre les 5 cartes. */
export default function ProfileStatsPage({ data }: Props) {
  const { entries, genreData, anglesMorts } = data;

  if (entries.length < 10) {
    return (
      <View className="py-16 items-center">
        <Text className="text-3xl mb-3">🎧</Text>
        <Text className="text-text-secondary text-center" style={{ fontFamily: 'Inter_400Regular', fontSize: 14, maxWidth: 260 }}>
          Reviens quand tu auras un peu plus d'écoutes dans ton journal.
        </Text>
        <Text className="text-text-tertiary mt-2" style={{ fontFamily: 'Inter_500Medium', fontSize: 12 }}>
          {entries.length}/10 entrées
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <ProfileStatsEmpreinte genreData={genreData} />
      <ProfileStatsTrajectoire entries={entries} />
      <ProfileStatsAnchors entries={entries} />
      <ProfileStatsAnglesMorts anglesMorts={anglesMorts} />
      <ProfileStatsEvolution entries={entries} />
    </View>
  );
}
