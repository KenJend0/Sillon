import { ScrollView, Text, View } from 'react-native';
import { AlbumCard } from './AlbumCard';
import { coverSrcWithFallback } from '../../lib/cover';
import { h2Style } from '../../lib/typography';

type DbAlbum = {
  id: string;
  title: string;
  cover_url: string | null;
  mbid: string | null;
  release_date: string | null;
};

type Props = {
  albums: DbAlbum[];
  primaryArtistName?: string;
};

/**
 * Miroir de ArtistAlbumsSection (web) — limité aux albums déjà en DB. Le complément
 * MusicBrainz + import au tap n'est pas porté ici : importAlbumFromMusicBrainz utilise
 * le client admin (service_role, upload de cover, écriture album_featured_artists) côté
 * web, jamais exposable au client mobile sans Edge Function dédiée (absente, hors scope
 * Phase 8 actuel — même dégradation que l'enrichissement).
 */
export function ArtistAlbumsSection({ albums, primaryArtistName }: Props) {
  if (albums.length === 0) return null;

  return (
    <View className="border-t border-border-divider pt-8 mb-12">
      <Text className="text-text-primary mb-5" style={h2Style}>
        {primaryArtistName ? `Plus de ${primaryArtistName}` : 'Du même artiste'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
        {albums.map((a) => {
          const { src, fallback } = coverSrcWithFallback(a.mbid, a.cover_url);
          return (
            <AlbumCard
              key={a.id}
              album={{ id: a.id, title: a.title, coverSrc: src, coverFallback: fallback }}
              year={a.release_date ? new Date(a.release_date).getFullYear() : undefined}
              width={140}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
