import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../avatars/Avatar';
import { useMusicBrainzArtistImport } from '../../lib/useMusicBrainzImport';
import { h2Style } from '../../lib/typography';
import type { SimilarArtist } from '../../lib/artists';

type Props = { artists: SimilarArtist[] };

/**
 * Miroir de la section "Artistes similaires" de ArtistPageContent (web), en divergeant
 * volontairement sur un point : le web n'affiche jamais un artiste similaire hors DB
 * (ArtistPageContent.tsx filtre `id !== null` avant rendu, pas d'import possible depuis
 * cette section). Le mobile choisit de les rendre cliquables quand un mbid est disponible
 * (via l'Edge Function import-musicbrainz, lib/useMusicBrainzImport) — get-or-create léger,
 * puis navigation directe vers la page créée.
 */
export function ArtistSimilarSection({ artists }: Props) {
  const router = useRouter();
  const { importingMbid, importArtist } = useMusicBrainzArtistImport();

  // Un artiste similaire sans mbid (Last.fm ne l'a pas fourni) n'a aucun moyen d'être
  // importé — on le masque plutôt que d'afficher une carte non cliquable.
  const visible = artists.filter((a) => a.id !== null || a.mbid !== null);
  if (visible.length === 0) return null;

  return (
    <View className="border-t border-border-divider pt-10 mt-12 mb-8">
      <Text className="text-text-primary mb-6" style={h2Style}>Artistes similaires</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {visible.map((a) => {
          const importing = !a.id && !!a.mbid && importingMbid === a.mbid;
          return (
            <Pressable
              key={a.id ?? a.mbid}
              onPress={() => {
                if (importing) return;
                if (a.id) router.push(`/artists/${a.id}` as any);
                else if (a.mbid) importArtist(a.mbid, a.name);
              }}
              style={{ width: 80, opacity: importing ? 0.6 : 1 }}
            >
              <View className="items-center gap-2">
                <View>
                  <Avatar src={a.imageUrl} size={56} />
                  {importing && (
                    <View className="absolute inset-0 items-center justify-center rounded-full bg-black/20">
                      <ActivityIndicator size="small" color="#F5F3EF" />
                    </View>
                  )}
                </View>
                <Text numberOfLines={2} className="text-text-warm text-center" style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 14, lineHeight: 17 }}>
                  {a.name}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
