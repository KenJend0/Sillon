import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { StatsEntry } from '../../../lib/profile-stats';
import { StatsCard, StatsEmptyState } from './StatsCard';

type Props = { entries: StatsEntry[] };

type Decade = { label: string; avg: number; count: number };

/** Miroir de ProfileStatsEvolution (web) — barres horizontales maison, note moyenne par décennie. */
export default function ProfileStatsEvolution({ entries }: Props) {
  const decades = useMemo<Decade[]>(() => {
    const byDecade: Record<string, number[]> = {};
    for (const e of entries) {
      if (e.rating == null || e.rating === 0) continue;
      const year = new Date(e.listened_at).getFullYear();
      const decade = `${Math.floor(year / 10) * 10}`;
      byDecade[decade] = [...(byDecade[decade] ?? []), e.rating];
    }
    return Object.entries(byDecade)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([decade, ratings]) => ({
        label: `${decade}s`,
        avg: ratings.reduce((s, r) => s + r, 0) / ratings.length,
        count: ratings.length,
      }));
  }, [entries]);

  const title = <>L'évolution de <Text style={{ fontStyle: 'italic', color: '#5C4538' }}>ton oreille</Text></>;

  if (decades.length < 2) {
    return (
      <StatsCard title={title} subtitle="">
        <StatsEmptyState>Reviens dans quelques mois pour voir ton évolution.</StatsEmptyState>
      </StatsCard>
    );
  }

  const maxAvg = Math.max(...decades.map((d) => d.avg));

  return (
    <StatsCard title={title} subtitle="Note moyenne par décennie">
      <View style={{ gap: 10 }}>
        {decades.map((d) => {
          const relWidthPct = (d.avg / maxAvg) * 100;
          return (
            <View key={d.label} className="flex-row items-center gap-3">
              <Text className="text-text-tertiary" style={{ fontFamily: 'Inter_500Medium', fontSize: 10, width: 48, textAlign: 'right' }}>
                {d.label}
              </Text>
              <View className="flex-1 h-2.5 bg-background-secondary rounded-pill overflow-hidden">
                <View style={{ width: `${relWidthPct}%`, opacity: 0.3 + (relWidthPct / 100) * 0.7 }} className="h-full bg-accent rounded-pill" />
              </View>
              <View className="flex-row items-baseline">
                <Text className="text-accent-deep" style={{ fontFamily: 'Inter_500Medium', fontSize: 11 }}>{d.avg.toFixed(1)}</Text>
                <Text className="text-text-disabled ml-1" style={{ fontFamily: 'Inter_400Regular', fontSize: 9 }}>/{d.count}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </StatsCard>
  );
}
