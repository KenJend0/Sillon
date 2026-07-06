import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomSheet } from './BottomSheet';
import { Avatar } from '../avatars/Avatar';
import { getEntryLikes } from '../../lib/diary';
import { getTrackEntryLikes } from '../../lib/trackDiary';
import { metaMediumStyle, labelStyle } from '../../lib/typography';

type LikeUser = { id: string; username: string; avatar_url: string | null };

type Props = {
  entryId: string;
  isOpen: boolean;
  onClose: () => void;
  count: number;
  contentType?: 'diary_entry' | 'track_diary_entry';
};

/** Miroir de LikesBottomSheet (web) — liste des personnes ayant aimé une écoute. */
export function LikesBottomSheet({ entryId, isOpen, onClose, count, contentType = 'diary_entry' }: Props) {
  const router = useRouter();
  const [likes, setLikes] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    (contentType === 'track_diary_entry' ? getTrackEntryLikes(entryId) : getEntryLikes(entryId))
      .then(setLikes)
      .finally(() => setLoading(false));
  }, [isOpen, entryId, contentType]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`J'aime · ${count}`} snapPoint="45%">
      {loading ? (
        <View className="py-8 items-center">
          <ActivityIndicator color="#8E6F5E" />
        </View>
      ) : likes.length === 0 ? (
        <View className="py-8 items-center">
          <Text className="text-text-tertiary" style={labelStyle}>Aucun like pour le moment</Text>
        </View>
      ) : (
        <View className="px-6">
          {likes.map((user) => (
            <Pressable
              key={user.id}
              onPress={() => {
                onClose();
                router.push(`/u/${user.username}` as any);
              }}
              className="flex-row items-center gap-3 py-3 border-b border-border-divider"
            >
              <Avatar src={user.avatar_url} size={36} />
              <Text className="flex-1 text-text-primary" style={metaMediumStyle}>{user.username}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </BottomSheet>
  );
}
