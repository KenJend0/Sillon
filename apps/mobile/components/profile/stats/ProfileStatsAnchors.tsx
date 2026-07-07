import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { StatsEntry } from '../../../lib/profile-stats';
import { StatsCard, StatsEmptyState } from './StatsCard';

type Props = { entries: StatsEntry[] };

type ArtistStat = { id: string; name: string; count: number; firstListen: Date };

/** Miroir de ProfileStatsAnchors (web) — artistes fidèles ("ancres") vs découvertes récentes ("éclairs"). */
export default function ProfileStatsAnchors({ entries }: Props) {
  const { anchors, eclairs, fideliteScore, totalArtists } = useMemo(() => {
    const artistMap = new Map<string, ArtistStat>();
    for (const e of entries) {
      if (!e.artist_id) continue;
      const existing = artistMap.get(e.artist_id);
      const date = new Date(e.listened_at);
      if (existing) {
        existing.count++;
        if (date < existing.firstListen) existing.firstListen = date;
      } else {
        artistMap.set(e.artist_id, { id: e.artist_id, name: e.artist_name, count: 1, firstListen: date });
      }
    }

    const all = [...artistMap.values()];
    const total = all.length;

    const anc = all.filter((a) => a.count >= 3).sort((a, b) => b.count - a.count).slice(0, 8);

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const ecl = all
      .filter((a) => a.count <= 2 && a.firstListen >= ninetyDaysAgo)
      .sort((a, b) => b.firstListen.getTime() - a.firstListen.getTime())
      .slice(0, 8);

    const score = total > 0 ? Math.round((anc.length / total) * 100) : 0;
    return { anchors: anc, eclairs: ecl, fideliteScore: score, totalArtists: total };
  }, [entries]);

  const title = <>Tes <Text style={{ fontStyle: 'italic', color: '#5C4538' }}>ancres</Text> & éclairs</>;

  if (totalArtists < 3) {
    return (
      <StatsCard title={title} subtitle="">
        <StatsEmptyState>Pas encore assez d'artistes dans ton journal.</StatsEmptyState>
      </StatsCard>
    );
  }

  const fideliteLabel = fideliteScore >= 60 ? 'plutôt loyal' : fideliteScore >= 30 ? 'entre les deux' : 'plutôt explorateur';

  return (
    <StatsCard
      title={title}
      subtitle=""
    >
      <Text className="text-text-tertiary mb-5" style={{ fontFamily: 'Inter_500Medium', fontSize: 12, letterSpacing: 0.72 }}>
        Fidélité vs découverte — tu es <Text className="text-accent-deep">{fideliteLabel}</Text>
      </Text>

      <View className="flex-row" style={{ gap: 16 }}>
        <View className="flex-1">
          <Text className="text-text-tertiary uppercase mb-2.5" style={{ fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1 }}>
            Ancres
          </Text>
          {anchors.length === 0 ? (
            <Text className="text-text-tertiary" style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}>Pas encore d'ancres.</Text>
          ) : (
            <View style={{ gap: 6 }}>
              {anchors.map((a) => (
                <View key={a.id} className="flex-row items-center justify-between gap-2 bg-background rounded-badge-sm px-2.5 py-1.5 border border-border">
                  <Text numberOfLines={1} className="text-text-primary flex-1" style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}>{a.name}</Text>
                  <Text className="text-text-tertiary" style={{ fontFamily: 'Inter_500Medium', fontSize: 11 }}>{a.count}×</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="flex-1">
          <Text className="text-text-tertiary uppercase mb-2.5" style={{ fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1 }}>
            Éclairs récents
          </Text>
          {eclairs.length === 0 ? (
            <Text className="text-text-tertiary" style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}>Aucune nouvelle découverte ce trimestre.</Text>
          ) : (
            <View style={{ gap: 6 }}>
              {eclairs.map((a) => (
                <View key={a.id} className="flex-row items-center gap-2 bg-background rounded-badge-sm px-2.5 py-1.5 border border-border">
                  <View className="w-1.5 h-1.5 rounded-full bg-accent-deep" />
                  <Text numberOfLines={1} className="text-text-primary flex-1" style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}>{a.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </StatsCard>
  );
}
