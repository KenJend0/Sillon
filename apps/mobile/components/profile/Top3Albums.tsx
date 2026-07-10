import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CoverImage } from '../album/CoverImage';
import { coverSrcWithFallback } from '../../lib/cover';
import type { FavoriteAlbum } from '../../lib/profile';

type Props = {
  albums: FavoriteAlbum[];
  /** Masque toute la section si vide — utilisé sur le profil public (le journal perso affiche "Aucun album favori"). */
  hideIfEmpty?: boolean;
};

/**
 * Miroir de Top3Albums (web) — affichage seul. L'édition/réordonnancement
 * (SortableAlbumItem, SearchAlbumModal côté web) reste Phase 7 Settings.
 */
export function Top3Albums({ albums, hideIfEmpty }: Props) {
  if (hideIfEmpty && albums.length === 0) return null;

  return (
    <View className="mt-6">
      {albums.length === 0 ? (
        <Text className="text-text-tertiary" style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}>
          Aucun album favori
        </Text>
      ) : (
        <View className="flex-row gap-2">
          {albums.map((album) => (
            <AlbumTile key={album.id} album={album} />
          ))}
        </View>
      )}
    </View>
  );
}

function AlbumTile({ album }: { album: FavoriteAlbum }) {
  const router = useRouter();
  const { src, fallback } = coverSrcWithFallback(album.mbid, album.cover_url);
  return (
    <Pressable onPress={() => router.push(`/albums/${album.id}`)} className="flex-1 aspect-square rounded-input overflow-hidden bg-background-tertiary">
      {src ? (
        <CoverImage
          src={src}
          fallback={fallback}
          style={{ width: '100%', height: '100%' }}
          placeholder={<PlaceholderNote />}
        />
      ) : (
        <PlaceholderNote />
      )}
    </Pressable>
  );
}

function PlaceholderNote() {
  return (
    <View className="w-full h-full items-center justify-center">
      <Text className="text-text-tertiary text-2xl">♪</Text>
    </View>
  );
}
