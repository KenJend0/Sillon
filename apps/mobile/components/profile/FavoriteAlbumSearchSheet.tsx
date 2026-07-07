import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { CoverImage } from '../album/CoverImage';
import { searchInternal, type SearchResultUI } from '../../lib/search';
import { metaStyle, labelStyle } from '../../lib/typography';

export type SelectedAlbum = {
  id: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
};

type Props = {
  position: number | null;
  onSelect: (album: SelectedAlbum) => void;
  onClose: () => void;
};

/** Miroir de SearchAlbumModal (web) — recherche interne uniquement (types=album), pas MusicBrainz. */
export function FavoriteAlbumSearchSheet({ position, onSelect, onClose }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResultUI[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const items = await searchInternal(q, 'albums');
        setResults(items);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <BottomSheet isOpen={position !== null} onClose={onClose} title={`Album #${position ?? ''}`} snapPoint="80%">
      <View className="px-6 py-4">
        <TextInput
          placeholder="Titre ou artiste..."
          value={q}
          onChangeText={setQ}
          autoFocus
          className="w-full px-3 py-2.5 bg-background-secondary border border-border rounded-input text-text-primary"
          placeholderTextColor="#9A9A9A"
          style={metaStyle}
        />
      </View>

      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        {loading && (
          <View className="py-8 items-center">
            <ActivityIndicator color="#8E6F5E" />
          </View>
        )}
        {!loading && results.length === 0 && q && (
          <Text className="text-text-tertiary" style={metaStyle}>Aucun album trouvé</Text>
        )}
        {!loading && results.length === 0 && !q && (
          <Text className="text-text-tertiary" style={metaStyle}>Tapez un titre ou un artiste</Text>
        )}
        {results.map((album) => (
          <Pressable
            key={album.id}
            onPress={() =>
              onSelect({
                id: album.id,
                title: album.title,
                artist_name: album.subtitle || 'Artiste inconnu',
                cover_url: album.coverUrl ?? null,
              })
            }
            className="flex-row items-center gap-4 py-3"
          >
            <View className="w-12 h-12 rounded-button overflow-hidden bg-background-tertiary">
              {album.coverUrl && (
                <CoverImage src={album.coverUrl} style={{ width: '100%', height: '100%' }} placeholder={<View className="w-full h-full bg-background-tertiary" />} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text numberOfLines={1} className="text-text-primary" style={[metaStyle, { fontFamily: 'Inter_500Medium' }]}>{album.title}</Text>
              <Text numberOfLines={1} className="text-text-secondary" style={labelStyle}>{album.subtitle}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
