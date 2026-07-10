import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Disc3, Music, Search } from 'lucide-react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { CoverImage } from '../album/CoverImage';
import { showToast } from '../ui/Toast';
import { searchInternal, type SearchResultUI } from '../../lib/search';
import { searchMusicBrainzAlbums, searchMusicBrainzRecordings } from '../../lib/musicbrainz';
import { mergeAndRank } from '../../lib/searchRanking';
import { toggleListItem } from '../../lib/lists';
import { supabase } from '../../lib/supabase';
import { smStyle, labelStyle } from '../../lib/typography';

type Tab = 'album' | 'track';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  onAdded: () => void;
};

const RESULT_LIMIT = 8;

/**
 * Miroir mobile de AddItemsForm (ListPageContent, web) — recherche interne + MusicBrainz
 * (comme SearchOverlay/AlbumSearchForDiary), scindée en deux onglets Album/Titre. Un
 * résultat MusicBrainz pas encore en DB est d'abord importé (Edge Function
 * import-musicbrainz, même flux que useMusicBrainzAlbumImport) puis ajouté à la liste —
 * pas d'étape de preview intermédiaire, comme partout ailleurs côté mobile.
 */
export function AddListItemsBottomSheet({ isOpen, onClose, listId, onAdded }: Props) {
  const [tab, setTab] = useState<Tab>('album');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResultUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExtended, setLoadingExtended] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQ('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    setQ('');
    setResults([]);
  }, [tab]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      setLoadingExtended(false);
      return;
    }

    let aborted = false;
    const kind = tab === 'album' ? 'albums' : 'tracks';

    const run = async () => {
      await new Promise((r) => setTimeout(r, 300));
      if (aborted) return;

      setLoading(true);
      setResults([]);

      let internal: SearchResultUI[] = [];
      try {
        internal = await searchInternal(q, kind);
      } catch {
        // recherche interne échouée — le fallback MB prend le relais
      }
      if (aborted) return;
      setResults(mergeAndRank(internal, [], q, RESULT_LIMIT));
      setLoading(false);
      setLoadingExtended(true);

      try {
        const mbList: SearchResultUI[] = [];

        if (tab === 'album') {
          const mbRes = await searchMusicBrainzAlbums(q).catch(() => null);
          if (aborted) return;
          if (mbRes?.success && mbRes.results) {
            mbRes.results.forEach((album) =>
              mbList.push({
                id: album.id,
                releaseId: album.releaseId,
                title: album.title,
                subtitle: album.artistName,
                kind: 'album',
                coverUrl: album.coverUrl || null,
                releaseDate: album.releaseDate,
                source: 'musicbrainz',
                score: album.score,
                releaseCount: album.releaseCount,
              })
            );
          }
        } else {
          const mbRes = await searchMusicBrainzRecordings(q, 20).catch(() => null);
          if (aborted) return;
          if (mbRes?.success && mbRes.results) {
            mbRes.results.forEach((rec) =>
              mbList.push({
                id: rec.mbid,
                recordingMbid: rec.mbid,
                releaseId: rec.releaseId,
                title: rec.title,
                subtitle: `${rec.artistName} · ${rec.albumTitle}`,
                kind: 'track',
                coverUrl: rec.coverUrl || null,
                source: 'musicbrainz',
                score: rec.score,
              })
            );
          }
        }

        setResults(mergeAndRank(internal, mbList, q, RESULT_LIMIT));
      } finally {
        if (!aborted) setLoadingExtended(false);
      }
    };

    run();
    return () => {
      aborted = true;
    };
  }, [q, tab]);

  async function handleSelect(item: SearchResultUI) {
    if (busyId) return;
    setBusyId(item.id);
    try {
      let targetId = item.id;

      if (item.source === 'musicbrainz') {
        if (item.kind === 'album') {
          const { data, error } = await supabase.functions.invoke('import-musicbrainz', {
            body: { kind: 'album', mbid: item.releaseId || item.id },
          });
          if (error || !data?.success || !data.albumId) {
            showToast(data?.error || "Erreur lors de l'import", 'error');
            return;
          }
          targetId = data.albumId;
        } else {
          const { data, error } = await supabase.functions.invoke('import-musicbrainz', {
            body: {
              kind: 'track',
              recordingMbid: item.recordingMbid || item.id,
              releaseId: item.releaseId || '',
              trackTitle: item.title,
            },
          });
          if (error || !data?.success || !data.trackId) {
            showToast(data?.error || "Erreur lors de l'import du titre", 'error');
            return;
          }
          targetId = data.trackId;
        }
      }

      await toggleListItem(listId, item.kind === 'album' ? { albumId: targetId } : { trackId: targetId });
      showToast(`"${item.title}" ajouté à la liste`, 'success');
      setQ('');
      onAdded();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Impossible d'ajouter cet élément", 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Ajouter à la liste" snapPoint="70%">
      <View className="px-4 pt-2">
        <View className="flex-row gap-2 mb-3">
          {(['album', 'track'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-full ${tab === t ? 'bg-accent-deep' : 'bg-background-secondary'}`}
            >
              <Text className={tab === t ? 'text-paper-hi' : 'text-text-secondary'} style={{ fontFamily: 'Inter_500Medium', fontSize: 13 }}>
                {t === 'album' ? 'Album' : 'Titre'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row items-center gap-2 bg-background-secondary rounded-input px-3" style={{ height: 40 }}>
          <Search size={15} color="#8E6F5E" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={tab === 'album' ? 'Rechercher un album…' : 'Rechercher un titre…'}
            placeholderTextColor="#9A9A9A"
            style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}
            className="flex-1 text-text-primary"
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
        {!q.trim() ? null : loading ? (
          <Text className="text-text-tertiary px-3 py-5" style={smStyle}>Recherche…</Text>
        ) : results.length === 0 && !loadingExtended ? (
          <Text className="text-text-tertiary px-3 py-5" style={smStyle}>Aucun résultat pour « {q} »</Text>
        ) : (
          <>
            {results.map((item) => {
              const isBusy = busyId === item.id;
              const Icon = item.kind === 'album' ? Disc3 : Music;
              return (
                <Pressable
                  key={`${item.source}-${item.id}`}
                  onPress={() => !busyId && handleSelect(item)}
                  disabled={!!busyId}
                  className="flex-row items-center gap-3 px-2 py-2.5 rounded-button"
                  style={{ opacity: busyId && !isBusy ? 0.4 : 1 }}
                >
                  <View className="w-10 h-10 rounded-badge overflow-hidden bg-background-tertiary items-center justify-center">
                    {isBusy ? (
                      <ActivityIndicator size="small" color="#8E6F5E" />
                    ) : item.coverUrl ? (
                      <CoverImage src={item.coverUrl} style={{ width: 40, height: 40 }} placeholder={<Icon size={16} color="#BDBDBD" />} />
                    ) : (
                      <Icon size={16} color="#BDBDBD" />
                    )}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text numberOfLines={1} className="text-text-primary" style={{ fontFamily: 'Inter_500Medium', fontSize: 14 }}>
                      {isBusy ? 'Ajout en cours…' : item.title}
                    </Text>
                    {!isBusy && !!item.subtitle && (
                      <Text numberOfLines={1} className="text-text-tertiary mt-0.5" style={labelStyle}>
                        {item.subtitle}
                        {item.kind === 'album' && item.releaseDate ? ` · ${item.releaseDate.substring(0, 4)}` : ''}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
            {loadingExtended && (
              <Text className="text-text-disabled px-2 py-2" style={{ fontFamily: 'Inter_400Regular', fontSize: 11 }}>
                Recherche étendue…
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
