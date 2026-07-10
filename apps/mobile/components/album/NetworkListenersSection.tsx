import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../avatars/Avatar';
import { BottomSheet } from '../ui/BottomSheet';
import { labelStyle, metaMediumStyle } from '../../lib/typography';

type NetworkListener = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  rating: number | null;
  entryId: string | null;
  hasReview: boolean;
};

type Props = {
  listeners: NetworkListener[];
  /** "cet album" (défaut) ou "ce titre" — miroir de NetworkListenersSection/TrackNetworkListeners (web). */
  itemLabel?: string;
  /** "/diary/" (défaut) ou "/track-diary/" — préfixe de route pour l'entrée d'écoute. */
  entryPrefix?: string;
};

/** Miroir de NetworkListenersSection + NetworkListenersBottomSheet (web) — partagé albums/titres. */
export function NetworkListenersSection({ listeners, itemLabel = 'cet album', entryPrefix = '/diary/' }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  if (listeners.length === 0) return null;

  const shown = listeners.slice(0, 3);
  const rest = listeners.length - shown.length;
  const tokens = shown.map((l) => l.username);
  let label: string;
  if (tokens.length === 1) {
    label = `${tokens[0]} a écouté ${itemLabel}`;
  } else if (rest === 0) {
    label = `${tokens.slice(0, -1).join(', ')} et ${tokens[tokens.length - 1]} ont écouté ${itemLabel}`;
  } else {
    label = `${tokens.join(', ')} et ${rest} autre${rest > 1 ? 's' : ''} ont écouté ${itemLabel}`;
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="flex-row items-start gap-2 mb-5">
        <View className="flex-row" style={{ marginRight: 4 }}>
          {shown.map((l, i) => (
            <View key={l.userId} style={{ marginLeft: i > 0 ? -6 : 0 }} className="border border-background rounded-full">
              <Avatar src={l.avatarUrl} size={20} />
            </View>
          ))}
        </View>
        <Text className="flex-1 text-text-tertiary" style={[labelStyle, { lineHeight: 16.8 }]}>{label}</Text>
      </Pressable>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={`Ont écouté ${itemLabel}`} snapPoint="50%">
        <View className="px-6 py-2">
          {listeners.map((l) => (
            <Pressable
              key={l.userId}
              onPress={() => {
                setOpen(false);
                router.push((l.entryId ? `${entryPrefix}${l.entryId}` : `/u/${l.username}`) as any);
              }}
              className="flex-row items-center gap-3 py-3 border-b border-border-divider"
            >
              <Avatar src={l.avatarUrl} size={32} />
              <Text className="flex-1 text-text-primary" style={metaMediumStyle}>{l.username}</Text>
              <View className="flex-row items-center gap-2">
                {l.rating ? (
                  <Text style={metaMediumStyle} className="text-text-primary">
                    {l.rating}<Text className="text-text-tertiary" style={labelStyle}>/10</Text>
                  </Text>
                ) : (
                  <Text className="text-text-tertiary" style={labelStyle}>—</Text>
                )}
                {l.hasReview && (
                  <View className="border border-border-divider rounded px-1 py-0.5">
                    <Text className="text-[10px] text-text-tertiary" style={{ fontFamily: 'Inter_400Regular' }}>critique</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}
