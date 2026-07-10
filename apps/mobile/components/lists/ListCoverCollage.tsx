import { View } from 'react-native';
import { CoverImage } from '../album/CoverImage';
import { coverSrcWithFallback } from '../../lib/cover';
import type { ListCoverRef } from '../../lib/lists';

/**
 * Miroir de CoverCollage (web, components/lists/ListCard.tsx) — grille 2x2 de covers,
 * ou une seule cover si moins de 4 disponibles. Pas de cover personnalisée côté mobile
 * (custom_cover_url) — voir note de scope Phase 7 dans docs/MOBILE_ROADMAP.md.
 */
export function ListCoverCollage({ urls, size }: { urls: ListCoverRef[]; size: number }) {
  const empty: ListCoverRef = { url: null, mbid: null };
  const filled = [...urls, empty, empty, empty, empty].slice(0, 4);
  const hasCovers = filled.some((c) => c.url !== null);

  if (!hasCovers) {
    return <View className="rounded-input bg-background-secondary" style={{ width: size, height: size }} />;
  }

  if (filled.filter((c) => c.url !== null).length < 4) {
    const { src, fallback } = coverSrcWithFallback(filled[0].mbid, filled[0].url);
    return (
      <View className="rounded-input overflow-hidden bg-background-secondary" style={{ width: size, height: size }}>
        {src ? (
          <CoverImage src={src} fallback={fallback} style={{ width: '100%', height: '100%' }} placeholder={<View className="w-full h-full bg-background-tertiary" />} />
        ) : (
          <View className="w-full h-full bg-background-secondary" />
        )}
      </View>
    );
  }

  return (
    <View
      className="rounded-input overflow-hidden flex-row flex-wrap bg-border-divider"
      style={{ width: size, height: size }}
    >
      {filled.map((cover, i) => {
        const { src, fallback } = coverSrcWithFallback(cover.mbid, cover.url);
        return (
          <View key={i} style={{ width: '50%', height: '50%' }}>
            {src ? (
              <CoverImage src={src} fallback={fallback} style={{ width: '100%', height: '100%' }} placeholder={<View className="w-full h-full bg-background-tertiary" />} />
            ) : (
              <View className="w-full h-full bg-background-secondary" />
            )}
          </View>
        );
      })}
    </View>
  );
}
