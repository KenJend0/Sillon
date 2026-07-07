import { View } from 'react-native';
import { CoverImage } from '../album/CoverImage';

/**
 * Miroir de CoverCollage (web, components/lists/ListCard.tsx) — grille 2x2 de covers,
 * ou une seule cover si moins de 4 disponibles. Pas de cover personnalisée côté mobile
 * (custom_cover_url) — voir note de scope Phase 7 dans docs/MOBILE_ROADMAP.md.
 */
export function ListCoverCollage({ urls, size }: { urls: (string | null)[]; size: number }) {
  const filled = [...urls, null, null, null, null].slice(0, 4);
  const hasCovers = filled.some((u) => u !== null);

  if (!hasCovers) {
    return <View className="rounded-input bg-background-secondary" style={{ width: size, height: size }} />;
  }

  if (filled.filter((u) => u !== null).length < 4) {
    const single = filled[0];
    return (
      <View className="rounded-input overflow-hidden bg-background-secondary" style={{ width: size, height: size }}>
        {single ? (
          <CoverImage src={single} style={{ width: '100%', height: '100%' }} placeholder={<View className="w-full h-full bg-background-tertiary" />} />
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
      {filled.map((url, i) => (
        <View key={i} style={{ width: '50%', height: '50%' }}>
          {url ? (
            <CoverImage src={url} style={{ width: '100%', height: '100%' }} placeholder={<View className="w-full h-full bg-background-tertiary" />} />
          ) : (
            <View className="w-full h-full bg-background-secondary" />
          )}
        </View>
      ))}
    </View>
  );
}
