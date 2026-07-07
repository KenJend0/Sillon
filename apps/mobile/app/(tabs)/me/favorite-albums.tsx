import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { BackButton } from '../../../components/ui/BackButton';
import { CoverImage } from '../../../components/album/CoverImage';
import { FavoriteAlbumSearchSheet, type SelectedAlbum } from '../../../components/profile/FavoriteAlbumSearchSheet';
import { showToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../lib/AuthContext';
import { supabase } from '../../../lib/supabase';
import { getFavoriteAlbums } from '../../../lib/profile';
import { labelStyle, metaStyle } from '../../../lib/typography';

type Slot = SelectedAlbum & { position: number; empty: boolean };

function emptySlots(): Slot[] {
  return [1, 2, 3].map((position) => ({ id: `empty-${position}`, title: '', artist_name: '', cover_url: null, position, empty: true }));
}

const POSITION_LABEL: Record<number, string> = { 1: 'Premier', 2: 'Deuxième', 3: 'Troisième' };

/** Miroir de apps/web/app/settings/favorite-albums/page.tsx — "Mon Top 3". */
export default function FavoriteAlbumsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<Slot[]>(emptySlots());
  const [openPosition, setOpenPosition] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const favorites = await getFavoriteAlbums(user.id);
        const byPosition = new Map(favorites.map((f) => [f.position, f]));
        setSlots([1, 2, 3].map((position) => {
          const fav = byPosition.get(position);
          return fav
            ? { id: fav.id, title: fav.title, artist_name: fav.artist_name, cover_url: fav.cover_url, position, empty: false }
            : { id: `empty-${position}`, title: '', artist_name: '', cover_url: null, position, empty: true };
        }));
      } catch (err) {
        console.error('Error loading favorite albums:', err);
        setSlots(emptySlots());
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSelect = (album: SelectedAlbum) => {
    if (openPosition === null) return;
    setSlots((prev) => prev.map((s) => (s.position === openPosition ? { ...album, position: openPosition, empty: false } : s)));
    setOpenPosition(null);
  };

  const handleRemove = (position: number) => {
    setSlots((prev) => prev.map((s) => (s.position === position ? { id: `empty-${position}`, title: '', artist_name: '', cover_url: null, position, empty: true } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const albums = slots.filter((s) => !s.empty).map((s) => ({ album_id: s.id, position: s.position }));
      const { error } = await supabase.rpc('replace_favorite_albums', { p_albums: albums });
      if (error) throw error;
      router.back();
    } catch (err) {
      console.error('Error saving favorite albums:', err);
      showToast("Impossible d'enregistrer la sélection", 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#1C1C1C" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>
        <BackButton label="Profil" className="mt-3 mb-8" />

        <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 28 }} className="text-text-primary mb-1">
          Mon Top 3
        </Text>
        <Text className="text-text-secondary mb-8" style={metaStyle}>Tes trois albums essentiels.</Text>

        <View className="flex-row gap-3 mb-10">
          {slots.map((slot) => (
            <View key={slot.position} className="flex-1">
              <Text className="text-text-tertiary mb-2" style={labelStyle}>{POSITION_LABEL[slot.position]}</Text>

              {slot.empty ? (
                <Pressable
                  onPress={() => setOpenPosition(slot.position)}
                  className="aspect-square border border-dashed border-border rounded-input bg-background-secondary items-center justify-center"
                >
                  <Text className="text-text-tertiary" style={labelStyle}>Ajouter</Text>
                </Pressable>
              ) : (
                <View>
                  <Pressable onPress={() => setOpenPosition(slot.position)} className="aspect-square rounded-input overflow-hidden bg-background-secondary">
                    {slot.cover_url ? (
                      <CoverImage src={slot.cover_url} style={{ width: '100%', height: '100%' }} placeholder={<View className="w-full h-full bg-background-tertiary" />} />
                    ) : (
                      <View className="w-full h-full bg-background-tertiary" />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => handleRemove(slot.position)}
                    hitSlop={8}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-background/90 items-center justify-center"
                  >
                    <X size={11} color="#1C1C1C" />
                  </Pressable>
                </View>
              )}

              {slot.title ? (
                <View className="mt-2.5">
                  <Text numberOfLines={1} className="text-text-primary" style={[labelStyle, { fontFamily: 'Inter_500Medium', letterSpacing: 0 }]}>{slot.title}</Text>
                  <Text numberOfLines={1} className="text-text-secondary mt-0.5" style={labelStyle}>{slot.artist_name}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View className="border-t border-border-divider pt-8">
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className={`w-full py-3.5 rounded-button items-center ${saving ? 'bg-text-disabled' : 'bg-text-primary'}`}
          >
            <Text className="text-background" style={[metaStyle, { fontFamily: 'Inter_500Medium' }]}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.back()} className="w-full py-3.5 items-center">
            <Text className="text-text-secondary" style={[metaStyle, { fontFamily: 'Inter_500Medium' }]}>Annuler</Text>
          </Pressable>
        </View>
      </ScrollView>

      <FavoriteAlbumSearchSheet position={openPosition} onSelect={handleSelect} onClose={() => setOpenPosition(null)} />
    </View>
  );
}
