import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CoverImage } from '../../album/CoverImage';
import type { AnglesMortsAlbum } from '../../../lib/profile-stats';
import { StatsCard, StatsEmptyState } from './StatsCard';

type Props = { anglesMorts: AnglesMortsAlbum[] };

function DefaultCover() {
  return (
    <View className="w-full h-full bg-background-secondary items-center justify-center">
      <Text className="text-text-disabled text-xl">♪</Text>
    </View>
  );
}

/** Miroir de ProfileStatsAnglesMorts (web) — albums acclamés jamais écoutés, carrousel horizontal. */
export default function ProfileStatsAnglesMorts({ anglesMorts }: Props) {
  const router = useRouter();
  const ranked = useMemo(() => [...anglesMorts].sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 5), [anglesMorts]);

  return (
    <StatsCard
      title={<>Tes <Text style={{ fontStyle: 'italic', color: '#5C4538' }}>angles morts</Text></>}
      subtitle="Albums acclamés que tu n'as pas encore écoutés"
    >
      {ranked.length === 0 ? (
        <StatsEmptyState>Pas assez d'albums dans la base pour l'instant.</StatsEmptyState>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {ranked.map((album) => {
            const coverSrc = album.mbid ? `https://coverartarchive.org/release-group/${album.mbid}/front` : album.cover_url ?? '';
            return (
              <Pressable key={album.id} onPress={() => router.push(`/albums/${album.id}`)} style={{ width: 100 }}>
                <View className="aspect-square rounded-cover-sm overflow-hidden bg-background-secondary mb-2">
                  {coverSrc ? (
                    <CoverImage src={coverSrc} fallback={album.cover_url ?? undefined} style={{ width: '100%', height: '100%' }} placeholder={<DefaultCover />} />
                  ) : (
                    <DefaultCover />
                  )}
                </View>
                <Text numberOfLines={2} className="text-text-primary" style={{ fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 14 }}>
                  {album.title}
                </Text>
                <Text numberOfLines={1} className="text-text-tertiary mt-0.5" style={{ fontFamily: 'Inter_400Regular', fontSize: 10 }}>
                  {album.artist_name}
                </Text>
                <Text className="text-accent-deep mt-0.5" style={{ fontFamily: 'Inter_500Medium', fontSize: 10 }}>
                  {album.avg_rating.toFixed(1)}/10
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </StatsCard>
  );
}
