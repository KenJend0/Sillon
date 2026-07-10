import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AlbumCard } from './AlbumCard';
import { coverSrcWithFallback } from '../../lib/cover';
import { canonicalAlbumKey } from '../../lib/albumCanonical';
import { useMusicBrainzAlbumImport } from '../../lib/useMusicBrainzImport';
import { h2Style } from '../../lib/typography';
import type { ArtistRelease } from '../../lib/musicbrainz';

type DbAlbum = {
  id: string;
  title: string;
  cover_url: string | null;
  mbid: string | null;
  release_date: string | null;
};

type Item = {
  key: string;
  id: string; // '' pour les releases MB pas encore en DB
  title: string;
  coverSrc: string | null;
  coverFallback?: string;
  year: number | null;
  mbidForImport?: string;
};

type Props = {
  albums: DbAlbum[];
  mbReleases: ArtistRelease[];
  artistName: string;
  primaryArtistName?: string;
};

/**
 * Miroir de ArtistAlbumsSection (web) : albums déjà en DB + releases MusicBrainz
 * complémentaires pas encore importées (comme ArtistDiscographySection sur la page
 * artiste). Le tap sur une release MB déclenche l'import via l'Edge Function
 * import-musicbrainz (lib/useMusicBrainzImport) puis navigue directement vers la page créée.
 */
export function ArtistAlbumsSection({ albums, mbReleases, artistName, primaryArtistName }: Props) {
  const { importingMbid, importAlbum } = useMusicBrainzAlbumImport();

  const items = useMemo(() => {
    const existingRgMbids = new Set(albums.filter((a) => a.mbid).map((a) => a.mbid as string));
    const existingCanonicalKeys = new Set(albums.map((a) => canonicalAlbumKey(a.title, artistName)));

    const dbItems: Item[] = albums.map((a) => {
      const { src, fallback } = coverSrcWithFallback(a.mbid, a.cover_url);
      return {
        key: `db-${a.id}`,
        id: a.id,
        title: a.title,
        coverSrc: src,
        coverFallback: fallback,
        year: a.release_date ? new Date(a.release_date).getFullYear() : null,
      };
    });

    const missingItems: Item[] = mbReleases
      .filter((r) => !existingRgMbids.has(r.releaseGroupMbid) && !existingCanonicalKeys.has(canonicalAlbumKey(r.title, artistName)))
      .map((r) => ({
        key: `mb-${r.mbid}`,
        id: '',
        title: r.title,
        // Namespace release-group de CoverArt Archive — miroir du pattern déjà utilisé
        // dans ArtistDiscographySection / searchMusicBrainzAlbums.
        coverSrc: `https://coverartarchive.org/release-group/${r.releaseGroupMbid}/front`,
        year: r.date ? new Date(r.date).getFullYear() : null,
        mbidForImport: r.releaseGroupMbid,
      }));

    return [...dbItems, ...missingItems];
  }, [albums, mbReleases, artistName]);

  if (items.length === 0) return null;

  return (
    <View className="border-t border-border-divider pt-8 mb-12">
      <Text className="text-text-primary mb-5" style={h2Style}>
        {primaryArtistName ? `Plus de ${primaryArtistName}` : 'Du même artiste'}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
        {items.map((item) => (
          <AlbumCard
            key={item.key}
            album={{ id: item.id, title: item.title, coverSrc: item.coverSrc, coverFallback: item.coverFallback }}
            year={item.year}
            width={140}
            importing={!!item.mbidForImport && importingMbid === item.mbidForImport}
            onPress={item.mbidForImport ? () => importAlbum(item.mbidForImport!) : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}
